import { useCallback, useMemo, useRef, useState } from 'react';
import type { CampusEdge, CampusNode, LatLng } from '@/types/campus';
import {
  DEFAULT_OPTIONS,
  otherProfile,
  type RouteOptions,
} from '@/routing/cost';
import { findRoute, sameRoute } from '@/routing/route';
import { nearestNode } from '@/routing/graph';
import { useCampusDoc } from '@/hooks/useCampusDoc';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useWalkSimulator } from '@/hooks/useWalkSimulator';
import { trackProgress } from '@/routing/progress';
import { useInstall } from '@/hooks/useInstall';
import CampusMap from '@/components/Map';
import RoutePanel from '@/components/RoutePanel';
import EditorPanel from '@/components/EditorPanel';
import * as s from './App.css';

/** 편집 모드는 주소에 남겨 둔다 — 새로고침해도 하던 일이 이어진다. */
const readEditFlag = () =>
  new URLSearchParams(window.location.search).get('edit') === '1';

/**
 * 위치 시뮬레이터는 `?sim=1` 일 때만 나온다.
 * 걷지 않고도 실시간 위치가 경로를 따라 도는지 확인하려고 두는 것이라,
 * 평소 화면에는 얼씬거리지 않게 한다.
 */
const readSimFlag = () =>
  new URLSearchParams(window.location.search).get('sim') === '1';

