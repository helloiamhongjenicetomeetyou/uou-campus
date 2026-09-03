import { useState, type Ref } from 'react';
import type { CampusNode } from '@/types/campus';
import type { CampusGraph } from '@/routing/graph';
import type { Route } from '@/routing/route';
import {
  PROFILE_LABEL,
  type ProfileId,
  type RouteOptions,
} from '@/routing/cost';
import { Chip, chipTrack, PlaceField, Toggle } from '@/components/common';
import type { RouteProgress } from '@/routing/progress';
import { stepAt } from '@/routing/progress';
import { toDirections } from '@/routing/directions';
import Progress from './Progress';
import Summary from './Summary';
import Directions from './Directions';
import * as s from './style.css';

interface Geo {
  active: boolean;
  accuracy: number | null;
  status: string;
  start: () => void;
  stop: () => void;
}

interface Props {
  graph: CampusGraph;
  from: CampusNode | null;
  to: CampusNode | null;
  options: RouteOptions;
  route: Route | null;
  compare: Route | null;
  roadsOnly: Route | null;
  indoorCount: number;
  shortcutCount: number;
  geo: Geo;
  editing: boolean;
  install: { mode: 'none' | 'prompt' | 'ios'; install: () => void };
  /** 걷는 동안의 진행 상황. 위치를 켜지 않았으면 null. */
  progress: RouteProgress | null;
  simulator: React.ComponentProps<typeof Progress>['simulator'];
  /** 지도가 패널에 가린 만큼을 피해 캠퍼스를 맞추려고 크기를 재 간다. */
  panelRef: Ref<HTMLElement>;
  onChangeFrom: (node: CampusNode | null) => void;
  onChangeTo: (node: CampusNode | null) => void;
  onSwap: () => void;
  onChangeOptions: (next: RouteOptions) => void;
  onToggleEdit: () => void;
}

const GEO_MESSAGE: Record<string, string> = {
  locating: '현위치를 찾는 중입니다',
  denied: '위치 권한이 막혀 있습니다',
  unsupported: '이 브라우저는 위치를 못 씁니다',
  failed: '현위치를 못 찾았습니다',
};

const IOS_HINT = '사파리 아래 공유 버튼 → 「홈 화면에 추가」';

/** 시뮬레이터가 흔드는 폭에 맞춘 가짜 오차 반경(m). */
const SIMULATED_ACCURACY = 6;

const RoutePanel = ({
  graph,
  from,
  to,
  options,
  route,
  compare,
  roadsOnly,
  indoorCount,
  shortcutCount,
  geo,
  editing,
  install,
  progress,
  simulator,
  panelRef,
  onChangeFrom,
  onChangeTo,
  onSwap,
  onChangeOptions,
  onToggleEdit,
}: Props) => {
  const [iosHint, setIosHint] = useState(false);

  const set = <K extends keyof RouteOptions>(key: K, value: RouteOptions[K]) =>
    onChangeOptions({ ...options, [key]: value });

  const unreachable = from && to && from.id !== to.id && !route;

  /*
   * 안내문은 여기서 한 번만 만들어 두 군데가 나눠 쓴다. 진행 줄이 '지금 몇 번째
   * 줄인지' 알아야 하는데, 목록과 다른 계산을 쓰면 서로 어긋난다.
   */
  const steps = route ? toDirections(graph, route) : [];
  const stepMeters = steps.map((step) => step.meters);
  const following = Boolean(geo.active || simulator);

  return (
    <aside className={s.panel} ref={panelRef}>
      <header className={s.header}>
        <h1 className={s.title}>울산대 캠퍼스 길찾기</h1>
        <div className={s.headerActions}>
          {install.mode !== 'none' && (
            <button
              type="button"
              className={s.install}
              onClick={() =>
                install.mode === 'prompt'
                  ? install.install()
                  : setIosHint((was) => !was)
              }
              aria-expanded={install.mode === 'ios' ? iosHint : undefined}
            >
              앱 설치
            </button>
          )}
          <button
            type="button"
            className={editing ? s.editOn : s.edit}
            onClick={onToggleEdit}
          >
            {editing ? '편집 끄기' : '편집'}
          </button>
        </div>
      </header>

      {install.mode === 'ios' && iosHint && (
        <p className={s.installHint}>{IOS_HINT}</p>
      )}

      <div className={s.fields}>
        <PlaceField
          label="출발"
          places={graph.places}
          value={from}
          onChange={onChangeFrom}
        />
        <button
          type="button"
          className={s.swap}
          onClick={onSwap}
          aria-label="출발지와 도착지 바꾸기"
          title="출발지와 도착지 바꾸기"
        >
          ⇅
        </button>
        <PlaceField
          label="도착"
          places={graph.places}
          value={to}
          onChange={onChangeTo}
        />
      </div>

      <div className={s.geoRow}>
        <button
          type="button"
          className={geo.active ? s.geoOn : s.geo}
          onClick={geo.active ? geo.stop : geo.start}
        >
          {geo.active ? '현위치 끄기' : '현위치에서 출발'}
        </button>
        {GEO_MESSAGE[geo.status] && (
          <span className={s.geoNote}>{GEO_MESSAGE[geo.status]}</span>
        )}
      </div>

      <div className={s.controls}>
        <div className={chipTrack} role="group" aria-label="경로 기준">
          {(Object.keys(PROFILE_LABEL) as ProfileId[])
            /* 표시된 지름길이 하나도 없으면 그 기준은 아무 일도 안 한다. */
            .filter((id) => id !== 'shortcut' || shortcutCount > 0)
            .map((id) => (
              <Chip
                key={id}
                selected={options.profile === id}
                onClick={() => set('profile', id)}
                title={
                  id === 'shortcut'
                    ? `캠퍼스 안내도에 칠해 둔 지름길 ${shortcutCount}개를 우대해서 찾습니다`
                    : undefined
                }
              >
                {PROFILE_LABEL[id]}
              </Chip>
            ))}
        </div>

        <Toggle
          label="건물 안으로 질러가기"
          hint={
            indoorCount === 0
              ? '아직 등록된 실내 구간이 없습니다 — 편집에서 추가하세요'
              : `등록된 실내 구간 ${indoorCount}개. 문 닫히는 시간엔 꺼 두세요`
          }
          checked={options.allowIndoor}
          disabled={indoorCount === 0}
          onChange={(next) => set('allowIndoor', next)}
        />
      </div>

      <div className={s.result}>
        {route && route.legs.length > 0 && (
          <>
            {following && (
              <Progress
                progress={progress}
                step={
                  progress ? steps[stepAt(stepMeters, progress.along)] : null
                }
                simulator={simulator}
                accuracy={simulator ? SIMULATED_ACCURACY : geo.accuracy}
              />
            )}
            <Summary route={route} compare={compare} roadsOnly={roadsOnly} />
            <Directions route={route} steps={steps} />
          </>
        )}

        {route && route.legs.length === 0 && (
          <p className={s.empty}>출발지와 도착지가 같습니다.</p>
        )}

        {unreachable && (
          <p className={s.warn}>
            이어진 길이 없습니다. 편집 모드에서 두 곳 사이를 잇는 길을 그려
            주세요.
          </p>
        )}
      </div>
    </aside>
  );
};

export default RoutePanel;
