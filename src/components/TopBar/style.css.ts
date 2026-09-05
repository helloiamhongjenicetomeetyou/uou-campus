import { style } from '@vanilla-extract/css';
import { elevation, flex, font, layout, media, spacing, theme } from '@/styles';

/*
 * 지도 위쪽에 걸리는 띠. 걸으면서 보는 안내와, 지도에서 곳을 고르는 중이라는
 * 알림이 같은 자리를 쓴다. 둘이 같이 뜨는 일은 없다.
 *
 * 세로로 든 폰에서는 화면 위에 딱 붙여 노치 밑으로 흘려 넣고, 그 밖에는 왼쪽
 * 길찾기 패널(넓은 화면의 패널이든 가로 폰의 기둥이든)을 비켜 앉는다.
 */
const bar = style([
  flex.COLUMN_FLEX,
  {
    position: 'absolute',
    zIndex: 40,
    top: spacing.md,
    left: `calc(380px + ${spacing.md} * 2)`,
    right: spacing.md,
    maxWidth: '520px',
    gap: '6px',
    padding: `12px ${spacing.md}`,
    borderRadius: layout.radius.md,
    border: `1px solid ${theme.outline}`,
    backgroundColor: theme.surface,
    boxShadow: elevation.overlay,

    '@media': {
      [media.SHEET]: {
        top: 0,
        left: 0,
        right: 0,
        maxWidth: 'none',
        paddingTop: `calc(12px + env(safe-area-inset-top, 0px))`,
        borderRadius: `0 0 ${layout.radius.md} ${layout.radius.md}`,
        borderTop: 'none',
      },

      /*
       * 가로로 돌린 폰. 위아래가 모자라니 위 여백을 줄이고, 왼쪽 기둥이
       * 물고 있는 만큼만 비켜서 남는 폭을 다 쓴다. 가로에서는 노치가 옆으로
       * 오므로 오른쪽 여백도 챙긴다.
       */
      [media.RAIL]: {
        top: spacing.sm,
        left: `calc(${layout.railWidth} + ${spacing.sm})`,
        right: `calc(${spacing.sm} + env(safe-area-inset-right, 0px))`,
        maxWidth: 'none',
      },
    },
  },
]);

export const guide = style([bar]);

/** 경로에서 벗어났을 때. 색만 바꿔 눈에 걸리게 한다. */
export const lost = style([
  bar,
  { borderColor: theme.warn, backgroundColor: theme.warnSoft },
]);

export const pick = style([
  bar,
  {
    borderColor: theme.accent,
    backgroundColor: theme.accentSoft,

    '@media': {
      /* 지도에서 고르는 중에는 기둥이 화면 밖에 있다. 그 자리를 비워 둘 이유가 없다. */
      [media.RAIL]: {
        left: `calc(${spacing.sm} + env(safe-area-inset-left, 0px))`,
      },
    },
  },
]);

export const head = style([flex.VERTICAL, { gap: '10px' }]);

export const until = style([
  flex.CENTER,
  font.metricSmall,
  {
    flexShrink: 0,
    minWidth: '58px',
    height: '30px',
    padding: '0 10px',
    borderRadius: layout.radius.pill,
    backgroundColor: theme.accent,
    color: theme.onAccent,
  },
]);

export const brief = style([
  font.sectionTitle,
  { flex: 1, minWidth: 0, fontSize: '17px', color: theme.textPrimary },
]);

export const stop = style([
  font.caption,
  {
    flexShrink: 0,
    padding: '6px 12px',
    borderRadius: layout.radius.pill,
    border: `1px solid ${theme.outline}`,
    backgroundColor: theme.surface,
    color: theme.textSecondary,

    ':hover': { borderColor: theme.gray[400], color: theme.textPrimary },
  },
]);

export const detail = style([
  font.caption,
  {
    color: theme.textSecondary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
]);

export const rest = style([
  flex.VERTICAL,
  { gap: '6px', color: theme.textSecondary },
]);

export const restValue = style([
  font.metricSmall,
  { color: theme.textPrimary },
]);

export const restNote = style([font.caption, { color: theme.textTertiary }]);

export const warnText = style([font.bodyStrong, { color: theme.warn }]);

export const pickText = style([
  font.bodyStrong,
  { flex: 1, minWidth: 0, color: theme.accent },
]);

export const pickNote = style([font.caption, { color: theme.textSecondary }]);
