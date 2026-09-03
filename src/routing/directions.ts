import type { CampusNode, LatLng, Surface } from '@/types/campus';
import { bearing, distance, turnAngle } from './geo';
import type { CampusGraph } from './graph';
import type { Route, RouteLeg } from './route';

export type Turn =
  'straight' | 'slight-left' | 'slight-right' | 'left' | 'right' | 'back';

export interface DirectionStep {
  turn: Turn | null;
  /** 꺾는 자리를 알려 줄 건물 이름. 근처에 아무것도 없으면 빈 문자열. */
  at: string;
  text: string;
  meters: number;
  seconds: number;
  surface: Surface;
  shortcut: boolean;
  covered: boolean;
}

const TURN_TEXT: Record<Turn, string> = {
  straight: '직진',
  'slight-left': '왼쪽으로 살짝 꺾어',
  'slight-right': '오른쪽으로 살짝 꺾어',
  left: '왼쪽으로',
  right: '오른쪽으로',
  back: '왔던 쪽으로',
};

const classify = (angle: number): Turn => {
  const abs = Math.abs(angle);
  if (abs < 20) return 'straight';
  if (abs > 135) return 'back';
  if (abs < 55) return angle > 0 ? 'slight-right' : 'slight-left';
  return angle > 0 ? 'right' : 'left';
};

const SURFACE_PHRASE: Partial<Record<Surface, string>> = {
  stairs: '계단으로',
  slope: '비탈을 따라',
  indoor: '건물 안을 지나',
  crosswalk: '길을 건너',
};

/** 이 각도 안쪽이면 굳이 안내할 만큼 꺾은 게 아니다. */
const MERGE_ANGLE = 40;
/** 이보다 짧은 토막은 앞 줄에 붙인다. 다섯 걸음짜리 안내는 방해만 된다. */
const MERGE_METERS = 30;
/** 꺾는 자리에서 이 거리 안에 있는 건물이면 표지로 쓴다. */
const LANDMARK_METERS = 45;

const entryBearing = (leg: RouteLeg) =>
  bearing(leg.link.points[0], leg.link.points[1]);

const exitBearing = (leg: RouteLeg) => {
  const p = leg.link.points;
  return bearing(p[p.length - 2], p[p.length - 1]);
};

/** 이어 붙여도 같은 안내가 되는 구간인지. */
const sameKind = (a: RouteLeg, b: RouteLeg) =>
  a.link.edge.surface === b.link.edge.surface &&
  a.link.edge.shortcut === b.link.edge.shortcut &&
  a.link.edge.covered === b.link.edge.covered;

const nameOf = (graph: CampusGraph, id: string) =>
  graph.nodes.get(id)?.name ?? '';

/**
 * 길목에는 이름이 없다. 그래서 꺾는 자리 근처의 건물을 찾아 표지로 삼는다.
 * "왼쪽으로" 보다 "아산도서관 앞에서 왼쪽으로" 가 훨씬 따라가기 쉽다.
 */
const landmarkNear = (graph: CampusGraph, at: LatLng): string => {
  let best: { name: string; meters: number } | null = null;
  for (const place of graph.places) {
    const meters = distance(at, place);
    if (meters > LANDMARK_METERS) continue;
    if (!best || meters < best.meters) best = { name: place.name, meters };
  }
  return best?.name ?? '';
};

const roundMeters = (m: number) =>
  m < 100 ? Math.round(m / 5) * 5 : Math.round(m / 10) * 10;

interface Group {
  legs: RouteLeg[];
  turn: Turn | null;
}

/**
 * 경로를 사람이 읽는 안내문으로 바꾼다.
 *
 * 길목마다 한 줄씩 뱉으면 600m 짜리 길에 스무 줄이 나온다. 크게 꺾는 자리만
 * 남기고, 짧은 토막은 앞 줄에 흡수시킨 뒤, 남은 자리마다 근처 건물 이름을 붙인다.
 */
export const toDirections = (
  graph: CampusGraph,
  route: Route,
): DirectionStep[] => {
  if (route.legs.length === 0) return [];

  /* 1. 크게 꺾지 않고 성격도 같은 구간끼리 묶는다. */
  const groups: Group[] = [{ legs: [route.legs[0]], turn: null }];

  for (let i = 1; i < route.legs.length; i += 1) {
    const leg = route.legs[i];
    const group = groups[groups.length - 1];
    const prev = group.legs[group.legs.length - 1];
    const turn = classify(turnAngle(exitBearing(prev), entryBearing(leg)));

    const keepGoing =
      Math.abs(turnAngle(exitBearing(prev), entryBearing(leg))) < MERGE_ANGLE &&
      sameKind(prev, leg);

    if (keepGoing) group.legs.push(leg);
    else groups.push({ legs: [leg], turn });
  }

  /* 2. 너무 짧은 토막은 앞 줄에 붙인다. */
  const merged: Group[] = [];
  for (const group of groups) {
    const meters = group.legs.reduce((acc, leg) => acc + leg.meters, 0);
    const prev = merged[merged.length - 1];
    if (prev && meters < MERGE_METERS) prev.legs.push(...group.legs);
    else merged.push(group);
  }

  /* 3. 줄마다 표지를 붙여 문장으로 만든다. */
  /* 출발한 건물을 곧바로 '앞에서' 표지로 다시 쓰면 어색하다. */
  let lastLandmark = nameOf(graph, route.legs[0].from);

  return merged.map((group, index) => {
    const head = group.legs[0];
    const tail = group.legs[group.legs.length - 1];
    const meters = group.legs.reduce((acc, leg) => acc + leg.meters, 0);
    const seconds = group.legs.reduce((acc, leg) => acc + leg.seconds, 0);
    const { surface, shortcut, covered } = head.link.edge;

    const at = index === 0 ? '' : landmarkNear(graph, head.link.points[0]);
    const showLandmark = at !== '' && at !== lastLandmark;
    if (at) lastLandmark = at;

    const target = nameOf(graph, tail.link.to);
    const phrase = SURFACE_PHRASE[surface];

    const parts: string[] = [];
    if (index === 0) {
      parts.push(`${nameOf(graph, head.from) || '출발지'}에서 출발,`);
    } else {
      if (showLandmark) parts.push(`${at} 앞에서`);
      parts.push(TURN_TEXT[group.turn ?? 'straight']);
    }
    if (phrase) parts.push(phrase);
    parts.push(`${roundMeters(meters)}m`);
    if (target && target !== at) parts.push(`— ${target}`);

    return {
      turn: group.turn,
      at,
      text: parts.join(' '),
      meters,
      seconds,
      surface,
      shortcut,
      covered,
    };
  });
};

/**
 * 꺾는 동작만 짧게. 걸으면서 흘깃 보는 배너에는 문장이 아니라 낱말이 맞다.
 * 문장 전체는 목록에서 읽는다.
 */
const TURN_BRIEF: Record<Turn, string> = {
  straight: '직진',
  'slight-left': '왼쪽으로 살짝',
  'slight-right': '오른쪽으로 살짝',
  left: '왼쪽으로 꺾기',
  right: '오른쪽으로 꺾기',
  back: '왔던 쪽으로',
};

export const turnBrief = (step: DirectionStep): string =>
  TURN_BRIEF[step.turn ?? 'straight'];

/** 마지막 줄 뒤에 붙일 도착 안내. */
export const arrivalText = (to: CampusNode): string =>
  `${to.name}${to.no ? ` (${to.no}번)` : ''} 도착`;
