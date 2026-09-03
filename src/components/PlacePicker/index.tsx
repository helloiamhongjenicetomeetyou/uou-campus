import { useEffect, useMemo, useState } from 'react';
import type { CampusNode, LatLng, NodeKind } from '@/types/campus';
import { distance } from '@/routing/geo';
import { formatMeters } from '@/utils/format';
import { matchesPlace } from '@/utils/place';
import * as s from './style.css';

export type Field = 'from' | 'to';

interface Props {
  field: Field;
  places: CampusNode[];
  value: CampusNode | null;
  /** 반대편 칸에 이미 들어가 있는 곳. 같은 곳끼리는 경로가 없다. */
  taken: CampusNode | null;
  /** 현위치. 잡혀 있으면 각 줄에 여기서 얼마나 먼지 적어 준다. */
  here: LatLng | null;
  /** 현위치가 어떤 상태인지. 눌러도 되는지와 옆에 적을 말이 여기서 갈린다. */
  geoStatus: string;
  onPick: (node: CampusNode) => void;
  onUseHere: () => void;
  onPickOnMap: () => void;
  onClose: () => void;
}

const FIELD_LABEL: Record<Field, string> = {
  from: '출발지',
  to: '도착지',
};

const GROUP_LABEL: Record<NodeKind, string> = {
  building: '건물',
  place: '시설',
  gate: '출입문',
  junction: '길목',
};

/** 목록에 세우는 순서. 건물이 먼저, 문은 맨 뒤. */
const GROUP_ORDER: NodeKind[] = ['building', 'place', 'gate', 'junction'];

/**
 * '현위치에서 출발' 줄에 적을 말.
 *
 * 한 번 켜면 다시 누를 일이 없어 대부분 눌리지 않는 상태다. 그래도 왜 못 누르는지는
 * 적어 둔다 — 권한이 막힌 것과 켜져 있는 것은 사람이 할 일이 다르다.
 */
const GEO_NOTE: Record<string, string> = {
  idle: '위치 권한 필요',
  locating: '찾는 중',
  ready: '켜져 있음',
  denied: '권한이 막혀 있습니다',
  unsupported: '이 브라우저는 못 씁니다',
  failed: '못 찾았습니다 — 다시',
};

/** 다시 눌러 볼 만한 상태. 켜져 있거나 찾는 중이면 누를 일이 없다. */
const GEO_RETRY = new Set(['idle', 'failed']);

/**
 * 장소를 고르는 전체 화면.
 *
 * 폰에서만 뜬다. 넓은 화면에서는 칸 밑에 붙는 드롭다운(PlaceField)이 더 빠르다.
 */
const PlacePicker = ({
  field,
  places,
  value,
  taken,
  here,
  geoStatus,
  onPick,
  onUseHere,
  onPickOnMap,
  onClose,
}: Props) => {
  const [query, setQuery] = useState('');

  /* 뒤로 가기나 Esc 로 빠져나올 수 있어야 한다. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const hits = useMemo(
    () => places.filter((p) => matchesPlace(p, query)),
    [places, query],
  );

  /* 이름을 그대로 옮겨 둔 별칭이 있다. 같은 말을 두 줄로 적을 이유는 없다. */
  const aliasesOf = (node: CampusNode) =>
    (node.aliases ?? []).filter((alias) => alias !== node.name);

  /* 검색 중에는 묶지 않고 걸린 순서대로 쭉 보여 준다. */
  const groups = useMemo(() => {
    if (query.trim()) return [{ kind: null, items: hits }];
    return GROUP_ORDER.map((kind) => ({
      kind,
      items: hits.filter((p) => p.kind === kind),
    })).filter((g) => g.items.length > 0);
  }, [hits, query]);

  return (
    <div
      className={s.sheet}
      role="dialog"
      aria-modal="true"
      aria-label={`${FIELD_LABEL[field]} 선택`}
    >
      <header className={s.head}>
        <h2 className={s.title}>{FIELD_LABEL[field]} 선택</h2>
        <button
          type="button"
          className={s.close}
          onClick={onClose}
          aria-label="닫기"
        >
          ×
        </button>
      </header>

      <div className={s.searchRow}>
        <input
          className={s.search}
          value={query}
          /* 열자마자 키보드가 올라오면 목록이 반으로 줄어든다. 눌러야 뜨게 둔다. */
          placeholder="건물 이름이나 번호"
          inputMode="search"
          enterKeyHint="search"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className={s.quick}>
        {field === 'from' && (
          <button
            type="button"
            className={s.quickRow}
            onClick={onUseHere}
            disabled={!GEO_RETRY.has(geoStatus)}
          >
            <span className={s.quickMark} aria-hidden>
              ◎
            </span>
            <span className={s.quickText}>현위치에서 출발</span>
            <span className={s.quickNote}>
              {GEO_NOTE[geoStatus] ?? '위치 권한 필요'}
            </span>
          </button>
        )}

        <button type="button" className={s.quickRow} onClick={onPickOnMap}>
          <span className={s.quickMark} aria-hidden>
            ⊕
          </span>
          <span className={s.quickText}>지도에서 고르기</span>
          <span className={s.quickNote}>지도만 크게 보기</span>
        </button>
      </div>

      <div className={s.list}>
        {hits.length === 0 && <p className={s.empty}>찾는 이름이 없습니다.</p>}

        {groups.map((group) => (
          <section key={group.kind ?? 'hits'}>
            {group.kind && (
              <h3 className={s.group}>{GROUP_LABEL[group.kind]}</h3>
            )}
            <ul>
              {group.items.map((node) => {
                const isTaken = taken?.id === node.id;
                return (
                  <li key={node.id}>
                    <button
                      type="button"
                      className={
                        isTaken
                          ? s.rowTaken
                          : value?.id === node.id
                            ? s.rowOn
                            : s.row
                      }
                      disabled={isTaken}
                      onClick={() => onPick(node)}
                    >
                      <span className={node.no ? s.no : s.noEmpty}>
                        {node.no ?? '·'}
                      </span>
                      <span className={s.body}>
                        <span className={s.name}>{node.name}</span>
                        {aliasesOf(node).length > 0 && (
                          <span className={s.aliases}>
                            {aliasesOf(node).join(' · ')}
                          </span>
                        )}
                      </span>
                      {node.precision === 'approx' && (
                        <span className={s.tag}>근사</span>
                      )}
                      {here && (
                        <span className={s.here}>
                          {formatMeters(distance(here, node))}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
};

export default PlacePicker;
