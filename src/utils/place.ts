import type { CampusNode } from '@/types/campus';

/** 이름·별칭·건물번호 아무거나 걸리면 후보로 올린다. */
export const matchesPlace = (node: CampusNode, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (String(node.no ?? '') === q) return true;
  if (node.name.toLowerCase().includes(q)) return true;
  return (node.aliases ?? []).some((a) => a.toLowerCase().includes(q));
};
