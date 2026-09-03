import type {
  CampusEdge,
  CampusGraphDoc,
  CampusNode,
  LatLng,
} from '@/types/campus';
import { polylineLength } from './geo';

/** 간선 하나를 한쪽 방향에서 본 모습. */
export interface Link {
  edge: CampusEdge;
  to: string;
  meters: number;
  /** from → to 방향으로 늘어놓은 좌표. 그리기와 안내문에 함께 쓴다. */
  points: LatLng[];
}

export interface CampusGraph {
  nodes: Map<string, CampusNode>;
  edges: Map<string, CampusEdge>;
  /** 노드 id → 그 노드에서 나가는 길들. */
  links: Map<string, Link[]>;
  /** 이름으로 찾을 수 있는 곳들 — 길목은 뺀다. */
  places: CampusNode[];
}

/** 문서 하나를 길찾기가 쓸 수 있는 인접 리스트로 편다. */
export const buildGraph = (doc: CampusGraphDoc): CampusGraph => {
  const nodes = new Map(doc.nodes.map((n) => [n.id, n]));
  const edges = new Map<string, CampusEdge>();
  const links = new Map<string, Link[]>();

  const add = (from: string, link: Link) => {
    const list = links.get(from);
    if (list) list.push(link);
    else links.set(from, [link]);
  };

  for (const edge of doc.edges) {
    const a = nodes.get(edge.from);
    const b = nodes.get(edge.to);
    /* 시드 검증을 통과했어도, 편집 모드에서 노드를 지우면 여기로 온다. */
    if (!a || !b) continue;

    const forward: LatLng[] = [a, ...(edge.via ?? []), b];
    const meters = polylineLength(forward);

    edges.set(edge.id, edge);
    add(edge.from, { edge, to: edge.to, meters, points: forward });
    add(edge.to, {
      edge,
      to: edge.from,
      meters,
      points: [...forward].reverse(),
    });
  }

  const places = doc.nodes
    .filter((n) => n.kind !== 'junction')
    .sort(
      (a, b) =>
        (a.no ?? 999) - (b.no ?? 999) || a.name.localeCompare(b.name, 'ko'),
    );

  return { nodes, edges, links, places };
};

/** 임의의 좌표에서 가장 가까운 노드. 현위치를 그래프에 붙일 때 쓴다. */
export const nearestNode = (
  graph: CampusGraph,
  point: LatLng,
  filter?: (node: CampusNode) => boolean,
): { node: CampusNode; meters: number } | null => {
  let best: { node: CampusNode; meters: number } | null = null;

  for (const node of graph.nodes.values()) {
    if (filter && !filter(node)) continue;
    const meters = polylineLength([point, node]);
    if (!best || meters < best.meters) best = { node, meters };
  }

  return best;
};
