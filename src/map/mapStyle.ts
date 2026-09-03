import type { PathOptions } from 'leaflet';
import type { CampusEdge } from '@/types/campus';
import { theme } from '@/styles';

/** 캠퍼스가 다 들어오는 처음 화면. */
export const CAMPUS_CENTER = { lat: 35.5442, lng: 129.2566 };
export const CAMPUS_ZOOM = 16;

export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
/* ODbL 과 타일 사용 정책이 요구하는 최소 표기. 더 줄일 수 없다. */
export const TILE_ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/**
 * 배경으로 깔리는 캠퍼스 보행망.
 * 차도는 뒤로 물리고 보행로·계단을 앞세운다 — 지름길이 눈에 먼저 들어오게.
 */
export const baseEdgeStyle = (edge: CampusEdge): PathOptions => {
  if (edge.connector) {
    return {
      color: theme.gray[300],
      weight: 1,
      opacity: 0.5,
      dashArray: '1 4',
      interactive: false,
    };
  }
  if (edge.shortcut) {
    return {
      color: theme.accent,
      weight: 3.5,
      opacity: 0.75,
      interactive: false,
    };
  }
  switch (edge.surface) {
    case 'stairs':
      return {
        color: theme.accent,
        weight: 3,
        opacity: 0.6,
        dashArray: '2 4',
        interactive: false,
      };
    case 'indoor':
      return {
        color: theme.accent,
        weight: 3,
        opacity: 0.6,
        dashArray: '1 6',
        interactive: false,
      };
    case 'road':
      return {
        color: theme.gray[400],
        weight: 1.5,
        opacity: 0.3,
        interactive: false,
      };
    default:
      return {
        color: theme.accent,
        weight: 2.5,
        opacity: 0.42,
        interactive: false,
      };
  }
};

/** 고른 경로. 굵은 선 밑에 흰 테를 한 겹 깔아 배경과 떼어 놓는다. */
export const routeCasingStyle: PathOptions = {
  color: theme.gray[0],
  weight: 10,
  opacity: 0.9,
  lineCap: 'round',
  lineJoin: 'round',
  interactive: false,
};

export const routeStyle: PathOptions = {
  color: theme.accent,
  weight: 5,
  opacity: 1,
  lineCap: 'round',
  lineJoin: 'round',
  interactive: false,
};

/** 비교용으로 같이 그리는 두 번째 경로. */
export const compareStyle: PathOptions = {
  color: theme.warn,
  weight: 4,
  opacity: 0.85,
  dashArray: '7 6',
  lineCap: 'round',
  interactive: false,
};

/** 이미 지나온 구간. 남은 길과 헷갈리지 않게 눌러 둔다. */
export const passedStyle: PathOptions = {
  color: theme.gray[400],
  weight: 5,
  opacity: 0.65,
  lineCap: 'round',
  lineJoin: 'round',
  interactive: false,
};

/** 경로 안에서도 지름길 구간만 따로 덧그린다. */
export const shortcutOverlayStyle: PathOptions = {
  color: theme.gray[0],
  weight: 2,
  opacity: 0.9,
  dashArray: '1 7',
  lineCap: 'round',
  interactive: false,
};