const App = () => {
  const campus = useCampusDoc();
  const { graph } = campus;

  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [options, setOptions] = useState<RouteOptions>(DEFAULT_OPTIONS);

  const install = useInstall();
  const [simulating] = useState(readSimFlag);

  /* 지도가 패널에 가린 만큼을 피해 캠퍼스를 맞출 수 있게 패널을 가리켜 둔다. */
  const panelRef = useRef<HTMLElement>(null);

  const [editing, setEditing] = useState(readEditFlag);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [linkFromId, setLinkFromId] = useState<string | null>(null);

  /*
   * 현위치가 처음 잡히면 가장 가까운 곳을 출발지로 세운다. 그 뒤로는 안 건드린다.
   *
   * 건물만 골라 붙이면 안 된다. 길 위에 서 있을 때 가장 가까운 건물은 중앙값
   * 44m 나 떨어져 있어서, 열에 일곱은 시작하자마자 '경로에서 벗어남' 으로 잡힌다.
   * 길목까지 포함하면 중앙값 14m 다.
   */
  const geo = useGeolocation({
    onFirstFix: (at) => {
      const near = nearestNode(graph, at);
      if (near) setFromId(near.node.id);
    },
  });

  /* ── 경로 ────────────────────────────────────────────────────────────── */

  const route = useMemo(
    () => (fromId && toId ? findRoute(graph, fromId, toId, options) : null),
    [graph, fromId, toId, options],
  );

  /** 다른 기준으로 잡으면 길이 달라지는지. 같으면 비교를 안 보여 준다. */
  const compare = useMemo(() => {
    if (!fromId || !toId) return null;
    const other: RouteOptions = {
      ...options,
      profile: otherProfile(options.profile),
    };
    const alt = findRoute(graph, fromId, toId, other);
    return sameRoute(route, alt) ? null : alt;
  }, [graph, fromId, toId, options, route]);

  /** 큰길로만 돌았을 때의 기준선. 지름길이 얼마나 아껴 주는지 재려고 쓴다. */
  const roadsOnly = useMemo(
    () =>
      fromId && toId
        ? findRoute(graph, fromId, toId, { ...options, roadsOnly: true })
        : null,
    [graph, fromId, toId, options],
  );

  const indoorCount = useMemo(
    () => campus.doc.edges.filter((e) => e.surface === 'indoor').length,
    [campus.doc.edges],
  );

  const shortcutCount = useMemo(
    () => campus.doc.edges.filter((e) => e.shortcut).length,
    [campus.doc.edges],
  );

  /* ── 편집 모드 ───────────────────────────────────────────────────────── */

  const toggleEdit = useCallback(() => {
    setEditing((was) => {
      const next = !was;
      const url = new URL(window.location.href);
      if (next) url.searchParams.set('edit', '1');
      else url.searchParams.delete('edit');
      window.history.replaceState(null, '', url);
      if (!next) {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        setLinkFromId(null);
      }
      return next;
    });
  }, []);

  /* ── 지도에서 오는 손짓 ──────────────────────────────────────────────── */

  const onPickNode = useCallback(
    (node: CampusNode) => {
      if (editing) {
        if (linkFromId) {
          campus.addEdge(linkFromId, node.id);
          setLinkFromId(null);
          return;
        }
        setSelectedNodeId(node.id);
        setSelectedEdgeId(null);
        return;
      }

      /* 길찾기 중이면 출발 → 도착 순으로 채우고, 다 찼으면 이 곳부터 다시. */
      if (!fromId) {
        setFromId(node.id);
        return;
      }
      if (!toId && node.id !== fromId) {
        setToId(node.id);
        return;
      }
      setFromId(node.id);
      setToId(null);
    },
    [campus, editing, linkFromId, fromId, toId],
  );

  const onMapClick = useCallback(
    (at: LatLng) => {
      if (!editing) return;
      const node = campus.addNode(at);
      setSelectedNodeId(node.id);
      setSelectedEdgeId(null);
    },
    [campus, editing],
  );

  const onPickEdge = useCallback((edge: CampusEdge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  const swap = useCallback(() => {
    setFromId(toId);
    setToId(fromId);
  }, [fromId, toId]);

  /* 시뮬레이터를 켜면 가짜 위치가 진짜 GPS 자리를 그대로 대신한다. */
  const simulator = useWalkSimulator(
    simulating ? (route?.points ?? null) : null,
  );
  const livePosition = simulating ? simulator.at : geo.here;

  const progress = useMemo(
    () => (route && livePosition ? trackProgress(route, livePosition) : null),
    [route, livePosition],
  );

  const fromNode = fromId ? (graph.nodes.get(fromId) ?? null) : null;
  const to = toId ? (graph.nodes.get(toId) ?? null) : null;

  /* 길목에는 이름이 없다. 현위치로 잡힌 자리는 그렇게 보여 준다. */
  const from =
    fromNode && !fromNode.name
      ? { ...fromNode, name: '현위치 근처' }
      : fromNode;

  return (
    <main className={s.screen}>
      <CampusMap
        graph={graph}
        route={route}
        compare={compare}
        fromId={fromId}
        toId={toId}
        here={livePosition}
        progress={progress}
        panelRef={panelRef}
        editing={editing}
        selectedId={selectedEdgeId}
        onPickNode={onPickNode}
        onPickEdge={onPickEdge}
        onMoveNode={campus.moveNode}
        onMapClick={onMapClick}
      />

      <RoutePanel
        graph={graph}
        from={from}
        to={to}
        options={options}
        route={route}
        compare={compare}
        roadsOnly={roadsOnly}
        indoorCount={indoorCount}
        shortcutCount={shortcutCount}
        geo={geo}
        editing={editing}
        install={install}
        progress={progress}
        simulator={simulating ? simulator : null}
        panelRef={panelRef}
        onChangeFrom={(node) => setFromId(node?.id ?? null)}
        onChangeTo={(node) => setToId(node?.id ?? null)}
        onSwap={swap}
        onChangeOptions={setOptions}
        onToggleEdit={toggleEdit}
      />

      {editing && (
        <EditorPanel
          doc={campus.doc}
          dirty={campus.dirty}
          selectedNode={
            selectedNodeId ? (graph.nodes.get(selectedNodeId) ?? null) : null
          }
          selectedEdge={
            selectedEdgeId ? (graph.edges.get(selectedEdgeId) ?? null) : null
          }
          linkFrom={linkFromId ? (graph.nodes.get(linkFromId) ?? null) : null}
          onStartLink={() => setLinkFromId(selectedNodeId)}
          onCancelLink={() => setLinkFromId(null)}
          onUpdateNode={campus.updateNode}
          onRemoveNode={(id) => {
            campus.removeNode(id);
            setSelectedNodeId(null);
          }}
          onUpdateEdge={campus.updateEdge}
          onRemoveEdge={(id) => {
            campus.removeEdge(id);
            setSelectedEdgeId(null);
          }}
          onReset={campus.reset}
          onImport={campus.replace}
        />
      )}
    </main>
  );
};

export default App;
