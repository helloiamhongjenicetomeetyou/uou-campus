import { style } from '@vanilla-extract/css';
import { elevation, flex, font, layout, theme } from '@/styles';

export const chip = style([
  flex.CENTER,
  font.label,
  {
    display: 'inline-flex',
    flexShrink: 0,
    padding: '6px 14px',
    borderRadius: layout.radius.pill,
    color: theme.textSecondary,
    whiteSpace: 'nowrap',
    transition: 'color 0.12s, background-color 0.12s',

    ':hover': { color: theme.textPrimary },
  },
]);

export const selected = style([
  chip,
  {
    backgroundColor: theme.surface,
    color: theme.accent,
    boxShadow: elevation[1],

    ':hover': { color: theme.accent },
  },
]);

export const track = style([
  flex.VERTICAL,
  {
    display: 'inline-flex',
    gap: '2px',
    padding: '3px',
    borderRadius: layout.radius.pill,
    backgroundColor: theme.track,
  },
]);
