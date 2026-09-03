/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Google Analytics 4 측정 ID (`G-XXXXXXXXXX`).
   * 비워 두면 통계를 아예 붙이지 않는다. src/analytics/gtag.ts 참고.
   */
  readonly VITE_GA_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
