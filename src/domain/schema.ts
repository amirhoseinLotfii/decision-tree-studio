import { z } from 'zod';

const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/)
  .refine(
    (value) => !Object.hasOwn(Object.prototype, value) && value !== 'prototype',
    'Reserved ID',
  );
const text = z.string().trim().min(1).max(20_000);
const rule = z.object({ questionId: id, optionId: id });
export const conditionSchema = z.object({
  mode: z.enum(['all', 'any']),
  rules: z.array(rule).min(1).max(100),
});
const optionSchema = z.object({
  id,
  label: text,
  description: z.string().max(20_000).default(''),
  benefits: z.array(text).default([]),
  risks: z.array(text).default([]),
  example: z.string().max(20_000).default(''),
  outcome: z.string().max(20_000).default(''),
  recommended: z.boolean().default(false),
  defer: z.boolean().default(false),
  rationale: z.string().max(20_000).default(''),
  sourceIds: z.array(id).default([]),
});
const base = { id, title: text, parentId: id.nullable().default(null) };
const groupSchema = z.object({
  ...base,
  kind: z.literal('group'),
  description: z.string().max(20_000).default(''),
});
const questionSchema = z.object({
  ...base,
  kind: z.literal('question'),
  prompt: text,
  example: z.string().max(20_000).default(''),
  revision: z.number().int().positive().default(1),
  dependsOn: z.array(id).default([]),
  when: conditionSchema.optional(),
  options: z.array(optionSchema).min(2).max(30),
  tags: z.array(z.string().max(80)).max(30).default([]),
});
export const documentSchema = z.object({
  formatVersion: z.literal('1.0'),
  id,
  version: text,
  title: text,
  description: z.string().max(20_000).default(''),
  locale: z.enum(['en', 'fa']).default('en'),
  direction: z.enum(['ltr', 'rtl']).default('ltr'),
  nodes: z
    .array(z.discriminatedUnion('kind', [groupSchema, questionSchema]))
    .min(1)
    .max(5000),
  sources: z
    .array(
      z.object({
        id,
        title: text,
        kind: z.enum(['external', 'prior-decision', 'analysis']),
        claim: text,
        url: z
          .url()
          .refine((value) => /^https?:\/\//i.test(value), 'Only HTTP(S) source links are allowed.')
          .optional(),
      }),
    )
    .max(5000)
    .default([]),
});
export type DecisionDocument = z.infer<typeof documentSchema>;
export type DecisionNode = DecisionDocument['nodes'][number];
export type Question = Extract<DecisionNode, { kind: 'question' }>;
export type Option = Question['options'][number];
export type Source = DecisionDocument['sources'][number];
export type Condition = z.infer<typeof conditionSchema>;

export class DocumentError extends Error {
  constructor(public readonly issues: string[]) {
    super(issues.join('\n'));
    this.name = 'DocumentError';
  }
}

export function prerequisiteIds(
  doc: DecisionDocument,
  q: Question,
  includeConditions = true,
): string[] {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const ids = new Set([
    ...q.dependsOn,
    ...(includeConditions ? (q.when?.rules.map((r) => r.questionId) ?? []) : []),
  ]);
  let parent = q.parentId;
  const seen = new Set<string>();
  while (parent && !seen.has(parent)) {
    seen.add(parent);
    const node = byId.get(parent);
    if (!node) break;
    if (node.kind === 'question') ids.add(node.id);
    parent = node.parentId;
  }
  return [...ids];
}

export function topologicalOrder(ids: string[], dependencies: Map<string, string[]>): string[] {
  const indegree = new Map(ids.map((key) => [key, dependencies.get(key)?.length ?? 0]));
  const outgoing = new Map<string, string[]>();
  for (const [key, deps] of dependencies)
    for (const dep of deps) outgoing.set(dep, [...(outgoing.get(dep) ?? []), key]);
  const queue = ids.filter((key) => indegree.get(key) === 0);
  const result: string[] = [];
  for (let index = 0; index < queue.length; index++) {
    const key = queue[index];
    if (!key) continue;
    result.push(key);
    for (const child of outgoing.get(key) ?? []) {
      const remaining = (indegree.get(child) ?? 0) - 1;
      indegree.set(child, remaining);
      if (remaining === 0) queue.push(child);
    }
  }
  if (result.length !== ids.length)
    throw new DocumentError(['A parent or prerequisite cycle was detected.']);
  return result;
}

export function validateDocument(input: unknown): DecisionDocument {
  const parsed = documentSchema.safeParse(input);
  if (!parsed.success)
    throw new DocumentError(
      parsed.error.issues
        .slice(0, 20)
        .map((i) => `${i.path.join('.') || 'document'}: ${i.message}`),
    );
  const doc = parsed.data,
    issues: string[] = [];
  const byId = new Map(doc.nodes.map((n) => [n.id, n]));
  const sources = new Set(doc.sources.map((s) => s.id));
  if (byId.size !== doc.nodes.length) issues.push('Node IDs must be unique.');
  if (sources.size !== doc.sources.length) issues.push('Source IDs must be unique.');
  for (const node of doc.nodes) {
    if (node.parentId && !byId.has(node.parentId))
      issues.push(`${node.id}: unknown parent ${node.parentId}.`);
    if (node.kind !== 'question') continue;
    const options = new Set(node.options.map((o) => o.id));
    if (options.size !== node.options.length) issues.push(`${node.id}: option IDs must be unique.`);
    if (node.options.filter((o) => o.recommended).length > 1)
      issues.push(`${node.id}: at most one recommendation is allowed.`);
    if (node.options.some((o) => o.recommended && o.defer))
      issues.push(`${node.id}: a deferral cannot be the recommendation.`);
    if (new Set(node.dependsOn).size !== node.dependsOn.length)
      issues.push(`${node.id}: duplicate prerequisites.`);
    for (const dep of [...node.dependsOn, ...(node.when?.rules.map((r) => r.questionId) ?? [])]) {
      if (byId.get(dep)?.kind !== 'question')
        issues.push(`${node.id}: prerequisite ${dep} must reference a question.`);
    }
    if (node.when?.mode === 'all') {
      const required = new Map<string, string>();
      for (const r of node.when.rules) {
        if (required.has(r.questionId) && required.get(r.questionId) !== r.optionId)
          issues.push(`${node.id}: contradictory all condition.`);
        required.set(r.questionId, r.optionId);
      }
    }
    for (const r of node.when?.rules ?? []) {
      const target = byId.get(r.questionId);
      if (target?.kind === 'question' && !target.options.some((o) => o.id === r.optionId))
        issues.push(`${node.id}: unknown condition option ${r.optionId}.`);
    }
    for (const o of node.options)
      for (const source of o.sourceIds)
        if (!sources.has(source)) issues.push(`${node.id}/${o.id}: unknown source ${source}.`);
  }
  if (issues.length) throw new DocumentError(issues.slice(0, 30));
  topologicalOrder(
    doc.nodes.map((n) => n.id),
    new Map(doc.nodes.map((n) => [n.id, n.parentId ? [n.parentId] : []])),
  );
  const questions = doc.nodes.filter((n): n is Question => n.kind === 'question');
  topologicalOrder(
    questions.map((q) => q.id),
    new Map(questions.map((q) => [q.id, prerequisiteIds(doc, q)])),
  );
  return doc;
}

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export function parseDocument(text: string): DecisionDocument {
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES)
    throw new DocumentError(['File exceeds the 5 MiB document limit.']);
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new DocumentError(['Invalid JSON. Check commas, quotes and brackets.']);
  }
  return validateDocument(input);
}
