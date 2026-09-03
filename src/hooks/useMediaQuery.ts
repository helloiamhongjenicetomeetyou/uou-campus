import { useEffect, useState } from 'react';
import { screen } from '@/styles';

/**
 * 미디어 쿼리를 자바스크립트에서도 본다.
 *
 * 좁은 화면과 넓은 화면이 모양만 다른 게 아니라 아예 다르게 움직여야 하는
 * 자리가 있다 — 폰에서는 장소를 전체 화면 목록에서 고르고, 데스크톱에서는 칸
 * 밑에 붙는 드롭다운에서 고른다. 그런 갈림길에서만 쓴다. 모양만 다른 건 CSS 로.
 */
export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const sync = () => setMatches(mql.matches);
    /* 훅이 붙기 전에 창이 바뀌었을 수 있다. 한 번 맞춰 두고 시작한다. */
    sync();
    mql.addEventListener('change', sync);
    return () => mql.removeEventListener('change', sync);
  }, [query]);

  return matches;
};

/** 길찾기 패널이 옆이 아니라 아래로 내려가는 너비. */
export const usePhone = () => useMediaQuery(`(max-width: ${screen.phone})`);
