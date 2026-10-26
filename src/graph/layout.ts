import { sectionOrder, numberedSection } from '../domain/section-order';
import { graphlib, layout } from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { DecisionDocument } from '../domain/schema';
import type { Evaluation, DecisionStatus } from '../domain/engine';
export type GraphData = {
  title: string;
  subtitle: string;
  kind: 'root' | 'group' | 'question' | 'branch';
  status: DecisionStatus | 'topic';
  openId: string | null;
  noteId: string | null;
  noteCount: number;
  direction?: 'ltr' | 'rtl';
};
export type StudioNode = Node<GraphData, 'decision'>;
export type StudioEdge = Edge<{
  semanticSource: string;
  semanticTarget: string;
  dependency?: boolean;
}>;

export function buildGraph(
  doc: DecisionDocument,
  evaluation: Evaluation,
  noteCounts: Record<string, number>,
  showDependencies: boolean,
): { nodes: StudioNode[]; edges: StudioEdge[] } {
  const sections = sectionOrder(doc);
  const nodes: StudioNode[] = [],
    edges: StudioEdge[] = [];
  const g = new graphlib.Graph()
    .setGraph({ rankdir: 'TB', nodesep: 30, ranksep: 85, marginx: 40, marginy: 40 })
    .setDefaultEdgeLabel(() => ({}));
  const add = (id: string, data: GraphData, height = 120) => {
    g.setNode(id, { width: 250, height });
    nodes.push({
      id,
      type: 'decision',
      position: { x: 0, y: 0 },
      data: { ...data, direction: doc.direction },
      width: 250,
      height,
      draggable: false,
      connectable: false,
      ariaLabel: data.title,
    });
  };
  const root = '__document__';
  add(
    root,
    {
      title: doc.title,
      subtitle: `${evaluation.counts.answered} / ${evaluation.total}`,
      kind: 'root',
      status: 'topic',
      openId: null,
      noteId: null,
      noteCount: 0,
    },
    84,
  );
  for (const node of doc.nodes)
    add(
      node.id,
      {
        title:
          node.kind === 'group'
            ? numberedSection(node.title, sections.get(node.id), doc.locale)
            : node.title,
        subtitle: node.id,
        kind: node.kind,
        status:
          node.kind === 'question' ? (evaluation.states[node.id]?.status ?? 'ready') : 'topic',
        openId: node.id,
        noteId: node.id,
        noteCount: noteCounts[node.id] ?? 0,
      },
      node.kind === 'group' ? 78 : 120,
    );
  const edge = (
    source: string,
    target: string,
    semanticSource: string,
    semanticTarget: string,
    dependency = false,
  ) => {
    const id = `${dependency ? 'dep' : 'tree'}:${encodeURIComponent(source)}:${encodeURIComponent(target)}`;
    if (!dependency) g.setEdge(source, target);
    edges.push({
      id,
      source,
      target,
      type: 'smoothstep',
      data: { semanticSource, semanticTarget, dependency },
      className: dependency ? 'dependency-edge' : '',
      style: dependency ? { strokeDasharray: '5 6' } : {},
      interactionWidth: 22,
      focusable: true,
    });
  };
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  for (const node of doc.nodes) {
    let parent = node.parentId ?? root;
    const single =
      node.kind === 'question' && node.when?.rules.length === 1 ? node.when.rules[0] : undefined;
    if (single && single.questionId === parent) {
      const branchId = `__branch__${encodeURIComponent(parent)}:${encodeURIComponent(single.optionId)}`;
      if (!g.hasNode(branchId)) {
        const owner = byId.get(parent);
        const option =
          owner?.kind === 'question'
            ? owner.options.find((o) => o.id === single.optionId)
            : undefined;
        add(
          branchId,
          {
            title: option?.label ?? single.optionId,
            subtitle: 'IF',
            kind: 'branch',
            status: evaluation.states[node.id]?.status === 'inactive' ? 'inactive' : 'topic',
            openId: node.id,
            noteId: node.id,
            noteCount: 0,
          },
          82,
        );
        edge(parent, branchId, parent, node.id);
      }
      parent = branchId;
    }
    edge(parent, node.id, node.parentId ?? node.id, node.id);
    if (showDependencies && node.kind === 'question')
      for (const dep of new Set([
        ...node.dependsOn,
        ...(node.when?.rules.map((r) => r.questionId) ?? []),
      ])) {
        if (dep !== node.parentId) edge(dep, node.id, dep, node.id, true);
      }
  }
  layout(g);
  for (const node of nodes) {
    const placed = g.node(node.id);
    node.position = {
      x: placed.x - (node.width ?? 250) / 2,
      y: placed.y - (node.height ?? 120) / 2,
    };
  }
  return { nodes, edges };
}
