import { useState } from 'react';
import type {
  CampusEdge,
  CampusGraphDoc,
  CampusNode,
  EdgeSource,
  NodeKind,
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

/**
 * 지도에서 만든 지점은 길목으로 태어난다. 여기서 종류를 올려야 이름 있는 곳이 된다.
 *
 * 길목만 장소 목록에서 빠진다 (routing/graph.ts 의 places). 그래서 건물 출입구를
 * 찍어 놓고 종류를 그대로 두면, 이름을 넣어도 검색에도 목록에도 안 나오고 평소
 * 지도에서도 안 보인다 — 찍어 둔 사람만 아는 점이 된다.
 */
const KIND_LABEL: Record<NodeKind, string> = {
  building: '건물',
  place: '시설',
  gate: '출입문',
  junction: '길목 (목록에 안 나옴)',
};

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

interface Said {
  ok: boolean;
  text: string;
}

/**
 * 고친 지도를 모두에게 내보낸다.
 *
 * 편집한 내용은 고친 사람 브라우저에만 남는다. 이걸 눌러야 저장소에 커밋되고,
 * 다시 배포되고, 그때부터 모두가 같은 지도를 본다. 암호는 서버가 가지고 있고
 * 여기서는 그저 실어 보낸다.
 */
const publishDoc = async (
  doc: CampusGraphDoc,
  password: string,
  note: string,
): Promise<Said> => {
  let res: Response;
  try {
    res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, note, doc }),
    });
  } catch {
    return { ok: false, text: '서버에 닿지 못했습니다. 연결을 확인하세요.' };
  }

  /* 개발 서버에는 이 함수가 없다. 되돌림 규칙에 걸려 index.html 이 온다. */
  if (!res.headers.get('content-type')?.includes('application/json')) {
    return {
      ok: false,
      text: '이 환경에는 저장 기능이 없습니다 (개발 서버). 배포본에서 하세요.',
    };
  }

  const data = (await res.json().catch(() => null)) as {
    error?: string;
    sha?: string;
  } | null;

  if (!res.ok) {
    return {
      ok: false,
      text: data?.error ?? `저장하지 못했습니다 (${res.status})`,
    };
  }
  return {
    ok: true,
    text: `저장했습니다${data?.sha ? ` (${data.sha})` : ''}. 배포가 끝나는 1분쯤 뒤부터 모두에게 보입니다.`,
  };
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

  const [password, setPassword] = useState('');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [said, setSaid] = useState<Said | null>(null);

  /** 고른 곳에 붙어 있는 길의 수. 0 이면 길찾기에 안 잡힌다. */
  const linkCount = selectedNode
    ? doc.edges.filter(
        (e) => e.from === selectedNode.id || e.to === selectedNode.id,
      ).length
    : 0;

  const publish = async () => {
    setSending(true);
    setSaid(null);
    const result = await publishDoc(doc, password, note);
    setSaid(result);
    setSending(false);
    /* 성공했으면 암호를 화면에 남겨 둘 이유가 없다. */
    if (result.ok) {
      setPassword('');
      setNote('');
    }
  };

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
          <li>
            빈 곳을 누르면 <strong>길목</strong>이 생깁니다. 종류를 바꾸면
            출입문·건물이 됩니다.
          </li>
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
              <span className={s.fieldLabel}>종류</span>
              <select
                className={s.input}
                value={selectedNode.kind}
                onChange={(e) => {
                  const kind = e.target.value as NodeKind;
                  const patch: Partial<CampusNode> = { kind };
                  /*
                   * 길목에서 이름 있는 곳으로 올릴 때 이름이 비어 있으면 채워 준다.
                   * 빈 이름으로 목록에 오르면 고를 수 없는 빈 줄이 하나 생긴다.
                   */
                  if (kind !== 'junction' && !selectedNode.name.trim()) {
                    patch.name = '이름 없는 곳';
                  }
                  onUpdateNode(selectedNode.id, patch);
                }}
              >
                {Object.entries(KIND_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
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
            <div className={s.field}>
              <span className={s.fieldLabel}>좌표</span>
              <span className={s.coord}>
                {selectedNode.lat.toFixed(6)}, {selectedNode.lng.toFixed(6)}
              </span>
              <button
                type="button"
                className={
                  selectedNode.precision === 'approx' ? s.approxOn : s.action
                }
                title="안내도만 보고 찍은 자리라면 근사치로 표시해 두세요"
                onClick={() =>
                  onUpdateNode(selectedNode.id, {
                    precision:
                      selectedNode.precision === 'approx'
                        ? 'surveyed'
                        : 'approx',
                  })
                }
              >
                {selectedNode.precision === 'approx' ? '근사치' : '맞춘 좌표'}
              </button>
            </div>
            {/*
              길에 안 이어진 곳은 목록에는 떠도 길찾기가 안 된다 — 도착지로
              고르면 '이어진 길이 없습니다' 가 나온다. 찍어 두고 잇는 걸 잊기
              쉬워서, 고른 그 자리에서 말해 준다.
            */}
            {linkCount === 0 && (
              <p className={s.caution}>
                아직 어떤 길과도 이어져 있지 않습니다. 「길 잇기」로 가까운
                보행로와 이어야 길찾기에 나옵니다.
              </p>
            )}
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
          <h3 className={s.sectionTitle}>모두에게 저장</h3>
          <p className={s.meta}>
            저장소에 커밋하고 다시 배포합니다. 그때부터 다른 사람 화면에도 이
            지도가 나옵니다. 되돌리려면 커밋 하나를 되돌리면 됩니다.
          </p>
          <label className={s.field}>
            <span className={s.fieldLabel}>암호</span>
            <input
              className={s.input}
              type="password"
              value={password}
              autoComplete="off"
              placeholder="저장할 사람만 아는 값"
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className={s.field}>
            <span className={s.fieldLabel}>메모</span>
            <input
              className={s.input}
              value={note}
              placeholder="무엇을 고쳤는지 — 커밋에 남습니다"
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className={s.actions}>
            <button
              type="button"
              className={s.action}
              disabled={sending || password.length === 0}
              onClick={publish}
            >
              {sending ? '보내는 중…' : '모두에게 저장'}
            </button>
          </div>
          {said && <p className={said.ok ? s.said : s.saidBad}>{said.text}</p>}
        </section>

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
