import type { LatLng } from '@/types/campus';
import { distance, fromPlane, toPlane } from './geo';
import type { Route } from './route';

export interface RouteProgress {
  /** 경로 위로 끌어당긴 자리. 지도에 찍는 건 이쪽이다. */
  snapped: LatLng;
  /** 경로에서 얼마나 벗어나 있는지(m). GPS 오차도 여기에 섞여 있다. */
  offRoute: number;
  /** 출발점에서 여기까지 경로를 따라온 거리(m). */
  along: number;
  remainingMeters: number;
  remainingSeconds: number;
  /** 지금 걷고 있는 안내 줄의 차례. */
  stepIndex: number;
  /** 지나온 자취와 남은 자취. 지도에 다르게 그린다. */
  passed: LatLng[];
  ahead: LatLng[];
}

/**
 * 경로를 벗어났다고 보는 기준(m).
 *
 * 고정값 하나로는 안 된다. 건물 사이에서는 GPS 오차가 30m 를 넘기도 하는데
 * 그때마다 '벗어났다' 고 하면 걷는 내내 경고가 깜빡인다. 브라우저가 알려 주는
 * 오차 반경이 있으면 그걸 넉넉히 감안한다.
 */
export const OFF_ROUTE_METERS = 35;

export const offRouteLimit = (accuracy: number | null): number =>
  Math.max(OFF_ROUTE_METERS, (accuracy ?? 0) * 1.5);

/**
 * 이 안쪽이면 도착으로 본다.
 *
 * 건물 좌표는 출입구가 아니라 건물 한가운데에 찍혀 있다. 정확히 0m 를 기다리면
 * 문 앞에 다 와서도 안내가 안 끝난다.
 */
export const ARRIVED_METERS = 15;

/** 선분 위에서 점에 가장 가까운 자리를, 0~1 비율로. */
const projectOnSegment = (
  point: LatLng,
  a: LatLng,
  b: LatLng,
): { t: number; meters: number } => {
  const p = toPlane(point, a);
  const q = toPlane(b, a);
  const lengthSquared = q.x * q.x + q.y * q.y;

  /* 길이가 0 인 선분이면 시작점이 곧 최근접점이다. */
  if (lengthSquared === 0) return { t: 0, meters: Math.hypot(p.x, p.y) };

  const t = Math.max(0, Math.min(1, (p.x * q.x + p.y * q.y) / lengthSquared));
  const closest = { x: q.x * t, y: q.y * t };
  return { t, meters: Math.hypot(p.x - closest.x, p.y - closest.y) };
};

/**
 * 지금 위치가 경로의 어디쯤인지.
 *
 * 경로를 이루는 선분마다 최근접점을 구해 가장 가까운 하나를 고른다. 노드가
 * 수백 개라 해도 한 경로의 선분은 수십 개뿐이라 매 위치 갱신마다 다 훑어도 된다.
 */
export const trackProgress = (
  route: Route,
  at: LatLng,
): RouteProgress | null => {
  const points = route.points;
  if (points.length < 2) return null;

  let best: { index: number; t: number; meters: number } | null = null;
  for (let i = 1; i < points.length; i += 1) {
    const hit = projectOnSegment(at, points[i - 1], points[i]);
    if (!best || hit.meters < best.meters) {
      best = { index: i, t: hit.t, meters: hit.meters };
    }
  }
  if (!best) return null;

  /* 고른 선분 위의 실제 좌표. */
  const a = points[best.index - 1];
  const b = points[best.index];
  const plane = toPlane(b, a);
  const snapped = fromPlane({ x: plane.x * best.t, y: plane.y * best.t }, a);

  /* 출발점부터 여기까지 따라온 거리. */
  let along = 0;
  for (let i = 1; i < best.index; i += 1)
    along += distance(points[i - 1], points[i]);
  along += distance(a, snapped);

  /* 남은 시간은 구간마다 속도가 달라서, 지나온 만큼만 덜어 낸다. */
  let walked = 0;
  let remainingSeconds = 0;
  for (const leg of route.legs) {
    const legStart = walked;
    walked += leg.meters;
    if (walked <= along) continue;
    const left = Math.min(leg.meters, walked - Math.max(along, legStart));
    remainingSeconds += leg.meters > 0 ? (left / leg.meters) * leg.seconds : 0;
  }

  return {
    snapped,
    offRoute: best.meters,
    along,
    remainingMeters: Math.max(0, route.meters - along),
    remainingSeconds,
    stepIndex: 0,
    passed: [...points.slice(0, best.index), snapped],
    ahead: [snapped, ...points.slice(best.index)],
  };
};

/** 따라온 거리로 몇 번째 안내 줄인지 찾는다. */
export const stepAt = (stepMeters: number[], along: number): number => {
  let walked = 0;
  for (let i = 0; i < stepMeters.length; i += 1) {
    walked += stepMeters[i];
    if (along < walked) return i;
  }
  return Math.max(0, stepMeters.length - 1);
};
