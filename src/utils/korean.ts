const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
/** 종성 인덱스 8 이 ㄹ 이다. */
const RIEUL = 8;

/** 마지막 글자의 종성 인덱스. 한글이 아니면 null. */
const finalConsonant = (word: string): number | null => {
  const code = word.charCodeAt(word.length - 1);
  if (Number.isNaN(code) || code < HANGUL_START || code > HANGUL_END)
    return null;
  return (code - HANGUL_START) % 28;
};

/**
 * '로 / 으로' 를 고른다. 받침이 없거나 ㄹ 받침이면 '로'.
 * "최단거리로" 는 맞고 "최소시간로" 는 틀리다.
 */
export const josaRo = (word: string): string => {
  const final = finalConsonant(word);
  if (final === null) return '로';
  return final === 0 || final === RIEUL ? '로' : '으로';
};

/** '은 / 는' 을 고른다. */
export const josaNeun = (word: string): string => {
  const final = finalConsonant(word);
  if (final === null) return '는';
  return final === 0 ? '는' : '은';
};
