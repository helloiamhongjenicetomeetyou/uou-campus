import { useCallback, useMemo, useState } from 'react';
import type {
  CampusEdge,
  CampusGraphDoc,
  CampusNode,
  LatLng,
} from '@/types/campus';
import { buildGraph } from '@/routing/graph';
import {
  clearSavedDoc,
  hasSavedDoc,
  loadDoc,
  saveDoc,
  seedDoc,
} from '@/data/campus';

const nextId = (prefix: string, taken: Set<string>) => {
  for (let i = 1; ; i += 1) {
    const id = `${prefix}${i}`;
    if (!taken.has(id)) return id;
  }
};

/**
 * 캠퍼스 그래프와 그걸 고치는 손잡이들.
 *
 * 고친 내용은 곧바로 브라우저에 저장한다. 편집 도중 새로고침해도 안 날아가고,
 * 다 끝나면 JSON 으로 내보내 src/data/campus.json 을 덮어쓰면 된다.
 */
export const useCampusDoc = () => {
  const [doc, setDocState] = useState<CampusGraphDoc>(loadDoc);
  const [dirty, setDirty] = useState(hasSavedDoc);

  const graph = useMemo(() => buildGraph(doc), [doc]);

  const commit = useCallback((next: CampusGraphDoc) => {
    setDocState(next);
    saveDoc(next);
    setDirty(true);
  }, []);

  const moveNode = useCallback(
    (id: string, at: LatLng) => {
      commit({
        ...doc,
        nodes: doc.nodes.map((n) =>
          /* 사람이 직접 맞춘 좌표라 approx 딱지를 뗀다. */
          n.id === id ? { ...n, ...at, precision: 'surveyed' } : n,
        ),
      });
    },
    [commit, doc],
  );

  const addNode = useCallback(
    (at: LatLng, kind: CampusNode['kind'] = 'junction') => {
      const taken = new Set(doc.nodes.map((n) => n.id));
      const id = nextId(kind === 'junction' ? 'j-new-' : 'n-new-', taken);
      const node: CampusNode = {
        id,
        kind,
        name: kind === 'junction' ? '' : '이름 없는 곳',
        ...at,
        precision: 'surveyed',
      };
      commit({ ...doc, nodes: [...doc.nodes, node] });
      return node;
    },
    [commit, doc],
  );

  const updateNode = useCallback(
    (id: string, patch: Partial<CampusNode>) => {
      commit({
        ...doc,
        nodes: doc.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      });
    },
    [commit, doc],
  );

  const removeNode = useCallback(
    (id: string) => {
      commit({
        ...doc,
        nodes: doc.nodes.filter((n) => n.id !== id),
        /* 매달려 있던 간선도 같이 지운다. 안 그러면 그래프에 구멍이 남는다. */
        edges: doc.edges.filter((e) => e.from !== id && e.to !== id),
      });
    },
    [commit, doc],
  );

  const addEdge = useCallback(
    (from: string, to: string) => {
      if (from === to) return null;
      const exists = doc.edges.some(
        (e) =>
          (e.from === from && e.to === to) || (e.from === to && e.to === from),
      );
      if (exists) return null;

      const edge: CampusEdge = {
        id: nextId('e-new-', new Set(doc.edges.map((e) => e.id))),
        from,
        to,
        surface: 'path',
        shortcut: false,
        covered: false,
        connector: false,
        source: 'walked',
      };
      commit({ ...doc, edges: [...doc.edges, edge] });
      return edge;
    },
    [commit, doc],
  );

  const updateEdge = useCallback(
    (id: string, patch: Partial<CampusEdge>) => {
      commit({
        ...doc,
        edges: doc.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      });
    },
    [commit, doc],
  );

  const removeEdge = useCallback(
    (id: string) => {
      commit({ ...doc, edges: doc.edges.filter((e) => e.id !== id) });
    },
    [commit, doc],
  );

  const reset = useCallback(() => {
    clearSavedDoc();
    setDocState(seedDoc);
    setDirty(false);
  }, []);

  const replace = useCallback(
    (next: CampusGraphDoc) => {
      commit(next);
    },
    [commit],
  );

  return {
    doc,
    graph,
    dirty,
    moveNode,
    addNode,
    updateNode,
    removeNode,
    addEdge,
    updateEdge,
    removeEdge,
    reset,
    replace,
  };
};
