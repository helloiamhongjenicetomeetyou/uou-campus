import { useState } from 'react';
import type {
  CampusEdge,
  CampusGraphDoc,
  CampusNode,
  EdgeSource,
  Surface,
} from '@/types/campus';
import { SURFACE_LABEL } from '@/routing/cost';
import { Toggle } from '@/components/common';
import * as s from './style.css';

interface Props {
  doc: CampusGraphDoc;
  dirty: boolean;
  selectedNode: CampusNode | null;
  selectedEdge: CampusEdge | null;
  linkFrom: CampusNode | null;
  onStartLink: () => void;
  onCancelLink: () => void;
  onUpdateNode: (id: string, patch: Partial<CampusNode>) => void;
  onRemoveNode: (id: string) => void;
  onUpdateEdge: (id: string, patch: Partial<CampusEdge>) => void;
  onRemoveEdge: (id: string) => void;
  onReset: () => void;
  onImport: (doc: CampusGraphDoc) => void;
}

const SOURCE_LABEL: Record<EdgeSource, string> = {
  osm: 'OpenStreetMap 실측',
  assumed: '배치 보고 추정',
  walked: '직접 걸어 봄',
};

const download = (doc: CampusGraphDoc) => {
  const blob = new Blob([`${JSON.stringify(doc, null, 2)}\n`], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'campus.json';
  a.click();
  URL.revokeObjectURL(url);
};

const EditorPanel = ({
  doc,
  dirty,
  selectedNode,
  selectedEdge,
  linkFrom,
  onStartLink,
  onCancelLink,
  onUpdateNode,
  onRemoveNode,
  onUpdateEdge,
  onRemoveEdge,
  onReset,
  onImport,
}: Props) => {
  const [copied, setCopied] = useState(false);

  const approxCount = doc.nodes.filter((n) => n.precision === 'approx').length;

  const copy = async () => {
    await navigator.clipboard.writeText(`${JSON.stringify(doc, null, 2)}\n`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const importFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as CampusGraphDoc;
        if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
          throw new Error('nodes 와 edges 가 있어야 합니다');
        }
        onImport(parsed);
      } catch (err) {
        alert(`읽지 못했습니다: ${(err as Error).message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <aside className={s.panel}>
      <header className={s.header}>
        <h2 className={s.title}>편집</h2>
        <span className={s.count}>
          노드 {doc.nodes.length} · 길 {doc.edges.length}
        </span>
      </header>

      <div className={s.body}>
        <ol className={s.guide}>
          <li>길목은 지도를 확대해야 보입니다.</li>
          <li>표시를 끌어 옮기면 좌표가 맞춰집니다.</li>
          <li>빈 곳을 누르면 길목이 새로 생깁니다.</li>
          <li>
            <button
              type="button"
              className={linkFrom ? s.linkOn : s.link}
              onClick={linkFrom ? onCancelLink : onStartLink}
            >
              {linkFrom
                ? `${linkFrom.name || linkFrom.id} → 이을 곳 선택`
                : '길 잇기'}
            </button>
            {linkFrom && (
              <button
                type="button"
                className={s.linkCancel}
                onClick={onCancelLink}
              >
                취소
              </button>
            )}
          </li>
          <li>선을 누르면 그 길의 속성이 열립니다.</li>
        </ol>

        {selectedNode && (
          <section className={s.section}>
            <h3 className={s.sectionTitle}>
              고른 곳 <span className={s.id}>{selectedNode.id}</span>
            </h3>
            <label className={s.field}>
              <span className={s.fieldLabel}>이름</span>
              <input
                className={s.input}
                value={selectedNode.name}
                placeholder="길목이면 비워 두세요"
                onChange={(e) =>
                  onUpdateNode(selectedNode.id, { name: e.target.value })
                }
              />
            </label>
            <label className={s.field}>
              <span className={s.fieldLabel}>건물 번호</span>
              <input
                className={s.input}
                type="number"
                value={selectedNode.no ?? ''}
                onChange={(e) =>
                  onUpdateNode(selectedNode.id, {
                    no: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </label>
            <p className={s.meta}>
              {selectedNode.lat.toFixed(6)}, {selectedNode.lng.toFixed(6)} ·{' '}
              {selectedNode.precision === 'approx' ? '근사치' : '맞춘 좌표'}
            </p>
            <button
              type="button"
              className={s.danger}
              onClick={() => onRemoveNode(selectedNode.id)}
            >
              이 곳과 연결된 길 지우기
            </button>
          </section>
        )}

        {selectedEdge && (
          <section className={s.section}>
            <h3 className={s.sectionTitle}>
              고른 길 <span className={s.id}>{selectedEdge.id}</span>
            </h3>
            <label className={s.field}>
              <span className={s.fieldLabel}>바닥</span>
              <select
                className={s.input}
                value={selectedEdge.surface}
                onChange={(e) =>
                  onUpdateEdge(selectedEdge.id, {
                    surface: e.target.value as Surface,
                  })
                }
              >
                {Object.entries(SURFACE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className={s.field}>
              <span className={s.fieldLabel}>출처</span>
              <select
                className={s.input}
                value={selectedEdge.source}
                onChange={(e) =>
                  onUpdateEdge(selectedEdge.id, {
                    source: e.target.value as EdgeSource,
                  })
                }
              >
                {Object.entries(SOURCE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <Toggle
              label="지름길"
              checked={selectedEdge.shortcut}
              onChange={(next) =>
                onUpdateEdge(selectedEdge.id, { shortcut: next })
              }
            />
            <Toggle
              label="비를 안 맞는 구간"
              checked={selectedEdge.covered}
              onChange={(next) =>
                onUpdateEdge(selectedEdge.id, { covered: next })
              }
            />
            <button
              type="button"
              className={s.danger}
              onClick={() => onRemoveEdge(selectedEdge.id)}
            >
              이 길 지우기
            </button>
          </section>
        )}

        <section className={s.section}>
          <h3 className={s.sectionTitle}>내보내기</h3>
          <p className={s.meta}>
            {approxCount > 0
              ? `아직 근사치인 좌표가 ${approxCount}개 남았습니다. `
              : '좌표는 전부 실측이거나 직접 맞춘 값입니다. '}
            내보낸 파일로 <code className={s.code}>src/data/campus.json</code>{' '}
            을 덮어쓰면 됩니다.
          </p>
          <div className={s.actions}>
            <button
              type="button"
              className={s.action}
              onClick={() => download(doc)}
            >
              campus.json 받기
            </button>
            <button type="button" className={s.action} onClick={copy}>
              {copied ? '복사했습니다' : '클립보드로'}
            </button>
            <label className={s.action}>
              불러오기
              <input
                type="file"
                accept="application/json"
                className={s.file}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importFile(file);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          {dirty && (
            <button type="button" className={s.danger} onClick={onReset}>
              고친 것 버리고 시드로 되돌리기
            </button>
          )}
        </section>
      </div>
    </aside>
  );
};

export default EditorPanel;
