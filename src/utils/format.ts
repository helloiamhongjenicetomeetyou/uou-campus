/** 거리를 사람이 읽는 단위로. 캠퍼스 안이라 대부분 m 로 끝난다. */
export const formatMeters = (meters: number): string =>
  meters >= 1000 ? `${(meters / 1000).toFixed(2)}km` : `${Math.round(meters)}m`;

/** 초를 분으로. 1분 미만은 굳이 반올림하지 않고 그대로 말한다. */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}초`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}분`;
  return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`;
};

/** 두 값의 차이를 부호와 함께. 비교 줄에 쓴다. */
export const formatDelta = (
  value: number,
  base: number,
  unit: (n: number) => string,
): string => {
  const diff = value - base;
  if (Math.abs(diff) < 1) return '같음';
  return `${diff > 0 ? '+' : '−'}${unit(Math.abs(diff))}`;
};
