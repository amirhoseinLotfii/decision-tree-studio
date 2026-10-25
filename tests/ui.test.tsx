import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestionDialog } from '../src/components/QuestionDialog';
import { ImportDialog } from '../src/components/ImportDialog';
import { Modal } from '../src/components/ui';
import { workspaceStore } from '../src/state/workspace';
import { emptySession, evaluate, recordAnswer } from '../src/domain/engine';
import { translator } from '../src/lib/i18n';
import { fixture } from './fixtures';

const t = translator('en');
beforeEach(() => {
  workspaceStore.getState().setSetting('animations', false);
  workspaceStore.getState().loadDocument(fixture(), emptySession());
});
describe('question interaction (DOM, not browser automation)', () => {
  it('shows full question, evidence and one current explanation; records only on explicit save', async () => {
    const d = fixture();
    if (d.nodes[0]?.kind === 'question') {
      d.nodes[0].options[0]!.benefits = ['Keeps data local'];
      d.nodes[0].options[1]!.benefits = ['Supports another route'];
    }
    workspaceStore.getState().loadDocument(d);
    const close = vi.fn(),
      s = workspaceStore.getState().sessions.test!;
    render(
      <QuestionDialog
        open
        node={d.nodes[0]!}
        doc={d}
        session={s}
        result={evaluate(d, s)}
        onClose={close}
        onOpen={vi.fn()}
        onNote={vi.fn()}
        onDelete={vi.fn()}
        notify={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Choose A?' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Yes/ })).toBeChecked();
    expect(workspaceStore.getState().sessions.test?.answers.a).toBeUndefined();
    expect(screen.getByText('Keeps data local')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Record answer' }));
    expect(workspaceStore.getState().sessions.test?.answers.a?.optionId).toBe('yes');
    expect(close).toHaveBeenCalledOnce();
  });
  it('renders excluded paths as explanation-only with no answer controls', () => {
    const d = fixture(),
      s = recordAnswer(d, emptySession(), 'a', 'no');
    render(
      <QuestionDialog
        open
        node={d.nodes[1]!}
        doc={d}
        session={s}
        result={evaluate(d, s)}
        onClose={vi.fn()}
        onOpen={vi.fn()}
        onNote={vi.fn()}
        onDelete={vi.fn()}
        notify={vi.fn()}
        t={t}
      />,
    );
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Record answer' })).not.toBeInTheDocument();
    expect(
      screen.getByText('This path does not apply to your recorded choices'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Review the deciding question' }),
    ).toBeInTheDocument();
  });
  it('blocks recording until prerequisites are resolved', () => {
    const d = fixture(),
      s = emptySession();
    render(
      <QuestionDialog
        open
        node={d.nodes[1]!}
        doc={d}
        session={s}
        result={evaluate(d, s)}
        onClose={vi.fn()}
        onOpen={vi.fn()}
        onNote={vi.fn()}
        onDelete={vi.fn()}
        notify={vi.fn()}
        t={t}
      />,
    );
    expect(screen.getByRole('button', { name: 'Record answer' })).toBeDisabled();
  });
  it('validates import without replacing the workspace on invalid data', async () => {
    const load = vi.fn();
    render(<ImportDialog open onClose={vi.fn()} current={fixture()} onLoad={load} t={t} />);
    fireEvent.change(screen.getByLabelText('Document or session JSON'), {
      target: { value: '{"nodes":[]}' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Validate & open' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });
  it('closes a modal with Escape', async () => {
    const close = vi.fn();
    render(
      <Modal open title="Example" description="Example dialog" onClose={close}>
        <p>Content</p>
      </Modal>,
    );
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(close).toHaveBeenCalled());
  });
  it('dismisses on an outside overlay click', async () => {
    const close = vi.fn();
    render(
      <Modal open title="Outside" description="Outside dismissal" onClose={close}>
        <p>Inside</p>
      </Modal>,
    );
    const overlay = document.querySelector('.modal-overlay');
    expect(overlay).not.toBeNull();
    await userEvent.click(overlay!);
    expect(close).toHaveBeenCalled();
  });
});
