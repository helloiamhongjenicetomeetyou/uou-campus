import { style } from '@vanilla-extract/css';
import {
  elevation,
  flex,
  font,
  layout,
  screen,
  spacing,
  theme,
} from '@/styles';

export const panel = style([
  flex.COLUMN_FLEX,
  {
    position: 'absolute',
    zIndex: 20,
    top: spacing.md,
    left: spacing.md,
    width: '380px',
    maxHeight: `calc(100% - ${spacing.md} * 2)`,
    borderRadius: layout.radius.md,
    border: `1px solid ${theme.outline}`,
    backgroundColor: theme.surface,
    boxShadow: elevation.overlay,
    overflow: 'hidden',

    '@media': {
      /* 좁은 화면에서는 아래에서 올라오는 시트가 된다. 지도를 덜 가리려고. */
      [`screen and (max-width: ${screen.phone})`]: {
        top: 'auto',
        bottom: 0,
        left: 0,
        right: 0,
        width: 'auto',
        maxHeight: '62%',
        borderRadius: `${layout.radius.md} ${layout.radius.md} 0 0`,
        borderBottom: 'none',
      },
    },
  },
]);

export const header = style([
  flex.BETWEEN,
  {
    padding: `12px ${spacing.md}`,
    borderBottom: `1px solid ${theme.outline}`,
  },
]);

export const title = style([font.appTitle, { fontSize: '17px' }]);

export const headerActions = style([flex.VERTICAL, { gap: '6px' }]);

export const edit = style([
  font.caption,
  {
    padding: '5px 10px',
    borderRadius: layout.radius.pill,
    border: `1px solid ${theme.outline}`,
    color: theme.textSecondary,

    ':hover': { color: theme.textPrimary, borderColor: theme.gray[300] },
  },
]);

export const editOn = style([
  edit,
  {
    borderColor: theme.warn,
    backgroundColor: theme.warnSoft,
    color: theme.warn,
    ':hover': { color: theme.warn, borderColor: theme.warn },
  },
]);

export const install = style([
  font.caption,
  {
    padding: '5px 10px',
    borderRadius: layout.radius.pill,
    border: `1px solid ${theme.accent}`,
    backgroundColor: theme.accentSoft,
    color: theme.accent,
    whiteSpace: 'nowrap',

    ':hover': { backgroundColor: theme.accent, color: theme.onAccent },
  },
]);

export const installHint = style([
  font.caption,
  {
    padding: `8px ${spacing.md}`,
    borderBottom: `1px solid ${theme.outline}`,
    backgroundColor: theme.accentSoft,
    color: theme.accent,
  },
]);

export const fields = style([
  {
    display: 'flex',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: `${spacing.md} ${spacing.md} 10px`,
  },
]);

export const swap = style([
  flex.CENTER,
  {
    flexShrink: 0,
    width: '30px',
    height: '36px',
    borderRadius: layout.radius.sm,
    fontSize: '15px',
    color: theme.textTertiary,

    ':hover': { backgroundColor: theme.gray[100], color: theme.textPrimary },
  },
]);

export const geoRow = style([
  flex.VERTICAL,
  { gap: spacing.sm, padding: `0 ${spacing.md} 10px` },
]);

export const geo = style([
  font.caption,
  {
    padding: '5px 11px',
    borderRadius: layout.radius.pill,
    border: `1px solid ${theme.outline}`,
    color: theme.textSecondary,
    ':hover': { color: theme.textPrimary, borderColor: theme.gray[300] },
  },
]);

export const geoOn = style([
  geo,
  { borderColor: '#2563EB', color: '#2563EB', backgroundColor: '#EFF6FF' },
]);

export const geoNote = style([font.caption, { color: theme.textTertiary }]);

export const controls = style([
  flex.COLUMN_FLEX,
  {
    gap: '2px',
    padding: `0 ${spacing.md} 12px`,
    borderBottom: `1px solid ${theme.outline}`,
    alignItems: 'flex-start',
  },
]);

export const result = style({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
});

export const empty = style([
  font.body,
  { padding: spacing.md, color: theme.textTertiary },
]);

export const warn = style([
  font.body,
  {
    margin: spacing.md,
    padding: '10px 12px',
    borderRadius: layout.radius.sm,
    backgroundColor: theme.warnSoft,
    color: theme.warn,
  },
]);

/* ── 따라가기 ───────────────────────────────────────────────────────────── */

export const follow = style([
  flex.COLUMN_FLEX,
  {
    gap: '6px',
    padding: `12px ${spacing.md}`,
    borderBottom: `1px solid ${theme.outline}`,
    backgroundColor: theme.accentSoft,
    alignItems: 'flex-start',
  },
]);

export const followLost = style([follow, { backgroundColor: theme.warnSoft }]);

export const followHead = style([
  flex.VERTICAL,
  { flexWrap: 'wrap', gap: spacing.sm },
]);

export const followMetric = style([font.metric, { color: theme.textPrimary }]);

export const followSub = style([
  font.metricSmall,
  { color: theme.textSecondary },
]);

export const followOff = style([
  font.caption,
  { marginLeft: 'auto', color: theme.textTertiary },
]);

