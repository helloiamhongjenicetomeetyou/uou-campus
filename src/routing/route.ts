import type { CampusNode, LatLng } from '@/types/campus';
import { secondsFor, type RouteOptions } from './cost';
import { shortestPath, type Step } from './dijkstra';
import type { CampusGraph } from './graph';

export interface RouteLeg extends Step {
  meters: number;
  seconds: number;
}

export interface Route {
  from: CampusNode;
  to: CampusNode;
  options: RouteOptions;
  legs: RouteLeg[];
  /** 지도에 그릴 좌표 줄. */
  points: LatLng[];
  meters: number;
  seconds: number;
  /** 지름길로 표시된 구간의 길이. */
  shortcutMeters: number;
  /** 계단 구간의 길이. */
  stairsMeters: number;
  /** 건물 안을 지나는 구간의 길이. */
  indoorMeters: number;
  /** 차도를 벗어나 보행로·계단으로 지나는 구간의 길이. */
  footMeters: number;
}

/** 좌표를 이어 붙이되 이음매에서 같은 점이 두 번 들어가지 않게. */
const stitch = (legs: RouteLeg[]): LatLng[] => {
  const points: LatLng[] = [];
  for (const leg of legs) {
    const slice =
      points.length === 0 ? leg.link.points : leg.link.points.slice(1);
    points.push(...slice);
  }
  return points;
};

export const findRoute = (
  graph: CampusGraph,
  fromId: string,
  toId: string,
  options: RouteOptions,
): Route | null => {
  const from = graph.nodes.get(fromId);
  const to = graph.nodes.get(toId);
  if (!from || !to) return null;

  const steps = shortestPath(graph, fromId, toId, options);
  if (!steps) return null;

  const legs: RouteLeg[] = steps.map((step) => ({
    ...step,
    meters: step.link.meters,
    seconds: secondsFor(step.link.edge, step.link.meters),
  }));

  const sum = (pick: (leg: RouteLeg) => number) =>
    legs.reduce((acc, leg) => acc + pick(leg), 0);

  return {
    from,
    to,
    options,
    legs,
    points: legs.length > 0 ? stitch(legs) : [from],
    meters: sum((l) => l.meters),
    seconds: sum((l) => l.seconds),
    shortcutMeters: sum((l) => (l.link.edge.shortcut ? l.meters : 0)),
    stairsMeters: sum((l) => (l.link.edge.surface === 'stairs' ? l.meters : 0)),
    indoorMeters: sum((l) => (l.link.edge.surface === 'indoor' ? l.meters : 0)),
    footMeters: sum((l) =>
      !l.link.edge.connector && l.link.edge.surface !== 'road' ? l.meters : 0,
    ),
  };
};

/** 두 경로가 같은 길인지. 프로필을 바꿔도 결과가 같을 때를 알려 준다. */
export const sameRoute = (a: Route | null, b: Route | null): boolean => {
  if (!a || !b) return a === b;
  if (a.legs.length !== b.legs.length) return false;
  return a.legs.every((leg, i) => leg.link.edge.id === b.legs[i].link.edge.id);
};
