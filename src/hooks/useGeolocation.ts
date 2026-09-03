import { useCallback, useEffect, useRef, useState } from 'react';
import type { LatLng } from '@/types/campus';

type Status =
  | 'idle'
  | 'locating'
  /** 좌표는 왔지만 아직 어림하다. 점은 찍되 출발지로 쓰진 않는다. */
  | 'coarse'
  | 'ready'
  | 'denied'
  | 'unsupported'
  | 'failed';

interface Params {
  /** 쓸 만한 첫 좌표가 잡혔을 때 한 번. 그 뒤 갱신에는 안 부른다. */
  onFirstFix?: (at: LatLng) => void;
}

/**
 * 이보다 어림한 좌표로는 출발지를 잡지 않는다(m).
 *
 * 브라우저는 보통 와이파이·기지국으로 어림잡은 좌표를 먼저 던지고 나중에 위성으로
 * 다듬는다. 그 첫 값은 수백 미터가 틀리기도 하는데, 그걸로 출발지를 잡으면 캠퍼스
 * 반대편 건물이 조용히 들어앉는다. 화면에는 점이 잘 찍혀 있으니 사람은 왜 엉뚱한
 * 길이 나오는지 알 수가 없다. 그래서 다듬어진 좌표를 기다린다.
 *
 * 건물 하나가 대충 이 정도 크기다. 이 안쪽이면 어느 길목에 붙어도 같은 동네다.
 */
const USABLE_ACCURACY = 50;

/**
 * 현위치. 버튼을 눌러야 켜진다 — 화면 열자마자 권한을 묻지 않는다.
 */
export const useGeolocation = ({ onFirstFix }: Params = {}) => {
  const [here, setHere] = useState<LatLng | null>(null);
  /** 브라우저가 알려 주는 오차 반경(m). 이탈 판정을 여기에 맞춘다. */
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const watchId = useRef<number | null>(null);
  const pending = useRef(false);
  /** 좌표를 한 번이라도 받았는지. 받은 뒤의 실패는 알릴 값어치가 없다. */
  const gotFix = useRef(false);

  /* 콜백은 매 렌더 새로 오므로 최신 것만 들고 간다. */
  const notify = useRef(onFirstFix);
  useEffect(() => {
    notify.current = onFirstFix;
  });

  const stop = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    pending.current = false;
    gotFix.current = false;
    setStatus('idle');
    setHere(null);
    setAccuracy(null);
  }, []);

  const start = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      return;
    }
    setStatus('locating');
    pending.current = true;
    gotFix.current = false;
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const at = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const usable = pos.coords.accuracy <= USABLE_ACCURACY;

        gotFix.current = true;
        setHere(at);
        setAccuracy(pos.coords.accuracy);
        setStatus(usable ? 'ready' : 'coarse');

        /* 출발지로 쓸 만해질 때까지 기다린다. 점은 그동안에도 찍힌다. */
        if (pending.current && usable) {
          pending.current = false;
          notify.current?.(at);
        }
      },
      (err) => {
        /*
         * 권한이 막힌 것만 되돌릴 수 없다. 나머지는 계속 기다린다.
         *
         * 건물 안에서 첫 좌표가 시간 초과되는 일은 흔하고, 그러고 나서 잡히기도
         * 한다. 여기서 기다림을 접어 버리면 그 뒤에 좋은 좌표가 와도 출발지가
         * 비어 있게 된다 — 점은 찍혀 있는데 길찾기는 시작되지 않는 상태다.
         */
        if (err.code === err.PERMISSION_DENIED) {
          pending.current = false;
          setStatus('denied');
          return;
        }
        if (!gotFix.current) setStatus('failed');
      },
      /* 건물 안에서는 첫 좌표가 10초를 넘긴다. 기다림을 넉넉히 준다. */
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 30_000 },
    );
  }, []);

  useEffect(
    () => () => {
      if (watchId.current !== null)
        navigator.geolocation.clearWatch(watchId.current);
    },
    [],
  );

  return { here, accuracy, status, start, stop, active: status !== 'idle' };
};
