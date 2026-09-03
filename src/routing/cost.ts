import type { CampusEdge, Surface } from '@/types/campus';

/** 무엇을 가장 아끼고 싶은지. */
export type ProfileId = 'distance' | 'time' | 'shortcut';

export interface RouteOptions {
  profile: ProfileId;
  /** 건물 안을 가로지르는 구간을 써도 되는지. 문 닫힌 시간엔 끈다. */
  allowIndoor: boolean;
  /**
   * 차도만 따라 도는 계산. 화면에 토글로 내놓지 않고, 지름길이 실제로 얼마나
   * 아껴 주는지 견줄 기준선을 만들 때만 쓴다.
   */
  roadsOnly?: boolean;
}

export const DEFAULT_OPTIONS: RouteOptions = {
  profile: 'time',
  allowIndoor: true,
};

/** 평지 보행 속도(m/s). 4.7km/h — 짐 없이 걷는 대학생 기준. */
const WALK_SPEED = 1.3;

/**
 * 같은 거리라도 바닥에 따라 느려진다. 1.0 이 평지.
 * 계단은 거리가 아니라 층수가 시간을 먹기 때문에 배수가 크다.
 */
const SLOWDOWN: Record<Surface, number> = {
  road: 1,
  path: 1,
  crosswalk: 1,
  slope: 1.35,
  stairs: 2.2,
  indoor: 1.15,
};

/** 구간에 들어설 때마다 한 번씩 붙는 고정 손해(초). */
const ENTRY_PENALTY: Partial<Record<Surface, number>> = {
  crosswalk: 10, // 신호 대기
  stairs: 4, // 층참에서 속도가 죽는다
  indoor: 12, // 문 열고, 사람 피하고, 다시 나오고
};

/**
 * 「지름길 우선」에서 표시된 지름길을 얼마나 싸게 칠지.
 * 0.45 면 지름길 1분을 27초처럼 친다 — 조금 돌더라도 아는 길로 붙는다.
 * 0 으로 두면 지름길만 골라 타느라 터무니없이 도는 길이 나온다.
 */
const SHORTCUT_DISCOUNT = 0.45;

/** 이 구간을 지나는 데 걸리는 시간(초). */
export const secondsFor = (edge: CampusEdge, meters: number): number =>
  (meters * SLOWDOWN[edge.surface]) / WALK_SPEED +
  (ENTRY_PENALTY[edge.surface] ?? 0);

/**
 * 다익스트라가 실제로 최소화하는 값.
 * 쓸 수 없는 구간이면 Infinity 를 돌려준다.
 */
export const costFor = (
  edge: CampusEdge,
  meters: number,
  options: RouteOptions,
): number => {
  if (!options.allowIndoor && edge.surface === 'indoor') return Infinity;
  if (options.roadsOnly && !edge.connector && edge.surface !== 'road') {
    return Infinity;
  }

  const base =
    options.profile === 'distance' ? meters : secondsFor(edge, meters);

  return options.profile === 'shortcut' && edge.shortcut
    ? base * SHORTCUT_DISCOUNT
    : base;
};

export const PROFILE_LABEL: Record<ProfileId, string> = {
  distance: '최단거리',
  time: '최소시간',
  shortcut: '지름길 우선',
};

/** 결과를 나란히 견줄 상대. 최소시간이 기준선 노릇을 한다. */
export const otherProfile = (profile: ProfileId): ProfileId =>
  profile === 'time' ? 'distance' : 'time';

export const SURFACE_LABEL: Record<Surface, string> = {
  road: '차도 옆',
  path: '보행로',
  crosswalk: '횡단',
  slope: '비탈',
  stairs: '계단',
  indoor: '건물 안',
};
