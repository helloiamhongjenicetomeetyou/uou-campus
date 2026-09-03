import type { Route } from '@/routing/route';
import type { DirectionStep } from '@/routing/directions';
import { arrivalText, turnBrief } from '@/routing/directions';
import type { RouteProgress } from '@/routing/progress';
import { ARRIVED_METERS, offRouteLimit, stepAt } from '@/routing/progress';
import { formatDuration, formatMeters } from '@/utils/format';
import type { Field } from '@/components/PlacePicker';
import * as s from './style.css';

interface Props {
  /** 지도에서 곳을 고르는 중이면 어느 칸을 채우는 중인지. */
  picking: Field | null;
  guiding: boolean;
  route: Route | null;
  steps: DirectionStep[];
  progress: RouteProgress | null;
  /** GPS 오차 반경(m). 이탈 판정을 여기에 맞춘다. */
  accuracy: number | null;
  /** 위치가 왜 안 잡히는지. 기다리는 중과 막힌 것은 다른 말이어야 한다. */
  geoStatus: string;
  onCancelPick: () => void;
  onStopGuide: () => void;
}

const FIELD_LABEL: Record<Field, string> = {
  from: '출발지',
  to: '도착지',
};

/**
 * 위치가 없을 때 뭐라고 할지.
 *
 * 권한이 막혔는데 '기다리는 중' 이라고 해 두면 사람은 계속 기다린다. 안 될
 * 이유를 알면 고칠 수 있다.
 */
const NO_FIX: Record<string, { brief: string; detail: string }> = {
  denied: {
    brief: '위치 권한이 막혀 있습니다',
    detail: '브라우저 설정에서 이 사이트의 위치를 허용하면 따라갑니다.',
  },
  unsupported: {
    brief: '이 브라우저는 위치를 못 씁니다',
    detail: '경로와 안내 목록은 그대로 볼 수 있습니다.',
  },
  failed: {
    brief: '현위치를 못 찾았습니다',
    detail: '건물 안이면 창가나 밖으로 나가면 잡힙니다.',
  },
};

const WAITING = {
  brief: '위치를 기다리는 중',
  detail: '위치가 잡히면 여기서부터 안내합니다. 실내에서는 조금 걸립니다.',
};

/**
 * 지도 위 상단 띠.
 *
 * 걷는 중에는 다음에 할 동작 하나만 크게 띄운다 — 걸으면서 읽는 글은 한 줄이
 * 넘어가면 안 읽힌다. 자세한 문장과 남은 목록은 아래 패널에 그대로 있다.
 */
const TopBar = ({
  picking,
  guiding,
  route,
  steps,
  progress,
  accuracy,
  geoStatus,
  onCancelPick,
  onStopGuide,
}: Props) => {
  if (picking) {
    return (
      <div className={s.pick}>
        <div className={s.head}>
          <span className={s.pickText}>
            지도에서 {FIELD_LABEL[picking]}를 고르세요
          </span>
          <button type="button" className={s.stop} onClick={onCancelPick}>
            취소
          </button>
        </div>
        <span className={s.pickNote}>
          건물을 누르거나, 그 근처를 대충 눌러도 가장 가까운 곳이 잡힙니다.
        </span>
      </div>
    );
  }

  if (!guiding || !route) return null;

  const lost = progress !== null && progress.offRoute > offRouteLimit(accuracy);
  const arrived =
    progress !== null && progress.remainingMeters <= ARRIVED_METERS;

  /* 지금 몇 번째 줄을 걷는 중인지. 목록과 같은 계산을 써야 서로 안 어긋난다. */
  const stepMeters = steps.map((step) => step.meters);
  const index = progress ? stepAt(stepMeters, progress.along) : 0;
  const next = steps[index + 1] ?? null;

  /* 이번 줄이 끝나는 자리까지 남은 거리 — 그게 다음에 꺾는 자리다. */
  const untilTurn = progress
    ? Math.max(
        0,
        stepMeters.slice(0, index + 1).reduce((a, b) => a + b, 0) -
          progress.along,
      )
    : null;

  /* 위치가 없을 때 할 말. 있으면 안 쓰인다. */
  const noFix = NO_FIX[geoStatus] ?? WAITING;

  const headline = () => {
    if (!progress) return { until: '···', brief: noFix.brief };
    if (arrived) return { until: '도착', brief: arrivalText(route.to) };
    if (next && untilTurn !== null) {
      return { until: `${formatMeters(untilTurn)} 뒤`, brief: turnBrief(next) };
    }
    return {
      until: formatMeters(progress.remainingMeters),
      brief: `곧 ${route.to.name}`,
    };
  };

  const { until, brief } = headline();
  const detail = progress && !arrived ? (next ?? steps[index])?.text : null;

  return (
    <div className={lost && !arrived ? s.lost : s.guide}>
      <div className={s.head}>
        <span className={s.until}>{until}</span>
        <span className={s.brief}>{brief}</span>
        <button type="button" className={s.stop} onClick={onStopGuide}>
          {arrived ? '끝내기' : '안내 종료'}
        </button>
      </div>

      {lost && !arrived ? (
        <p className={s.warnText}>
          경로에서 {progress && formatMeters(progress.offRoute)} 벗어났습니다.
        </p>
      ) : (
        detail && <p className={s.detail}>{detail}</p>
      )}

      {progress && !arrived && (
        <div className={s.rest}>
          <span className={s.restValue}>
            {formatDuration(progress.remainingSeconds)}
          </span>
          <span className={s.restValue}>
            {formatMeters(progress.remainingMeters)}
          </span>
          <span className={s.restNote}>남음</span>
        </div>
      )}

      {!progress && <p className={s.detail}>{noFix.detail}</p>}
    </div>
  );
};

export default TopBar;
