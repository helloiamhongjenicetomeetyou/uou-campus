import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CampusNode } from '@/types/campus';
import { matchesPlace } from '@/utils/place';
import * as s from './style.css';

interface Props {
  label: string;
  places: CampusNode[];
  value: CampusNode | null;
  placeholder?: string;
  onChange: (node: CampusNode | null) => void;
}

const MAX_SUGGESTIONS = 8;

const PlaceField = ({ label, places, value, placeholder, onChange }: Props) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const holder = useRef<HTMLDivElement>(null);
  const listId = useId();

  const suggestions = useMemo(
    () =>
      places.filter((p) => matchesPlace(p, query)).slice(0, MAX_SUGGESTIONS),
    [places, query],
  );

  /* 바깥을 누르면 닫고, 고르다 만 글자는 버린다. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!holder.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const pick = (node: CampusNode) => {
    onChange(node);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      setCursor((c) => {
        const next = e.key === 'ArrowDown' ? c + 1 : c - 1;
        const size = suggestions.length || 1;
        return (next + size) % size;
      });
      return;
    }
    if (e.key === 'Enter' && open && suggestions[cursor]) {
      e.preventDefault();
      pick(suggestions[cursor]);
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div className={s.holder} ref={holder}>
      <span className={s.label}>{label}</span>

      <div className={open ? s.fieldOpen : s.field}>
        <input
          className={s.input}
          value={open ? query : (value?.name ?? '')}
          placeholder={
            value ? value.name : (placeholder ?? '건물 이름이나 번호')
          }
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          onFocus={() => {
            setOpen(true);
            setCursor(0);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setCursor(0);
          }}
          onKeyDown={onKeyDown}
        />
        {value && !open && (
          <button
            type="button"
            className={s.clear}
            aria-label={`${label} 지우기`}
            onClick={() => onChange(null)}
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <ul className={s.list} id={listId} role="listbox">
          {suggestions.length === 0 && (
            <li className={s.empty}>찾는 이름이 없습니다</li>
          )}
          {suggestions.map((node, i) => (
            <li key={node.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === cursor}
                className={i === cursor ? s.optionActive : s.option}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => pick(node)}
                onPointerEnter={() => setCursor(i)}
              >
                <span className={node.no ? s.no : s.noEmpty}>
                  {node.no ?? '·'}
                </span>
                <span className={s.name}>{node.name}</span>
                {node.precision === 'approx' && (
                  <span className={s.approx} title="좌표가 아직 근사치입니다">
                    근사
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PlaceField;
