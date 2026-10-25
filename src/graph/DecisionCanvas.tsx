import { CanvasHelp } from '../components/CanvasHelp';
import { memo, useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap, Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import {
  Check,
  CircleHelp,
  Clock3,
  GitBranch,
  LockKeyhole,
  MessageSquare,
  Minus,
  TriangleAlert,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useStore } from 'zustand';
import { workspaceStore } from '../state/workspace';
import type { DecisionDocument } from '../domain/schema';
import type { Evaluation, Note, Session } from '../domain/engine';
import { buildGraph } from './layout';
import type { StudioNode } from './layout';
import type { Translate } from '../lib/i18n';
import '@xyflow/react/dist/style.css';

const icons = {
  answered: Check,
  ready: CircleHelp,
  blocked: LockKeyhole,
  deferred: Clock3,
  review: TriangleAlert,
  inactive: Minus,
  topic: GitBranch,
};
const DecisionCard = memo(function DecisionCard({ data }: NodeProps<StudioNode>) {
  const Icon = icons[data.status],
    reduced = useReducedMotion(),
    animations = useStore(workspaceStore, (s) => s.settings.animations);
  return (
    <>
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <button
        type="button"
        dir={data.direction}
        className={`graph-card nodrag ${data.kind} ${data.status}`}
      >
        <span className="graph-meta">
          <bdi>{data.subtitle}</bdi>
          <span className="node-status">
            <Icon size={16} />
          </span>
        </span>
        <strong>{data.title}</strong>
        {data.noteCount ? (
          <motion.span
            key={data.noteCount}
            initial={{ scale: animations && !reduced ? 0.8 : 1 }}
            animate={{ scale: 1 }}
            transition={{ duration: animations && !reduced ? 0.16 : 0 }}
            className="node-notes"
          >
            <MessageSquare size={12} />
            {data.noteCount}
          </motion.span>
        ) : null}
      </button>
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </>
  );
});
const nodeTypes = { decision: DecisionCard };
export default function DecisionCanvas({
  doc,
  result,
  session,
  dependencies,
  minimap,
  onOpen,
  onNote,
  t,
}: {
  doc: DecisionDocument;
  result: Evaluation;
  session: Session;
  dependencies: boolean;
  minimap: boolean;
  onOpen: (id: string | null) => void;
  onNote: (target: Note['target']) => void;
  t: Translate;
}) {
  const theme = useStore(workspaceStore, (s) => s.theme);
  const counts = useMemo(() => {
    const next: Record<string, number> = {};
    for (const n of session.notes)
      if (n.target.type === 'node') next[n.target.id] = (next[n.target.id] ?? 0) + 1;
    return next;
  }, [session.notes]);
  const graph = useMemo(
    () => buildGraph(doc, result, counts, dependencies),
    [doc, result, counts, dependencies],
  );
  return (
    <div className="canvas-host" dir="ltr">
      <ReactFlow<StudioNode>
        key={`${doc.id}:${doc.version}`}
        nodes={graph.nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        deleteKeyCode={null}
        panOnDrag={[0, 1]}
        panOnScroll
        zoomOnScroll={false}
        zoomActivationKeyCode="Control"
        panActivationKeyCode="Space"
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.01}
        maxZoom={2.5}
        onlyRenderVisibleElements
        colorMode={theme}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(event, node) => {
          if (event.altKey) {
            if (node.data.noteId) onNote({ type: 'node', id: node.data.noteId });
          } else onOpen(node.data.openId);
        }}
        onEdgeClick={(event, edge) => {
          if (event.altKey) {
            const data = graph.edges.find((e) => e.id === edge.id)?.data;
            if (data)
              onNote({ type: 'edge', source: data.semanticSource, target: data.semanticTarget });
          }
        }}
      >
        <Background gap={26} size={1} color="var(--canvas-dot)" />
        <Controls showInteractive={false} />
        {minimap ? (
          <MiniMap
            pannable
            zoomable
            nodeStrokeWidth={3}
            nodeColor={(node) => (node.data.status === 'answered' ? '#83cda5' : '#405069')}
          />
        ) : null}
      </ReactFlow>
      <CanvasHelp t={t} />
    </div>
  );
}
