import type { CampusGraph, Link } from './graph';
import { costFor, type RouteOptions } from './cost';

/** 최소 힙. 노드가 백 개 남짓이라 배열 훑기로도 되지만, 힙이 더 읽기 쉽다. */
class MinHeap {
  private items: { id: string; cost: number }[] = [];

  get size() {
    return this.items.length;
  }

  push(id: string, cost: number) {
    this.items.push({ id, cost });
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].cost <= this.items[i].cost) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  pop() {
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let min = i;
        if (l < this.items.length && this.items[l].cost < this.items[min].cost)
          min = l;
        if (r < this.items.length && this.items[r].cost < this.items[min].cost)
          min = r;
        if (min === i) break;
        [this.items[min], this.items[i]] = [this.items[i], this.items[min]];
        i = min;
      }
    }
    return top;
  }
}

/** 지나온 길을 되짚기 위한 발자국. */
export interface Step {
  link: Link;
  from: string;
}

/**
 * from 에서 to 까지 옵션 기준으로 가장 싼 길.
 * 못 가면 null. 간선 비용이 음수가 될 일이 없어 A* 대신 다익스트라로 충분하다.
 */
export const shortestPath = (
  graph: CampusGraph,
  from: string,
  to: string,
  options: RouteOptions,
): Step[] | null => {
  if (from === to) return [];
  if (!graph.nodes.has(from) || !graph.nodes.has(to)) return null;

  const best = new Map<string, number>([[from, 0]]);
  const came = new Map<string, Step>();
  const settled = new Set<string>();
  const queue = new MinHeap();
  queue.push(from, 0);

  while (queue.size > 0) {
    const { id, cost } = queue.pop();
    if (settled.has(id)) continue;
    settled.add(id);
    if (id === to) break;

    for (const link of graph.links.get(id) ?? []) {
      if (settled.has(link.to)) continue;

      const weight = costFor(link.edge, link.meters, options);
      if (!Number.isFinite(weight)) continue;

      const next = cost + weight;
      if (next < (best.get(link.to) ?? Infinity)) {
        best.set(link.to, next);
        came.set(link.to, { link, from: id });
        queue.push(link.to, next);
      }
    }
  }

  if (!came.has(to)) return null;

  const steps: Step[] = [];
  for (let at = to; at !== from;) {
    const step = came.get(at)!;
    steps.push(step);
    at = step.from;
  }
  return steps.reverse();
};
