import type { DecisionDocument } from './schema';

/** Presentation-only section numbers; never change persisted IDs or answer fingerprints. */
export function sectionOrder(doc: DecisionDocument): Map<string, string> {
  const groups = doc.nodes.filter((n) => n.kind === 'group');
  const children = new Map<string | null, typeof groups>();
  for (const group of groups)
    children.set(group.parentId, [...(children.get(group.parentId) ?? []), group]);
  const roots = children.get(null) ?? [];
  const singleContainer = roots.length === 1 && (children.get(roots[0]!.id)?.length ?? 0) > 0;
  const queue = (singleContainer ? (children.get(roots[0]!.id) ?? []) : roots).map((node, i) => ({
    node,
    number: String(i + 1),
  }));
  const result = new Map<string, string>();
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index]!;
    result.set(current.node.id, current.number);
    for (const [i, node] of (children.get(current.node.id) ?? []).entries())
      queue.push({ node, number: `${current.number}.${i + 1}` });
  }
  return result;
}
export function numberedSection(title: string, number: string | undefined, locale: string): string {
  if (!number) return title;
  const localized = number
    .split('.')
    .map((n) => new Intl.NumberFormat(locale).format(Number(n)))
    .join('.');
  return `${localized} · ${title.replace(/^[0-9۰-۹٠-٩]+[.\-ـ،)·]\s*/, '')}`;
}
