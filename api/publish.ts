/**
 * 고친 지도를 모두에게 내보내는 자리.
 *
 * 앱은 받아 주는 서버 없이 도는 정적 파일이라, 편집 모드에서 고친 것은 고친
 * 사람 브라우저에만 남았다. 이 함수가 그 사본을 저장소의 campus.json 으로
 * 커밋하면 Vercel 이 다시 배포하고, 그때부터 모두가 같은 지도를 본다.
 *
 * 저장 자리를 깃으로 잡은 이유는 이력 때문이다. 누가 언제 뭘 고쳤는지가 커밋으로
 * 남고, 잘못 올렸을 때 되돌리는 것도 git revert 한 줄이다. 따로 만들 게 없다.
 *
 * 필요한 환경변수 (셋 다 서버에서만 읽는다 — VITE_ 를 붙이면 안 된다):
 *   EDIT_PASSWORD  저장할 때 물어보는 암호
 *   GITHUB_TOKEN   Contents 쓰기 권한이 있는 이 저장소용 토큰
 *   GITHUB_REPO    'owner/repo'. 없으면 아래 기본값
 */

const REPO =
  process.env.GITHUB_REPO ?? 'helloiamhongjenicetomeetyou/uou-campus-route';
const BRANCH = process.env.GITHUB_BRANCH ?? 'main';
const FILE = 'src/data/campus.json';

/*
 * 통째로 덮어쓰는 자리라 들어오는 값을 믿으면 안 된다. 실수로 빈 문서를 올리면
 * 캠퍼스가 통째로 사라진 채 배포된다. 되돌릴 수는 있지만, 애초에 막는 게 낫다.
 */
const MIN_NODES = 50;
const MIN_EDGES = 50;
const MAX_NODES = 20_000;
const MAX_BYTES = 4_000_000;

/** 울산대 캠퍼스를 넉넉히 둘러싼 상자. 이 밖의 좌표는 실수로 들어온 값이다. */
const BOUNDS = { lat: [35.535, 35.555], lng: [129.243, 129.267] } as const;

interface Node {
  id?: unknown;
  lat?: unknown;
  lng?: unknown;
}

interface Edge {
  id?: unknown;
  from?: unknown;
  to?: unknown;
}

interface Doc {
  nodes?: unknown;
  edges?: unknown;
}

const inRange = (value: unknown, [min, max]: readonly [number, number]) =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max;

/** 문제가 있으면 그 까닭을, 없으면 null 을 준다. */
export const checkDoc = (doc: unknown): string | null => {
  if (!doc || typeof doc !== 'object') return '문서가 아닙니다';

  const { nodes, edges } = doc as Doc;
  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return 'nodes 와 edges 가 배열이어야 합니다';
  }
  if (nodes.length < MIN_NODES || edges.length < MIN_EDGES) {
    return `너무 적습니다 (노드 ${nodes.length}, 간선 ${edges.length}). 실수로 지운 게 아닌지 보세요`;
  }
  if (nodes.length > MAX_NODES) return '노드가 너무 많습니다';

  const ids = new Set<string>();
  for (const node of nodes as Node[]) {
    if (typeof node?.id !== 'string' || !node.id)
      return 'id 가 없는 노드가 있습니다';
    if (ids.has(node.id)) return `id 가 겹칩니다: ${node.id}`;
    ids.add(node.id);
    if (!inRange(node.lat, BOUNDS.lat) || !inRange(node.lng, BOUNDS.lng)) {
      return `캠퍼스 밖 좌표입니다: ${node.id}`;
    }
  }

  for (const edge of edges as Edge[]) {
    if (typeof edge?.id !== 'string' || !edge.id)
      return 'id 가 없는 간선이 있습니다';
    if (typeof edge.from !== 'string' || !ids.has(edge.from)) {
      return `없는 곳을 가리키는 간선입니다: ${edge.id}`;
    }
    if (typeof edge.to !== 'string' || !ids.has(edge.to)) {
      return `없는 곳을 가리키는 간선입니다: ${edge.id}`;
    }
  }

  return null;
};

/**
 * 길이가 달라도 같은 시간을 쓰게 맞춰 비교한다.
 * 빨리 틀리는 자리가 어디인지로 암호를 한 글자씩 알아내는 짓을 막는다.
 */
const sameSecret = (a: string, b: string) => {
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < length; i += 1) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
};

const github = async (path: string, init: RequestInit = {}) =>
  fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'uou-campus-route',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });

interface Req {
  method?: string;
  body?: unknown;
}

interface Res {
  status: (code: number) => Res;
  json: (data: unknown) => void;
}

const handler = async (req: Req, res: Res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST 로 보내세요' });
    return;
  }

  const secret = process.env.EDIT_PASSWORD;
  const token = process.env.GITHUB_TOKEN;
  if (!secret || !token) {
    res.status(503).json({ error: '이 서버에는 저장이 설정돼 있지 않습니다' });
    return;
  }

  const body = (
    typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  ) as {
    password?: unknown;
    doc?: unknown;
    note?: unknown;
  } | null;

  if (
    !body ||
    typeof body.password !== 'string' ||
    !sameSecret(body.password, secret)
  ) {
    /* 왜 틀렸는지는 알려 주지 않는다. */
    res.status(401).json({ error: '암호가 다릅니다' });
    return;
  }

  const text = `${JSON.stringify(body.doc, null, 2)}\n`;
  if (text.length > MAX_BYTES) {
    res.status(413).json({ error: '문서가 너무 큽니다' });
    return;
  }

  const wrong = checkDoc(body.doc);
  if (wrong) {
    res.status(400).json({ error: wrong });
    return;
  }

  /* 지금 올라가 있는 파일의 sha 가 있어야 덮어쓸 수 있다. */
  const current = await github(
    `/repos/${REPO}/contents/${FILE}?ref=${encodeURIComponent(BRANCH)}`,
  );
  if (!current.ok) {
    res
      .status(502)
      .json({ error: `저장소를 못 읽었습니다 (${current.status})` });
    return;
  }
  const { sha } = (await current.json()) as { sha: string };

  const doc = body.doc as { nodes: unknown[]; edges: unknown[] };
  const note =
    typeof body.note === 'string' && body.note.trim() ? body.note.trim() : '';
  const message = [
    `지도를 고친다 (노드 ${doc.nodes.length} · 간선 ${doc.edges.length})`,
    '',
    note || '앱의 편집 모드에서 저장했다.',
  ].join('\n');

  const put = await github(`/repos/${REPO}/contents/${FILE}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: Buffer.from(text, 'utf8').toString('base64'),
      sha,
      branch: BRANCH,
    }),
  });

  if (!put.ok) {
    const detail = (await put.json().catch(() => null)) as {
      message?: string;
    } | null;
    res.status(502).json({
      error:
        `커밋에 실패했습니다 (${put.status}) ${detail?.message ?? ''}`.trim(),
    });
    return;
  }

  const saved = (await put.json()) as { commit?: { sha?: string } };
  res.status(200).json({
    ok: true,
    sha: saved.commit?.sha?.slice(0, 7) ?? null,
    nodes: doc.nodes.length,
    edges: doc.edges.length,
  });
};

export default handler;
