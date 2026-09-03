import type { DirectionStep } from '@/routing/directions';
import type { RouteProgress } from '@/routing/progress';
import { offRouteLimit } from '@/routing/progress';
import { formatDuration, formatMeters } from '@/utils/format';
import * as s from './style.css';

interface Simulator {
  playing: boolean;
  finished: boolean;
  speed: number;
  setSpeed: (n: number) => void;
  toggle: () => void;
  reset: () => void;
  ready: boolean;
}

interface Props {
  progress: RouteProgress | null;
  step: DirectionStep | null;
  /** 시뮬레이터가 켜져 있을 때만 넘어온다. */
  simulator: Simulator | null;
  /** 브라우저가 알려 준 GPS 오차 반경(m). 이탈 기준을 여기에 맞춘다. */
  accuracy: number | null;
}

const SPEEDS = [1, 4, 16];

/** 걷는 동안 보이는 줄. 남은 거리·시간과 지금 할 일만 크게 띄운다. */
const Progress = ({ progress, step, simulator, accuracy }: Props) => {
  const lost = progress !== null && progress.offRoute > offRouteLimit(accuracy);

  return (
    <div className={lost ? s.followLost : s.follow}>
      {progress && (
        <>
          <div className={s.followHead}>
            <span className={s.followMetric}>
              {formatDuration(progress.remainingSeconds)}
            </span>
            <span className={s.followSub}>
              {formatMeters(progress.remainingMeters)} 남음
            </span>
            <span
              className={s.followOff}
              title={
                accuracy
                  ? `GPS 오차 반경 ${Math.round(accuracy)}m 를 감안해 판단합니다`
                  : undefined
              }
            >
              경로에서 {formatMeters(progress.offRoute)}
            </span>
          </div>

          {lost ? (
            <p className={s.followNote}>
              경로에서 많이 벗어났습니다. 지도를 보고 되돌아가거나 출발지를 다시
              잡으세요.
            </p>
          ) : (
            step && <p className={s.followStep}>{step.text}</p>
          )}
        </>
      )}

      {!progress && (
        <p className={s.followNote}>
          위치를 기다리는 중입니다. 잡히면 경로 위 어디쯤인지 표시합니다.
        </p>
      )}

      {simulator && (
        <div className={s.simRow}>
          <span className={s.simTag}>시뮬레이션</span>
          <button
            type="button"
            className={s.simButton}
            onClick={simulator.toggle}
            disabled={!simulator.ready}
          >
            {simulator.finished ? '다시' : simulator.playing ? '멈춤' : '걷기'}
          </button>
          {SPEEDS.map((n) => (
            <button
              key={n}
              type="button"
              className={simulator.speed === n ? s.simSpeedOn : s.simSpeed}
              onClick={() => simulator.setSpeed(n)}
            >
              ×{n}
            </button>
          ))}
          <button
            type="button"
            className={s.simButton}
            onClick={simulator.reset}
          >
            처음으로
          </button>
        </div>
      )}
    </div>
  );
};

export default Progress;
