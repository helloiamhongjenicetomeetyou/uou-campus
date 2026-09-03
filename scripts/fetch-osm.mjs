/**
 * 울산대 캠퍼스 구역의 OpenStreetMap 원본을 받아 둔다.
 *
 * 받은 결과는 scripts/osm-campus.json 에 그대로 저장해 저장소에 함께 둔다.
 * 그래야 시드를 다시 돌릴 때 네트워크가 없어도 되고, 무엇을 근거로 좌표가
 * 정해졌는지 나중에도 확인할 수 있다.
 *
 *   node scripts/fetch-osm.mjs
 *
 * 데이터 출처: OpenStreetMap 기여자 (ODbL). 캠퍼스 관계 id 9762419.
 */

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, 'osm-campus.json');

const ENDPOINT = 'https://overpass-api.de/api/interpreter';
/** 울산대학교 multipolygon. https://www.openstreetmap.org/relation/9762419 */
const CAMPUS_RELATION = 9762419;
/** 캠퍼스 경계보다 조금 넓게 — 정문 밖 인도까지 걸리게. */
const BBOX = '35.5395,129.2480,35.5490,129.2625';

const WALKABLE =
  '^(footway|path|steps|pedestrian|service|living_street|unclassified|residential|track|cycleway)$';

const query = `
[out:json][timeout:180];

/* 1. 캠퍼스 경계 */
rel(${CAMPUS_RELATION});
out tags;
way(r:"outer");
out geom;

/* 2. 걸어 다닐 수 있는 길 */
way["highway"~"${WALKABLE}"](${BBOX});
out geom tags;

/* 3. 이름이 붙은 건물 */
(
  way["building"]["name"](${BBOX});
  relation["building"]["name"](${BBOX});
);
out center tags;

/* 4. 출입구·문 */
(
  node["barrier"~"^(gate|entrance|bollard)$"](${BBOX});
  node["entrance"](${BBOX});
);
out tags;
`;

const response = await fetch(ENDPOINT, {
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain;charset=UTF-8',
    /* 오버패스는 정체를 안 밝히는 요청에 406 을 준다. */
    'User-Agent':
      'campus-route/0.1 (+https://github.com/ personal project; UOU campus router)',
    Accept: 'application/json',
  },
  body: query,
});

if (!response.ok) {
  console.error(`오버패스가 ${response.status} 를 돌려줬습니다.`);
  console.error(await response.text().catch(() => ''));
  process.exit(1);
}

const data = await response.json();

const doc = {
  $note:
    'scripts/fetch-osm.mjs 가 받아 둔 OpenStreetMap 원본. 손으로 고치지 말 것. ' +
    '데이터 © OpenStreetMap 기여자, ODbL.',
  fetchedAt: new Date().toISOString().slice(0, 10),
  source: `https://www.openstreetmap.org/relation/${CAMPUS_RELATION}`,
  bbox: BBOX,
  elements: data.elements,
};

writeFileSync(OUT, `${JSON.stringify(doc)}\n`, 'utf-8');

const kinds = new Map();
for (const el of data.elements) {
  const key = el.tags?.highway ? `highway=${el.tags.highway}` : el.type;
  kinds.set(key, (kinds.get(key) ?? 0) + 1);
}
console.log(`${data.elements.length}개 → ${OUT}`);
for (const [key, n] of [...kinds].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${key.padEnd(22)} ${n}`);
}
