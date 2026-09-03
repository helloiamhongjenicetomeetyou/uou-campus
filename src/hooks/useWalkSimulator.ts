import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LatLng } from '@/types/campus';
import { distance, fromPlane, polylineLength, toPlane } from '@/routing/geo';

/** 시뮬레이터가 걷는 기본 속도(m/s). cost.ts 의 평지 속도와 같다. */
const WALK_SPEED = 1.3;
/** 위치를 몇 밀리초마다 새로 흘려보낼지. 실제 GPS 도 이 정도 간격이다. */
const TICK_MS = 500;
/** GPS 처럼 보이게 옆으로 흔드는 폭(m). 경로에 끌어당기는 게 되는지 보려고 넣는다. */
const JITTER_METERS = 4;

/**
 * 걷는 시늉을 내는 가짜 위치.
 *
 * 실시간 위치가 경로를 따라 움직이는지 보려면 원래는 캠퍼스를 걸어야 한다.
 * 이 훅은 지금 뽑힌 경로 위를 정해진 속도로 지나가는 좌표를 만들어, 진짜 GPS 와
 * 똑같은 자리에 흘려 넣는다. 책상에서 전 구간을 확인할 수 있다.
 *
 * 걸어온 거리 하나가 상태의 전부고 위치는 거기서 파생된다. 그래서 흔들림도
 * 난수가 아니라 거리로 정한다 — 같은 거리면 늘 같은 자리라 화면이 떨지 않는다.
 */
export const useWalkSimulator = (points: LatLng[] | null) => {
  const [walked, setWalked] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(4);

  const total = useMemo(
    () => (points && points.length >= 2 ? polylineLength(points) : 0),
    [points],
  );

  /* 경로가 바뀌면 처음부터 다시 걷는다. 렌더 도중에 되돌리는 게 리액트 방식이다. */
  const key = points
    ? `${points.length}:${points[0]?.lat}:${total.toFixed(1)}`
    : null;
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setWalked(0);
    setPlaying(false);
  }

  const positionAt = useCallback(
    (meters: number): LatLng | null => {
      if (!points || points.length < 2) return null;

      let left = meters;
      for (let i = 1; i < points.length; i += 1) {
        const span = distance(points[i - 1], points[i]);
        if (left > span) {
          left -= span;
          continue;
        }
        const plane = toPlane(points[i], points[i - 1]);
        const ratio = span > 0 ? left / span : 0;
        const on = fromPlane(
          { x: plane.x * ratio, y: plane.y * ratio },
          points[i - 1],
        );
        /* 옆으로 조금 흔들어 준다. 안 그러면 오차 0m 라 스냅이 도는지 알 수 없다. */
        const wobble = Math.sin(meters / 7) * JITTER_METERS;
        return fromPlane({ x: wobble, y: wobble * 0.4 }, on);
      }
      return points[points.length - 1];
    },
    [points],
  );

  const at = useMemo(
    () => (walked > 0 ? positionAt(walked) : null),
    [walked, positionAt],
  );

  useEffect(() => {
    if (!playing || total === 0) return;

    /*
     * setInterval 로 돈다. requestAnimationFrame 은 탭이 뒤에 있거나 화면이
     * 멈춘 환경에서 아예 안 불려서 시뮬레이터가 그대로 멈춰 버린다.
     */
    const step = (WALK_SPEED * speed * TICK_MS) / 1000;
    const timer = setInterval(() => {
      /* 끝에 닿으면 같은 값이 되어 리액트가 알아서 다시 그리지 않는다. */
      setWalked((was) => Math.min(total, was + step));
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [playing, speed, total]);

  const finished = total > 0 && walked >= total;

  return {
    at,
    playing,
    finished,
    speed,
    setSpeed,
    walked,
    total,
    reset: () => {
      setWalked(0);
      setPlaying(false);
    },
    toggle: () => {
      if (finished) setWalked(0);
      setPlaying((was) => !was || finished);
    },
    ready: total > 0,
  };
};
