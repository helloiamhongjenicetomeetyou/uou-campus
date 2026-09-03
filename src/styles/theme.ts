const gray = {
  900: '#111111',
  700: '#374151',
  500: '#6B7280',
  400: '#9CA3AF',
  300: '#D1D5DB',
  200: '#E5E7EB',
  100: '#F3F4F6',
  50: '#F8F9FB',
  0: '#FFFFFF',
} as const;

/** 학부 로고 색. */
const series = {
  ict: '#00A663',
  it: '#007A4D',
} as const;

const theme = {
  gray,
  series,

  background: gray[50],
  surface: gray[0],
  track: gray[100],

  accent: '#00A663',
  accentSoft: '#E6F6EF',
  onAccent: '#FFFFFF',

  warn: '#B45309',
  warnSoft: '#FFFBEB',
  ok: '#15803D',
  okSoft: '#F0FDF4',
  error: '#B91C1C',
  errorSoft: '#FEF2F2',

  outline: gray[200],

  textPrimary: gray[900],
  textSecondary: gray[500],
  textTertiary: gray[400],
} as const;

export default theme;
