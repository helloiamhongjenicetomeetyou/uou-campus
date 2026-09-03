import { useEffect, useRef, useState, type RefObject } from 'react';
import L from 'leaflet';
import type { CampusEdge, CampusNode, LatLng } from '@/types/campus';
import type { CampusGraph } from '@/routing/graph';
import type { Route } from '@/routing/route';
import type { RouteProgress } from '@/routing/progress';
import { boundsOf } from '@/routing/geo';
import {
  CAMPUS_CENTER,
  CAMPUS_ZOOM,
  TILE_ATTRIBUTION,
  TILE_URL,
  baseEdgeStyle,
  compareStyle,
  passedStyle,
  routeCasingStyle,
  routeStyle,
  shortcutOverlayStyle,
} from '@/map/mapStyle';
import { endpointIcon, hereIcon, junctionIcon, placeIcon } from '@/map/icons';
import * as s from './style.css';

interface Props {
  graph: CampusGraph;
  route: Route | null;
  /** 같이 겹쳐 보여 줄 다른 기준의 경로. 같은 길이면 넘기지 않는다. */
  compare: Route | null;
  fromId: string | null;
  toId: string | null;
  here: LatLng | null;
  /** 걷는 중이면 어디까지 왔는지. 지나온 구간을 눌러 그린다. */
  progress: RouteProgress | null;
  /**
   * 지도를 덮는 길찾기 패널. 캠퍼스를 보이는 자리에 맞추려고 크기를 재 간다.
   * 잰 값을 상태로 들고 돌면 순서가 꼬여서, 맞출 때 그 자리에서 읽는다.
   */
  panelRef: RefObject<HTMLElement | null>;
  editing: boolean;
  selectedId: string | null;
  onPickNode: (node: CampusNode) => void;
  onPickEdge: (edge: CampusEdge) => void;
  onMoveNode: (id: string, at: LatLng) => void;
  onMapClick: (at: LatLng) => void;
}

/** 이름표를 보여 줄 최소 배율. */
const LABEL_ZOOM = 17;
/**
 * 길목을 보여 줄 최소 배율. 캠퍼스 전체가 보이는 배율에서 길목 삼백 개를 다
 * 찍으면 지도가 아니라 점 무더기가 된다.
 */
const JUNCTION_ZOOM = 17;

/** 길찾기 패널이 옆이 아니라 아래로 내려가는 너비. style.css.ts 의 screen.phone. */
const PANEL_BREAKPOINT = 768;

const toLeaflet = (p: LatLng): L.LatLngTuple => [p.lat, p.lng];

