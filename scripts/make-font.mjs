/**
 * 본문 글꼴 서브셋 만들기.
 *
 *   node scripts/make-font.mjs      (빌드 전에 저절로 돕니다 — package.json 의 prebuild)
 *
 * Pretendard 가변 글꼴 원본은 2,008 KB 입니다. 첫 방문에 그걸 통째로 받게 두면
 * 느린 회선에서 글꼴이 도착하는 데 10초가 걸립니다. 그렇다고 뺄 수도 없습니다 —
 * `-apple-system` 과 `system-ui` 에는 한글 글리프가 없어서, 화면의 한글은 전부
 * 이 글꼴로 떨어집니다.
 *
 * 그래서 **이 앱이 실제로 쓰는 글자만** 남깁니다. 화면에 나오는 말은 소스와
 * 캠퍼스 그래프 안에 다 있으니, 거기 있는 글자를 긁어 모아 자릅니다. 굵기도
 * 400 과 700 만 쓰므로 그 사이로 축을 좁힙니다. 2,008 KB → 105 KB.
 *
 * 유니코드 범위로 조각내는 '동적 서브셋' 은 안 씁니다. 라틴이라면 조각 몇 개로
 * 끝나지만, 한글은 자주 쓰는 글자가 코드 순서와 무관하게 흩어져 있어 짧은 문장
 * 하나가 조각 여럿에 걸칩니다. 요청이 열 번으로 늘고, 조각을 가리키는 @font-face
 * 92 개짜리 CSS(49 KB)가 렌더링까지 막습니다.
 *
 * 빌드마다 다시 뽑습니다. 편집 모드에서 「모두에게 저장」을 누르면 새 이름이
 * campus.json 으로 들어가고 곧바로 재배포되는데, 그때 서브셋이 옛 글자만 들고
 * 있으면 새로 넣은 건물 이름만 글씨체가 다르게 나옵니다.
 *
 * 같은 입력이면 같은 파일이 나오므로(확인함), 글자가 안 바뀌었는데 커밋할 것이
 * 생기지는 않습니다.
 */

import subsetFont from 'subset-font';
import * as fontkit from 'fontkit';
import { readFileSync, writeFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

/** 원본. 내려받지 않고 의존성에서 꺼내 쓴다 — 빌드가 남의 CDN 을 안 탄다. */
const SOURCE = resolve(
  ROOT,
  'node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2',
);

/**
 * 내보낼 자리.
 *
 * public/ 이 아니라 src/ 다. 이러면 Vite 가 이름에 해시를 붙여 /assets/ 로
 * 내보내므로, 내용이 바뀌면 이름이 저절로 바뀐다 — 캐시를 끊으려고 사람이
 * 판 번호를 올릴 일이 없다. 서비스 워커의 /assets/ 규칙도 그대로 걸린다.
 */
const OUT = resolve(ROOT, 'src/styles/pretendard-subset.woff2');

/** 화면에 쓰는 굵기. styles/font.ts 가 400 과 700 만 쓴다. */
const WEIGHT = { min: 400, max: 700 };

/** 글자를 긁어 올 곳. 화면에 나오는 말은 여기 안에 다 있다. */
const SOURCES = ['src', 'index.html'];

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
  /* 글꼴 파일 자신도 src 안에 있다. 글자가 든 파일만 읽는다. */
  if (!/\.(ts|tsx|html|json)$/.test(file)) continue;
  for (const ch of readFileSync(file, 'utf-8')) chars.add(ch);
}

/*
 * 소스에 안 적히는 글자를 몇 개 더 얹는다. 아스키는 통째로 — 거리·시간이 숫자로
 * 만들어지고, 지도 출처 표기처럼 남이 넣는 문자열도 라틴이다. 몇 KB 안 된다.
 *
 * 주석에 쓴 글자까지 딸려 들어오지만 그냥 둔다. 빠뜨려서 글씨체가 바뀌는 쪽보다
 * 몇 KB 를 더 내는 쪽이 낫다.
 */
for (let code = 0x20; code <= 0x7e; code++)
  chars.add(String.fromCharCode(code));
for (const ch of '·—–…±×⇅◎⊕「」『』') chars.add(ch);
for (const ch of [...chars]) if (ch.codePointAt(0) < 0x20) chars.delete(ch);

const text = [...chars].sort().join('');
const hangul = [...chars].filter(
  (c) => c.codePointAt(0) >= 0xac00 && c.codePointAt(0) <= 0xd7a3,
).length;

/* ── 자르기 ───────────────────────────────────────────────────────────── */

const original = readFileSync(SOURCE);
const subset = await subsetFont(original, text, {
  targetFormat: 'woff2',
  variationAxes: { wght: WEIGHT },
});
writeFileSync(OUT, subset);

const kb = (bytes) => (bytes.length / 1024).toFixed(1);
console.log(`${relative(ROOT, OUT)}`);
console.log(`  글자 ${chars.size}자(한글 ${hangul}자)`);
console.log(`  ${kb(original)} KB → ${kb(subset)} KB`);

/*
 * 원본에 아예 없는 글자를 일러 둔다.
 *
 * 서브셋 도구는 달라는 글자가 원본에 없으면 조용히 넘어간다. 나중에 '왜 이
 * 글자만 글씨체가 다르지' 하고 서브셋을 의심하지 않도록 미리 말해 둔다. 이런
 * 글자는 서브셋을 안 썼어도 똑같이 시스템 글꼴로 떨어진다.
 *
 * 크기로 어림하면 안 된다 — 획이 적은 글자는 있어도 작게 나와서, '드·르·마'
 * 처럼 멀쩡한 글자가 없다고 잡힌다. 글꼴의 cmap 을 직접 본다.
 */
const cmap = fontkit.create(original);
const absent = [...chars]
  .filter((ch) => !cmap.hasGlyphForCodePoint(ch.codePointAt(0)))
  .sort();

if (absent.length > 0) {
  console.log(`\n원본에 없어 시스템 글꼴로 떨어지는 글자 ${absent.length}자`);
  console.log(`  ${absent.join('')}`);
}
