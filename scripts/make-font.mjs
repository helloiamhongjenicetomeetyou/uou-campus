/**
 * 본문 글꼴 서브셋 만들기.
 *
 *   node scripts/make-font.mjs
 *
 * Pretendard 가변 글꼴 원본은 2,008 KB 입니다. 첫 방문에 그걸 통째로 받게 두면
 * 느린 회선에서 첫 화면이 12초까지 밀립니다(라이트하우스 실측). 그렇다고 뺄 수도
 * 없습니다 — `-apple-system` 에는 한글 글리프가 없어서, 화면의 한글은 전부 이
 * 글꼴로 떨어집니다.
 *
 * 그래서 **이 앱이 실제로 쓰는 글자만** 남깁니다. 화면에 나오는 말은 소스와
 * 캠퍼스 그래프 안에 다 들어 있으니, 거기 있는 글자를 긁어 모아 자릅니다.
 * 굵기도 400 과 700 만 쓰므로 그 사이로 축을 좁힙니다. 2,008 KB → 105 KB.
 *
 * 글자는 주석까지 통째로 긁습니다. 화면에 안 나오는 글자가 몇 자 섞이지만
 * 몇 KB 차이라, 빠뜨려서 글씨가 바뀌는 쪽보다 낫습니다.
 *
 * 서브셋에 없는 글자는 시스템 한글 글꼴로 떨어집니다. 글씨체가 조금 달라 보일
 * 뿐 깨지지는 않습니다. 편집 모드로 새 이름을 넣어 글자가 늘었다면 이 스크립트를
 * 다시 돌리고, 아래 `OUT` 의 판 번호를 올리세요 — 파일 이름이 그대로면 이미
 * 받아 간 브라우저가 옛 글꼴을 영영 씁니다.
 *
 * fontTools 가 있어야 합니다 (pip install 'fonttools[woff]').
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

/** 원본. 판을 올릴 때는 여기와 `OUT` 을 같이 손봅니다. */
const SOURCE_URL =
  'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/woff2/PretendardVariable.woff2';

/**
 * 내보낼 자리. 이름 끝의 판 번호는 캐시를 끊는 손잡이입니다 —
 * 이 파일은 1년짜리 불변 캐시로 나가므로(vercel.json), 내용이 바뀌면 이름도
 * 바뀌어야 합니다.
 */
const OUT = 'fonts/pretendard-subset-v1.woff2';

/** 화면에 쓰는 굵기. styles/font.ts 가 400 과 700 만 씁니다. */
const WEIGHT = { min: 400, max: 700 };

/** 글자를 긁어 올 곳. 화면에 나오는 말은 여기 안에 다 있습니다. */
const SOURCES = ['src', 'index.html'];

const python = (args) =>
  execFileSync('python3', args, { stdio: ['ignore', 'pipe', 'pipe'] });

/* ── 쓰는 글자 모으기 ─────────────────────────────────────────────────── */

const walk = async (path) => {
  const entries = await readdir(path, { withFileTypes: true }).catch(
    () => null,
  );
  if (!entries) return [path]; /* 파일이다. */
  const found = await Promise.all(entries.map((e) => walk(join(path, e.name))));
  return found.flat();
};

const files = (
  await Promise.all(SOURCES.map((s) => walk(resolve(ROOT, s))))
).flat();

const chars = new Set();
for (const file of files) {
  if (!/\.(ts|tsx|html|json)$/.test(file)) continue;
  for (const ch of readFileSync(file, 'utf-8')) chars.add(ch);
}

/*
 * 소스에 안 적히는 글자를 몇 개 더 얹습니다.
 *
 * 아스키는 통째로 넣습니다 — 거리·시간이 숫자로 만들어지고, 지도 출처 표기처럼
 * 남이 넣는 문자열도 라틴입니다. 몇 KB 안 됩니다.
 */
for (let code = 0x20; code <= 0x7e; code++)
  chars.add(String.fromCharCode(code));
for (const ch of '·—–…±×⇅◎⊕▲▼「」『』') chars.add(ch);

/* 줄바꿈 같은 것은 글리프가 없습니다. */
for (const ch of [...chars]) if (ch.charCodeAt(0) < 0x20) chars.delete(ch);

const hangul = [...chars].filter(
  (c) => c.codePointAt(0) >= 0xac00 && c.codePointAt(0) <= 0xd7a3,
).length;

/* ── 자르기 ───────────────────────────────────────────────────────────── */

const work = mkdtempSync(join(tmpdir(), 'campus-font-'));
const original = join(work, 'original.woff2');
const narrowed = join(work, 'narrowed.woff2');
const text = join(work, 'chars.txt');

console.log(`원본을 받는 중 — ${SOURCE_URL}`);
const response = await fetch(SOURCE_URL);
if (!response.ok) throw new Error(`원본을 못 받았습니다 (${response.status})`);
writeFileSync(original, Buffer.from(await response.arrayBuffer()));

writeFileSync(text, [...chars].sort().join(''), 'utf-8');

console.log(`굵기를 ${WEIGHT.min}~${WEIGHT.max} 로 좁히는 중`);
python([
  '-m',
  'fontTools.varLib.instancer',
  original,
  `wght=${WEIGHT.min}:${WEIGHT.max}`,
  '--output',
  narrowed,
]);

const out = resolve(ROOT, 'public', OUT);
mkdirSync(dirname(out), { recursive: true });

console.log(`글자 ${chars.size}자(한글 ${hangul}자)만 남기는 중`);
python([
  '-m',
  'fontTools.subset',
  narrowed,
  `--text-file=${text}`,
  '--flavor=woff2',
  '--layout-features=*',
  `--output-file=${out}`,
]);

const kb = (path) => (readFileSync(path).length / 1024).toFixed(1);
console.log(`\npublic/${OUT}`);
console.log(`  ${kb(original)} KB → ${kb(out)} KB`);

/*
 * 원본에 아예 없는 글자를 일러 둡니다.
 *
 * pyftsubset 은 달라는 글자가 원본에 없으면 조용히 넘어갑니다. 나중에 '왜 이
 * 글자만 글씨체가 다르지' 하고 서브셋을 의심하지 않도록, 여기서 미리 말해
 * 둡니다. 이런 글자는 서브셋을 안 썼어도 똑같이 시스템 글꼴로 떨어집니다.
 */
const cmap = python([
  '-c',
  'import sys;from fontTools.ttLib import TTFont;' +
    'f=TTFont(sys.argv[1]);' +
    "print(''.join(sorted({chr(c) for t in f['cmap'].tables for c in t.cmap})))",
  original,
]).toString('utf-8');
const absent = [...chars].filter((c) => !cmap.includes(c)).sort();
if (absent.length > 0) {
  console.log(`\n원본에 없어 시스템 글꼴로 떨어지는 글자 ${absent.length}자`);
  console.log(`  ${absent.join('')}`);
}

console.log(`\nglobal.css.ts 가 이 이름을 가리킵니다.`);