export const followStep = style([
  font.bodyStrong,
  { color: theme.textPrimary },
]);

export const followNote = style([font.caption, { color: theme.warn }]);

export const simRow = style([
  flex.VERTICAL,
  {
    flexWrap: 'wrap',
    gap: '5px',
    marginTop: '2px',
    paddingTop: '8px',
    borderTop: `1px dashed ${theme.outline}`,
    width: '100%',
  },
]);

export const simTag = style([
  font.caption,
  { marginRight: '2px', color: theme.textTertiary },
]);

export const simButton = style([
  font.caption,
  {
    padding: '4px 9px',
    borderRadius: layout.radius.pill,
    border: `1px solid ${theme.outline}`,
    backgroundColor: theme.surface,
    color: theme.textSecondary,

    ':hover': { color: theme.textPrimary, borderColor: theme.gray[300] },
    ':disabled': { opacity: 0.4, cursor: 'default' },
  },
]);

export const simSpeed = style([
  simButton,
  { minWidth: '34px', fontVariantNumeric: 'tabular-nums' },
]);

export const simSpeedOn = style([
  simSpeed,
  {
    borderColor: theme.accent,
    backgroundColor: theme.accent,
    color: theme.onAccent,
    ':hover': { color: theme.onAccent, borderColor: theme.accent },
  },
]);

/* ── 요약 ───────────────────────────────────────────────────────────────── */

export const summary = style([
  flex.COLUMN_FLEX,
  { gap: '10px', padding: `${spacing.md} ${spacing.md} 12px` },
]);

export const headline = style([flex.VERTICAL, { gap: spacing.sm }]);
export const metric = style([font.metric, { color: theme.textPrimary }]);
export const metricSub = style([
  font.metricSmall,
  { color: theme.textSecondary },
]);

export const stats = style([flex.VERTICAL, { flexWrap: 'wrap', gap: '6px' }]);

export const stat = style([
  flex.VERTICAL,
  {
    gap: '5px',
    padding: '3px 9px',
    borderRadius: layout.radius.pill,
    backgroundColor: theme.gray[100],
  },
]);

export const statLabel = style([font.caption, { color: theme.textSecondary }]);
export const statValue = style([
  font.caption,
  {
    fontWeight: 700,
    color: theme.textPrimary,
    fontVariantNumeric: 'tabular-nums',
  },
]);

export const saved = style([
  font.caption,
  {
    padding: '8px 10px',
    borderRadius: layout.radius.sm,
    backgroundColor: theme.accentSoft,
    color: theme.ok,
    lineHeight: 1.55,
  },
]);

export const savedFlat = style([
  font.caption,
  {
    padding: '8px 10px',
    borderRadius: layout.radius.sm,
    backgroundColor: theme.gray[100],
    color: theme.textSecondary,
  },
]);

export const compare = style([
  font.caption,
  {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '5px',
    padding: '8px 10px',
    borderRadius: layout.radius.sm,
    backgroundColor: theme.warnSoft,
    color: theme.warn,
  },
]);

export const compareDot = style({
  width: '14px',
  height: '0',
  borderTop: `2px dashed ${theme.warn}`,
});

export const compareText = style({ flex: 1, minWidth: 0 });
export const compareHint = style({ width: '100%', opacity: 0.75 });

/* ── 안내문 ─────────────────────────────────────────────────────────────── */

export const steps = style({
  padding: `0 ${spacing.md} ${spacing.md}`,
});

const stepRow = style({
  display: 'grid',
  gridTemplateColumns: '18px 1fr',
  gap: spacing.sm,
});

export const step = style([stepRow, { paddingBottom: '14px' }]);
export const stepLast = style([stepRow, { alignItems: 'center' }]);

/** 왼쪽에 이어지는 세로선. 마지막 칸만 점으로 끊는다. */
export const stepRail = style({
  position: 'relative',
  width: '18px',

  '::before': {
    content: '""',
    position: 'absolute',
    top: '5px',
    left: '6px',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: theme.accent,
  },
  '::after': {
    content: '""',
    position: 'absolute',
    top: '13px',
    bottom: '-10px',
    left: '8px',
    width: '2px',
    backgroundColor: theme.gray[200],
  },
});

export const stepRailEnd = style({
  position: 'relative',
  width: '18px',
  height: '14px',

  '::before': {
    content: '""',
    position: 'absolute',
    top: '2px',
    left: '3px',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: `3px solid ${theme.gray[900]}`,
  },
});

export const stepBody = style([flex.COLUMN_FLEX, { gap: '4px' }]);
export const stepText = style([font.body, { color: theme.textPrimary }]);

export const stepTags = style([
  flex.VERTICAL,
  { flexWrap: 'wrap', gap: '5px' },
]);

export const tag = style([
  font.caption,
  {
    padding: '1px 6px',
    borderRadius: layout.radius.pill,
    backgroundColor: theme.gray[100],
    color: theme.textSecondary,
    fontSize: '11px',
  },
]);

export const tagCut = style([
  tag,
  { backgroundColor: theme.accentSoft, color: theme.accent, fontWeight: 700 },
]);

export const stepMeters = style([
  font.caption,
  { color: theme.textTertiary, fontVariantNumeric: 'tabular-nums' },
]);
