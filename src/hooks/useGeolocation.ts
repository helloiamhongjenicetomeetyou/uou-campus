import { useCallback, useEffect, useRef, useState } from 'react';
import type { LatLng } from '@/types/campus';

type Status =
  'idle' | 'locating' | 'ready' | 'denied' | 'unsupported' | 'failed';

interface Params {
  /** 켠 뒤 첫 좌표가 잡혔을 때 한 번. 그 뒤 갱신에는 안 부른다. */
  onFirstFix?: (at: LatLng) => void;
}

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
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const at = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setHere(at);
        setAccuracy(pos.coords.accuracy);
        setStatus('ready');
        if (pending.current) {
          pending.current = false;
          notify.current?.(at);
        }
      },
      (err) => {
        pending.current = false;
        setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'failed');
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 10_000 },
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
