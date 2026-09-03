import type { CSSProperties } from '@vanilla-extract/css';

const REM_BASE = 16;

const fontGenerator = (
  weight: number,
  sizePx: number,
  lineHeight: number,
): CSSProperties => ({
  fontWeight: weight,
  fontSize: `${sizePx / REM_BASE}rem`,
  lineHeight: `${lineHeight}%`,
});

const font = {
  appTitle: fontGenerator(700, 20, 130),
  sectionTitle: fontGenerator(700, 15, 140),

  body: fontGenerator(400, 14, 160),
  bodyStrong: fontGenerator(600, 14, 160),

  label: fontGenerator(600, 13, 130),

  /** 자리수가 흔들리지 않게 고정폭 숫자를 쓴다. */
  metric: {
    ...fontGenerator(700, 22, 120),
    fontVariantNumeric: 'tabular-nums',
  },
  metricSmall: {
    ...fontGenerator(600, 13, 130),
    fontVariantNumeric: 'tabular-nums',
  },

  caption: fontGenerator(500, 12, 145),
} as const;

export default font;
