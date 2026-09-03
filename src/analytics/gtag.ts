/**
 * Google Analytics 4.
 *
 * 측정 ID(`VITE_GA_ID`)가 있을 때만 붙는다. 없으면 track() 은 조용히 아무 일도
 * 안 한다 — 키 없이 이 저장소를 클론해 온 사람이 그대로 돌려도 콘솔이 깨끗해야
 * 한다.
 *
 * 보내는 건 '어느 건물에서 어느 건물로 찾았는지' 정도다. 그게 이 앱을 고치는 데
 * 제일 쓸모 있다 — 사람이 실제로 안 쓰는 건물은 좌표를 다듬을 필요가 없고,
 * 길이 없다고 뜨는 조합은 그래프에 빠진 길이 있다는 뜻이다. 좌표나 위치 기록은
 * 보내지 않는다.
 */

type Params = Record<string, string | number | boolean | undefined>;

const ID = import.meta.env.VITE_GA_ID?.trim();

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

/** 추적을 원치 않는다고 브라우저가 말하면 스크립트조차 안 받는다. */
const refused = () => {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.doNotTrack === '1' || nav.globalPrivacyControl === true;
};

let armed = false;

/**
 * 통계를 켠다. main.tsx 에서 한 번만 부른다.
 *
 * 개발 중에는 안 붙인다. 고치는 동안 새로고침한 수십 번이 실제 방문으로 섞이면
 * 숫자를 볼 수 없게 된다.
 */
export const initAnalytics = () => {
  if (armed || !ID || !import.meta.env.PROD || refused()) return;
  armed = true;

  window.dataLayer = window.dataLayer ?? [];
  /*
   * gtag 는 arguments 객체를 그대로 dataLayer 에 밀어 넣어야 한다. 태그 쪽이
   * '[object Arguments]' 인지 보고 가르기 때문에, 배열로 바꿔 넣으면 무시된다.
   * 그래서 화살표 함수를 못 쓴다.
   */
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', ID, {
    /* 홈 화면 앱으로 띄웠을 때와 브라우저로 열었을 때를 갈라 본다. */
    app_mode: window.matchMedia('(display-mode: standalone)').matches
      ? 'standalone'
      : 'browser',
  });

  const tag = document.createElement('script');
  tag.async = true;
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ID)}`;
  document.head.appendChild(tag);
};

/** 값이 빈 항목은 빼고 보낸다. GA 화면에 '(not set)' 이 늘어서면 읽기 힘들다. */
const clean = (params: Params): Params =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  );

export const track = (event: string, params: Params = {}) => {
  if (!armed) return;
  window.gtag('event', event, clean(params));
};
