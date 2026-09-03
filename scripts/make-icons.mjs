/**
 * 앱 아이콘 만들기.
 *
 *   node scripts/make-icons.mjs
 *
 * 원본은 울산대 CI 워드마크([`uou-logo.svg`](uou-logo.svg)) 하나입니다.
 * 가로로 긴 그림(가로세로비 1.66)이라 정사각 캔버스 한가운데 앉혀서 씁니다.
 * 쓰임새마다 여백과 배경이 달라 세 벌을 따로 뽑습니다.
 *
 *   icon.svg              브라우저 탭·매니페스트. 여백을 적게 둬 작은 크기에서도 읽히게
 *   icon-maskable-512     안드로이드가 제 모양대로 잘라 낸다. 안쪽 원 안에 들어오게 줄임
 *   apple-touch-icon      iOS 가 직접 모서리를 깎는다. 모서리를 둥글리지 않고 꽉 채움
 *
 * rsvg-convert 가 있어야 합니다 (brew install librsvg).
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = resolve(HERE, '../public');
const SOURCE = resolve(HERE, 'uou-logo.svg');

/** 캔버스 한 변. 512 로 그려서 필요한 크기로 줄인다. */
const SIZE = 512;
/** 워드마크 원본의 viewBox. 여기 좌표를 캔버스로 옮긴다. */
const LOGO = { x: 54.48, y: 338.64, width: 230.4, height: 138.96 };

const logo = readFileSync(SOURCE, 'utf-8');
/** <svg> 껍데기를 벗기고 알맹이만. */
const marks = logo
  .slice(
    logo.indexOf('>', logo.indexOf('<svg')) + 1,
    logo.lastIndexOf('</svg>'),
  )
  .trim();

/**
 * 워드마크를 캔버스 한가운데, 주어진 가로 비율만큼 차지하게 앉힌다.
 *
 * `<g transform>` 이 아니라 **중첩 `<svg>`** 를 쓴다. 원본에는 viewBox 밖에
 * 놓여 원래는 잘려 나가던 외곽선 사본이 6개 들어 있는데, g 로 옮기면 그 클리핑이
 * 풀려서 유령이 따라 나온다. 중첩 svg 는 제 뷰포트를 새로 만들어 원본과 똑같이
 * 잘라 준다.
 */
const compose = ({ widthRatio, background, radius }) => {
  const width = SIZE * widthRatio;
  const height = (LOGO.height / LOGO.width) * width;
  const round = (n) => Number(n.toFixed(3));

  const plate = radius
    ? `<rect width="${SIZE}" height="${SIZE}" rx="${radius}" fill="${background}" />`
    : `<rect width="${SIZE}" height="${SIZE}" fill="${background}" />`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" role="img" aria-label="울산대 캠퍼스 길찾기">
  ${plate}
  <svg x="${round((SIZE - width) / 2)}" y="${round((SIZE - height) / 2)}" width="${round(width)}" height="${round(height)}" viewBox="${LOGO.x} ${LOGO.y} ${LOGO.width} ${LOGO.height}">
    ${marks}
  </svg>
</svg>
`;
};

const WHITE = '#FFFFFF';

/* 탭 아이콘은 작게 줄어드니 여백을 아낀다. */
const appIcon = compose({ widthRatio: 0.86, background: WHITE, radius: 96 });
/* 안드로이드는 바깥 20% 를 잘라 낼 수 있다. 안쪽에 넉넉히 들여 놓는다. */
const maskable = compose({ widthRatio: 0.58, background: WHITE, radius: 0 });
/* iOS 는 스스로 모서리를 깎는다. 우리가 둥글리면 이가 나간다. */
const iosIcon = compose({ widthRatio: 0.78, background: WHITE, radius: 0 });

writeFileSync(join(PUBLIC, 'icon.svg'), appIcon, 'utf-8');

const scratch = mkdtempSync(join(tmpdir(), 'campus-icons-'));
writeFileSync(join(scratch, 'maskable.svg'), maskable, 'utf-8');
writeFileSync(join(scratch, 'ios.svg'), iosIcon, 'utf-8');

const render = (from, to, size) => {
  execFileSync('rsvg-convert', [
    '-w',
    String(size),
    '-h',
    String(size),
    from,
    '-o',
    to,
  ]);
  console.log(`  ${to.replace(`${PUBLIC}/`, '')}  ${size}×${size}`);
};

console.log('아이콘을 만듭니다 — 원본 scripts/uou-logo.svg');
render(join(PUBLIC, 'icon.svg'), join(PUBLIC, 'icon-192.png'), 192);
render(join(PUBLIC, 'icon.svg'), join(PUBLIC, 'icon-512.png'), 512);
render(
  join(scratch, 'maskable.svg'),
  join(PUBLIC, 'icon-maskable-512.png'),
  512,
);
render(join(scratch, 'ios.svg'), join(PUBLIC, 'apple-touch-icon.png'), 180);
console.log('  public/icon.svg');
