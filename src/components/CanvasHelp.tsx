import { X } from 'lucide-react';
import { useStore } from 'zustand';
import { workspaceStore } from '../state/workspace';
import type { Translate } from '../lib/i18n';
export function CanvasHelp({ t }: { t: Translate }) {
  const show = useStore(workspaceStore, (s) => s.settings.showCanvasHelp),
    language = useStore(workspaceStore, (s) => s.language);
  if (!show) return null;
  return (
    <div className="canvas-instructions" dir={language === 'fa' ? 'rtl' : 'ltr'}>
      <span>{t('controls')}</span>
      <button
        type="button"
        aria-label={t('close')}
        onClick={() => workspaceStore.getState().setSetting('showCanvasHelp', false)}
      >
        <X size={14} />
      </button>
    </div>
  );
}