const CampusMap = ({
  graph,
  route,
  compare,
  fromId,
  toId,
  here,
  progress,
  panelRef,
  editing,
  selectedId,
  onPickNode,
  onPickEdge,
  onMoveNode,
  onMapClick,
}: Props) => {
  const [zoom, setZoom] = useState(CAMPUS_ZOOM);
  const holder = useRef<HTMLDivElement>(null);
  /** 지도를 만든 뒤에야 생기는 손잡이. 경로가 정해질 때 다시 부른다. */
  const fitTo = useRef<(points: LatLng[]) => void>(() => {});
  const map = useRef<L.Map | null>(null);
  const baseLayer = useRef<L.LayerGroup | null>(null);
  const routeLayer = useRef<L.LayerGroup | null>(null);
  const markerLayer = useRef<L.LayerGroup | null>(null);
  const hereMarker = useRef<L.Marker | null>(null);

  /* 콜백은 매 렌더 새로 오지만 지도는 한 번만 만든다. 최신 것만 참조로 들고 간다. */
  const handlers = useRef({ onPickNode, onPickEdge, onMoveNode, onMapClick });
  useEffect(() => {
    handlers.current = { onPickNode, onPickEdge, onMoveNode, onMapClick };
  });

  const nodesRef = useRef(graph.nodes);
  useEffect(() => {
    nodesRef.current = graph.nodes;
  });

  /* ── 지도 만들기 (한 번) ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!holder.current || map.current) return;

    const instance = L.map(holder.current, {
      center: toLeaflet(CAMPUS_CENTER),
      zoom: CAMPUS_ZOOM,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer(TILE_URL, {
      maxZoom: 19,
      attribution: TILE_ATTRIBUTION,
    }).addTo(instance);

    L.control.zoom({ position: 'bottomright' }).addTo(instance);

    baseLayer.current = L.layerGroup().addTo(instance);
    routeLayer.current = L.layerGroup().addTo(instance);
    markerLayer.current = L.layerGroup().addTo(instance);

    const syncZoomClass = () => {
      const level = instance.getZoom();
      setZoom(level);
      holder.current?.classList.toggle('campus-map--far', level < LABEL_ZOOM);
    };
    syncZoomClass();
    instance.on('zoomend', syncZoomClass);
    instance.on('click', (e) => handlers.current.onMapClick(e.latlng));

    /*
     * 개발 모드에서는 스타일이 자바스크립트로 뒤늦게 붙는다. 그래서 이 시점의
     * 컨테이너는 아직 0×0 일 수 있고, 그대로 fitBounds 를 부르면 최대 배율로
     * 튄다. 크기가 실제로 잡힌 뒤에 한 번만 맞춘다.
     */
    /*
     * 길찾기 패널이 지도를 덮는다. 넓은 화면에선 왼쪽을, 좁은 화면에선 아래를
     * 가리므로 그만큼 여백을 줘야 캠퍼스가 보이는 자리에 들어온다.
     * 높이를 짐작하면 틀린다 — 패널이 잰 실제 크기를 받아 쓴다.
     */
    const fitPoints = (points: LatLng[]) => {
      const box = boundsOf(points);
      const width = holder.current?.clientWidth ?? 0;
      const height = holder.current?.clientHeight ?? 0;
      if (!box || !width || !height) return;

      /* 패널은 넓은 화면에선 왼쪽에, 좁은 화면에선 아래에 붙는다. */
      const panel = panelRef.current?.getBoundingClientRect();
      const narrow = width <= PANEL_BREAKPOINT;
      const left = !narrow && panel ? Math.round(panel.width) + 32 : 0;
      const bottom = narrow && panel ? Math.round(panel.height) : 0;

      /* 여백이 화면을 다 먹으면 fitBounds 가 최대 배율로 튄다. 남길 자리를 지킨다. */
      const cap = (value: number, limit: number) =>
        Math.max(0, Math.min(value, limit - 96));

      /* Leaflet 이 들고 있는 크기가 낡아 있으면 배율을 엉뚱하게 고른다. */
      instance.invalidateSize({ animate: false });

      /*
       * animate: false 가 꼭 필요하다. 애니메이션이 붙은 fitBounds 는 전환이
       * 끝나야 자리가 잡히는데, 탭이 뒤에 있거나 화면이 멈춘 환경에서는 그
       * 전환이 영영 안 끝나서 지도가 처음 배율에 그대로 머문다.
       */
      instance.fitBounds([toLeaflet(box[0]), toLeaflet(box[1])], {
        paddingTopLeft: [cap(left, width) + 16, 16],
        paddingBottomRight: [16, cap(bottom, height) + 16],
        animate: false,
      });
    };
    fitTo.current = fitPoints;

    const fit = () => fitPoints([...nodesRef.current.values()]);

    /*
     * 맞추는 시점.
     *
     * ResizeObserver 는 환경에 따라 아예 안 불릴 수 있어서 여기에만 기대면
     * 지도가 영영 안 맞는다. 이펙트가 도는 지금 레이아웃은 이미 확정돼 있으니
     * 바로 한 번 맞추고, 스타일이 늦게 붙는 경우를 위해 다음 프레임에 한 번 더
     * 맞춘다. 그 뒤로는 창 크기가 바뀔 때만 손댄다.
     */
    let wasNarrow = (holder.current?.clientWidth ?? 0) <= PANEL_BREAKPOINT;

    fit();
    const firstFrame = requestAnimationFrame(fit);

    const onResize = () => {
      const narrow = (holder.current?.clientWidth ?? 0) <= PANEL_BREAKPOINT;
      instance.invalidateSize({ animate: false });
      /* 패널이 옆에서 아래로 옮겨 갈 때만 다시 맞춘다. 사람이 옮긴 화면은 둔다. */
      if (narrow === wasNarrow) return;
      wasNarrow = narrow;
      fit();
    };
    window.addEventListener('resize', onResize);

    map.current = instance;

    return () => {
      cancelAnimationFrame(firstFrame);
      window.removeEventListener('resize', onResize);
      instance.remove();
      map.current = null;
    };
  }, [panelRef]);

  /*
   * 출발·도착이 바뀌면 경로가 다 보이도록 맞춘다. 좁은 화면에서는 시트가
   * 커지면서 경로를 통째로 가려 버리기 때문이다. 기준만 바꿀 때는 건드리지
   * 않는다 — 같은 구간을 보는 중에 화면이 튀면 성가시다.
   */
  const legKey = route ? `${route.from.id}→${route.to.id}` : null;
  useEffect(() => {
    if (!map.current || !route || route.points.length < 2) return;
    fitTo.current(route.points);
    /* 경로 자체가 아니라 '어디서 어디로' 가 바뀔 때만 맞춘다. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legKey]);

  /* ── 배경 길 ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const layer = baseLayer.current;
    if (!layer) return;
    layer.clearLayers();

    for (const [id, links] of graph.links) {
      for (const link of links) {
        /* 양방향이라 같은 간선이 두 번 나온다. 한쪽만 그린다. */
        if (link.edge.from !== id) continue;

        const line = L.polyline(link.points.map(toLeaflet), {
          ...baseEdgeStyle(link.edge),
          ...(editing ? { interactive: true, weight: 6, opacity: 0.7 } : {}),
        });

        if (editing) {
          if (link.edge.id === selectedId) line.setStyle({ color: '#B45309' });
          line.on('click', (e) => {
            L.DomEvent.stop(e);
            handlers.current.onPickEdge(link.edge);
          });
        }
        line.addTo(layer);
      }
    }
  }, [graph, editing, selectedId]);

  /* ── 고른 경로 ───────────────────────────────────────────────────────── */
  useEffect(() => {
    const layer = routeLayer.current;
    if (!layer) return;
    layer.clearLayers();
    if (!route) return;

    if (compare) {
      L.polyline(compare.points.map(toLeaflet), compareStyle).addTo(layer);
    }

    L.polyline(route.points.map(toLeaflet), routeCasingStyle).addTo(layer);
    L.polyline(route.points.map(toLeaflet), routeStyle).addTo(layer);

    /* 이미 지나온 만큼은 회색으로 덮는다. 남은 길만 초록으로 남는다. */
    if (progress && progress.passed.length > 1) {
      L.polyline(progress.passed.map(toLeaflet), passedStyle).addTo(layer);
    }

    /* 경로 안의 지름길 구간에만 흰 점선을 덧씌워 눈에 띄게. */
    for (const leg of route.legs) {
      if (!leg.link.edge.shortcut) continue;
      L.polyline(leg.link.points.map(toLeaflet), shortcutOverlayStyle).addTo(
        layer,
      );
    }
  }, [route, compare, progress]);

  /* ── 장소 표시 ───────────────────────────────────────────────────────── */
  useEffect(() => {
    const layer = markerLayer.current;
    if (!layer) return;
    layer.clearLayers();

    for (const node of graph.nodes.values()) {
      const isJunction = node.kind === 'junction';
      if (isJunction && (!editing || zoom < JUNCTION_ZOOM)) continue;

      const endpoint = node.id === fromId || node.id === toId;
      const className = [
        endpoint
          ? node.id === fromId
            ? s.endpoint
            : s.endpointTo
          : isJunction
            ? s.junction
            : node.kind === 'gate'
              ? s.gate
              : s.place,
        node.precision === 'approx' && !endpoint ? s.approx : '',
      ]
        .filter(Boolean)
        .join(' ');

      const marker = L.marker(toLeaflet(node), {
        icon: endpoint
          ? endpointIcon(node.id === fromId ? '출발' : '도착', className)
          : isJunction
            ? junctionIcon(className)
            : placeIcon(node, className),
        draggable: editing,
        keyboard: false,
        zIndexOffset: endpoint ? 1000 : isJunction ? -200 : 0,
      });

      if (node.name) {
        marker.bindTooltip(node.name, {
          className: 'campus-label',
          direction: 'right',
          offset: [12, 0],
          permanent: true,
        });
      }

      marker.on('click', (e) => {
        L.DomEvent.stop(e);
        handlers.current.onPickNode(node);
      });
      if (editing) {
        marker.on('dragend', () => {
          const { lat, lng } = marker.getLatLng();
          handlers.current.onMoveNode(node.id, { lat, lng });
        });
      }

      marker.addTo(layer);
    }
  }, [graph, editing, fromId, toId, zoom]);

  /* ── 현위치 ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;

    if (!here) {
      hereMarker.current?.remove();
      hereMarker.current = null;
      return;
    }

    if (!hereMarker.current) {
      hereMarker.current = L.marker(toLeaflet(here), {
        icon: hereIcon(s.here),
        interactive: false,
        zIndexOffset: 900,
      }).addTo(instance);
    } else {
      hereMarker.current.setLatLng(toLeaflet(here));
    }

    /*
     * 걷다가 화면 밖으로 나가면 따라간다. 매번 가운데로 끌어오면 지도를 들여다볼
     * 수가 없으니, 정말로 벗어났을 때만 옮긴다.
     */
    if (!instance.getBounds().pad(-0.15).contains(toLeaflet(here))) {
      instance.panTo(toLeaflet(here), { animate: false });
    }
  }, [here]);

  return <div ref={holder} className={s.container} />;
};

export default CampusMap;
