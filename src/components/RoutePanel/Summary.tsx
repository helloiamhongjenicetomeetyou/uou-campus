import type { Route } from '@/routing/route';
import { PROFILE_LABEL } from '@/routing/cost';
import { formatDelta, formatDuration, formatMeters } from '@/utils/format';
import { josaRo } from '@/utils/korean';
import * as s from './style.css';

interface Props {
  route: Route;
  /** 다른 기준으로 잡았을 때의 경로. 같은 길이면 null 이 온다. */
  compare: Route | null;
  /** 차도만 따라 돌았을 때의 기준선. */
  roadsOnly: Route | null;
}

/** 이 정도는 벌어져야 알려 줄 값어치가 있다. */
const WORTH_SAYING_SECONDS = 20;
const WORTH_SAYING_METERS = 30;

const Summary = ({ route, compare, roadsOnly }: Props) => {
  const stats: { label: string; value: string }[] = [];

  if (route.footMeters > 0) {
    stats.push({ label: '보행로·계단', value: formatMeters(route.footMeters) });
  }
  if (route.stairsMeters > 0) {
    stats.push({ label: '계단', value: formatMeters(route.stairsMeters) });
  }
  if (route.shortcutMeters > 0) {
    stats.push({
      label: '표시한 지름길',
      value: formatMeters(route.shortcutMeters),
    });
  }
  if (route.indoorMeters > 0) {
    stats.push({ label: '건물 안', value: formatMeters(route.indoorMeters) });
  }

  /* 큰길만 따라 돌면 얼마나 손해인지. 이게 이 경로의 '지름길 이득'이다. */
  const saved = roadsOnly && {
    seconds: roadsOnly.seconds - route.seconds,
    meters: roadsOnly.meters - route.meters,
  };
  const worthIt =
    saved &&
    route.footMeters > 0 &&
    (saved.seconds > WORTH_SAYING_SECONDS ||
      saved.meters > WORTH_SAYING_METERS);

  return (
    <div className={s.summary}>
      <div className={s.headline}>
        <span className={s.metric}>{formatDuration(route.seconds)}</span>
        <span className={s.metricSub}>{formatMeters(route.meters)}</span>
      </div>

      {stats.length > 0 && (
        <ul className={s.stats}>
          {stats.map((stat) => (
            <li key={stat.label} className={s.stat}>
              <span className={s.statLabel}>{stat.label}</span>
              <span className={s.statValue}>{stat.value}</span>
            </li>
          ))}
        </ul>
      )}

      {worthIt && (
        <p className={s.saved}>
          큰길로만 돌아가면 <strong>{formatDuration(roadsOnly.seconds)}</strong>{' '}
          걸립니다. 보행로와 계단을 타서{' '}
          <strong>{formatDuration(saved.seconds)}</strong> ·{' '}
          <strong>{formatMeters(saved.meters)}</strong> 를 벌었습니다.
        </p>
      )}

      {roadsOnly === null && route.footMeters > 0 && (
        <p className={s.savedFlat}>
          견줄 만한 차도 경로를 못 찾았습니다 — 출발지나 도착지 언저리가
          보행로로만 이어져 있습니다.
        </p>
      )}

      {compare && (
        <p className={s.compare}>
          <span className={s.compareDot} aria-hidden />
          {/* flex 컨테이너라 맨 텍스트를 두면 gap 이 낱말 사이로 끼어든다. */}
          <span className={s.compareText}>
            <strong>{PROFILE_LABEL[compare.options.profile]}</strong>
            {josaRo(PROFILE_LABEL[compare.options.profile])} 가면{' '}
            {formatDelta(compare.meters, route.meters, formatMeters)} ·{' '}
            {formatDelta(compare.seconds, route.seconds, formatDuration)}
          </span>
          <span className={s.compareHint}>
            지도에 주황 점선으로 겹쳐 뒀습니다
          </span>
        </p>
      )}
    </div>
  );
};

export default Summary;
