import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { useStore } from 'zustand';
import { workspaceStore } from '../state/workspace';
import { translator } from '../lib/i18n';

export function Button({
  children,
  className = '',
  ...props
}: ComponentProps<typeof motion.button>) {
  const animations = useStore(workspaceStore, (s) => s.settings.animations),
    reduced = useReducedMotion();
  return (
    <motion.button
      type="button"
      className={`button ${className}`}
      whileTap={!animations || reduced || props.disabled ? undefined : { scale: 0.97 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
  side = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: ReactNode;
  wide?: boolean;
  side?: boolean;
}) {
  const animations = useStore(workspaceStore, (s) => s.settings.animations),
    language = useStore(workspaceStore, (s) => s.language);
  const reduce = useReducedMotion(),
    duration = !animations || reduce ? 0 : 0.18,
    t = translator(language);
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <AnimatePresence>
        {open ? (
          <Dialog.Portal forceMount key="modal">
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.section
                dir={language === 'fa' ? 'rtl' : 'ltr'}
                className={`modal ${wide ? 'modal-wide' : ''} ${side ? 'modal-side' : ''}`}
                initial={{
                  opacity: 0,
                  x: side && !reduce && animations ? (language === 'fa' ? -24 : 24) : 0,
                  y: side || reduce || !animations ? 0 : 12,
                }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{
                  opacity: 0,
                  x: side && !reduce && animations ? (language === 'fa' ? -20 : 20) : 0,
                  y: side || reduce || !animations ? 0 : 8,
                }}
                transition={{ duration }}
              >
                <header className="modal-header">
                  <div>
                    <Dialog.Title>{title}</Dialog.Title>
                    <Dialog.Description className="sr-only">{description}</Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <Button className="icon-button" aria-label={t('close')}>
                      <X size={20} />
                    </Button>
                  </Dialog.Close>
                </header>
                <div className="modal-content">{children}</div>
              </motion.section>
            </Dialog.Content>
          </Dialog.Portal>
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  );
}
export function FieldCard({
  title,
  children,
  tone = '',
}: {
  title: string;
  children: ReactNode;
  tone?: 'benefit' | 'risk' | 'info' | '';
}) {
  return (
    <section className={`field-card ${tone}`}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}
