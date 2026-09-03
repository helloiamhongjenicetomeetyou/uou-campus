import { globalStyle, globalFontFace } from '@vanilla-extract/css';
import theme from './theme';
import font from './font';

export const pretendard = 'Pretendard';

/* gh/orioncactus 경로는 404 다. npm 배포본을 쓴다. */
globalFontFace(pretendard, {
  src: 'url("https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/woff2/PretendardVariable.woff2") format("woff2-variations")',
  fontWeight: '45 920',
  fontStyle: 'normal',
  fontDisplay: 'swap',
});

globalStyle('*, *::before, *::after', {
  margin: 0,
  padding: 0,
  boxSizing: 'border-box',
});

globalStyle('html, body, #root', {
  width: '100%',
  height: '100%',
});

/* 지도가 화면을 꽉 채우므로 문서 자체는 스크롤하지 않는다. */
globalStyle('body', {
  overflow: 'hidden',
  overscrollBehavior: 'none',
});

globalStyle('html', {
  fontSize: '16px',
});

globalStyle('body', {
  fontFamily: `-apple-system, system-ui, ${pretendard}, 'Segoe UI', Roboto, sans-serif`,
  fontSize: '0.875rem',
  color: theme.textPrimary,
  backgroundColor: theme.background,
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
});

globalStyle('a', {
  color: 'inherit',
  textDecoration: 'none',
});

globalStyle('button', {
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  color: 'inherit',
});

globalStyle('input, textarea, select', {
  border: 'none',
  outline: 'none',
  fontFamily: 'inherit',
});

globalStyle('ul, ol', {
  listStyle: 'none',
});

globalStyle('img', {
  display: 'block',
  maxWidth: '100%',
});

globalStyle('table', {
  width: '100%',
  borderCollapse: 'collapse',
});

globalStyle('th, td', {
  textAlign: 'left',
});

/* 키보드 포커스는 보이게 두되, 마우스 클릭에는 링이 뜨지 않게. */
globalStyle(':focus-visible', {
  outline: `2px solid ${theme.accent}`,
  outlineOffset: '2px',
});

/* ── Leaflet 기본 껍데기를 이 앱 톤으로 눌러 둔다 ─────────────────────── */

globalStyle('.leaflet-container', {
  fontFamily: 'inherit',
  backgroundColor: theme.gray[100],
});

globalStyle('.leaflet-control-attribution', {
  ...font.caption,
  backgroundColor: 'rgba(255, 255, 255, 0.82)',
  color: theme.textTertiary,
});

globalStyle('.leaflet-control-attribution a', {
  color: theme.textSecondary,
});

globalStyle('.leaflet-bar a', {
  color: theme.textPrimary,
  borderBottomColor: theme.outline,
});
