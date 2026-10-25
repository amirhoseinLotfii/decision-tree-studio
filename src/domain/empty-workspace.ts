import type { DecisionDocument } from './schema';
// Rendering fallback only. Never persisted or exported as a user document.
export const emptyWorkspace: DecisionDocument = {
  formatVersion: '1.0',
  id: 'empty-workspace',
  version: '1',
  title: '',
  description: '',
  locale: 'en',
  direction: 'ltr',
  nodes: [],
  sources: [],
};
