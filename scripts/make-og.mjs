/**
 * 링크 미리보기 그림(Open Graph) 만들기.
 *
 *   node scripts/make-og.mjs
 *
 * 카톡·에타·슬랙에 주소를 붙이면 뜨는 1200×630 그림입니다. 글로 설명하기 전에
 * 그림 한 장이 먼저 도착하는 자리라, 앱을 열었을 때와 같은 것이 보여야 합니다 —
 * 같은 초록, 같은 글꼴, 지도에 그려지는 것과 같은 모양의 경로.
 *
 * 아이콘과 같은 길을 씁니다. SVG 를 만들어 rsvg-convert 로 굽습니다
 * (brew install librsvg). 글꼴은 앱과 같은 Pretendard 를 쓰되, 없는 기기에서
 * 구워도 모양이 크게 어긋나지 않게 대체 글꼴을 뒤에 세워 둡니다.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(HERE, '../public');
const SOURCE = resolve(HERE, 'uou-logo.svg');

/** 카톡·페이스북·슬랙이 다 같이 쓰는 크기. */
const WIDTH = 1200;
const HEIGHT = 630;

/** src/styles/theme.ts 와 같은 값. 두 곳이 어긋나면 안 된다. */
const C = {
  accent: '#16A152',
  accentSoft: '#E8F6EE',
  ink: '#111111',
  body: '#374151',
  muted: '#6B7280',
  line: '#9CA3AF',
  track: '#F3F4F6',
  white: '#FFFFFF',
  warn: '#B45309',
};

const FONT =
  "Pretendard, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif";

/* 워드마크의 viewBox. make-icons.mjs 와 같은 좌표다. */
const LOGO = { x: 54.48, y: 338.64, width: 230.4, height: 138.96 };

const logo = readFileSync(SOURCE, 'utf-8');
/** <svg> 껍데기를 벗기고 알맹이만. 중첩 svg 로 앉혀야 원본 클리핑이 유지된다. */
const marks = logo
  .slice(
    logo.indexOf('>', logo.indexOf('<svg')) + 1,
    logo.lastIndexOf('</svg>'),
  )
  .trim();

const text = (x, y, size, weight, fill, value, anchor = 'start') =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" xml:space="preserve">${value}</text>`;

/** 알약 모양 딱지. 앱의 기준 칩과 같은 모양이다. */
const chip = (x, y, label, on) => {
  /* 한글은 글자마다 폭이 거의 같다. 글자 수로 폭을 잡아도 어긋나지 않는다. */
  const width = Math.round(label.replace(/\s/g, '').length * 27 + 44);
  return `
  <rect x="${x}" y="${y}" width="${width}" height="50" rx="25" fill="${on ? C.accentSoft : C.track}" />
  ${text(x + width / 2, y + 33, 25, on ? 700 : 500, on ? C.accent : C.muted, label, 'middle')}`;
};

/** 지도에 그려지는 경로와 같은 모양 — 흰 테를 깔고 그 위에 초록 선. */
const route = (d) => `
  <path d="${d}" fill="none" stroke="${C.white}" stroke-width="26" stroke-linecap="round" stroke-linejoin="round" />
  <path d="${d}" fill="none" stroke="${C.accent}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" />`;

/** 출발·도착 표시. 앱과 같은 색과 글자. */
const pin = (x, y, label, fill) => `
  <circle cx="${x}" cy="${y}" r="36" fill="${fill}" stroke="${C.white}" stroke-width="5" />
  ${text(x, y + 9, 24, 700, C.white, label, 'middle')}`;

/** 번호가 찍힌 건물 표시. */
const place = (x, y, no) => `
  <circle cx="${x}" cy="${y}" r="23" fill="${C.white}" stroke="${C.line}" stroke-width="3" />
  ${text(x, y + 8, 21, 700, C.muted, no, 'middle')}`;

/* ── 오른쪽 그림 ─────────────────────────────────────────────────────────
 * 캠퍼스 한 귀퉁이를 옮겨 놓은 듯한 경로 하나. 실제 화면에서 보는 것과
 * 같은 어법이라야 미리보기를 보고 들어온 사람이 헤매지 않는다.
 */
const PANEL = { x: 726, y: 45, width: 428, height: 540, rx: 36 };
const PATH = 'M 812 494 L 812 392 L 906 392 L 906 250 L 1044 250 L 1044 172';
/** 큰길로 돌아가는 길. 주황 점선은 앱에서 '다른 기준으로 가면' 을 뜻한다. */
const DETOUR = 'M 812 494 L 762 494 L 762 172 L 1044 172';

const logoWidth = 168;
const logoHeight = (LOGO.height / LOGO.width) * logoWidth;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="울산대 캠퍼스 길찾기">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${C.white}" />

  <rect x="${PANEL.x}" y="${PANEL.y}" width="${PANEL.width}" height="${PANEL.height}" rx="${PANEL.rx}" fill="${C.accentSoft}" />
  <path d="${DETOUR}" fill="none" stroke="${C.warn}" stroke-width="7" stroke-linecap="round" stroke-dasharray="2 22" opacity="0.5" />
  ${route(PATH)}
  ${place(906, 320, '44')}
  ${place(1010, 470, '16')}
  ${pin(812, 494, '출발', C.accent)}
  ${pin(1044, 172, '도착', C.ink)}

  <svg x="80" y="72" width="${logoWidth}" height="${logoHeight.toFixed(2)}" viewBox="${LOGO.x} ${LOGO.y} ${LOGO.width} ${LOGO.height}">
    ${marks}
  </svg>

  ${text(80, 296, 62, 800, C.ink, '울산대 캠퍼스 길찾기')}
  ${text(80, 356, 30, 500, C.body, '큰길로 돌지 않고, 보행로와 계단으로')}
  ${text(80, 400, 30, 500, C.body, '가장 빠른 길을 찾아 줍니다')}

  ${chip(80, 448, '최단거리', false)}
  ${chip(226, 448, '최소시간', true)}
  ${chip(372, 448, '지름길 우선', false)}

  ${text(80, 566, 28, 700, C.accent, 'www.uou-campus.site')}
</svg>
`;

const scratch = mkdtempSync(join(tmpdir(), 'campus-og-'));
const from = join(scratch, 'og.svg');
writeFileSync(from, svg, 'utf-8');

const to = join(PUBLIC, 'og.png');
execFileSync('rsvg-convert', [
  '-w',
  String(WIDTH),
  '-h',
  String(HEIGHT),
  from,
  '-o',
  to,
]);

console.log(
  `링크 미리보기 그림을 만들었습니다 — public/og.png  ${WIDTH}×${HEIGHT}`,
);
