import type { CampusGraphDoc } from '@/types/campus';
import { buildGraph } from '@/routing/graph';
import seed from './campus.json';

const STORAGE_KEY = 'campus-route:graph';

/**
 * 편집 모드에서 고친 그래프는 브라우저에 남는다.
 * 저장된 게 있으면 그걸, 없으면 시드를 쓴다.
 */
export const loadDoc = (): CampusGraphDoc => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as CampusGraphDoc;
      if (Array.isArray(parsed.nodes) && Array.isArray(parsed.edges))
        return parsed;
    }
  } catch {
    /* 사생활 보호 모드거나 저장값이 깨졌다. 시드로 간다. */
  }
  return seed as CampusGraphDoc;
};

export const saveDoc = (doc: CampusGraphDoc) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
    return true;
  } catch {
    return false;
  }
};

export const clearSavedDoc = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* 지울 게 없으면 그만이다. */
  }
};

export const hasSavedDoc = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
};

export const seedDoc = seed as CampusGraphDoc;
export const buildFrom = buildGraph;
