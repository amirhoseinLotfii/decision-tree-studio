import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocalizedSelect } from '../src/components/LocalizedSelect';
import { workspaceStore, createWorkspaceStore } from '../src/state/workspace';
import { emptySession } from '../src/domain/engine';
import { fixture, memoryStorage } from './fixtures';
import { interfaceDirection, formatNumber } from '../src/lib/locale';
import App from '../src/App';

vi.mock('../src/graph/DecisionCanvas', () => ({ default: () => <div data-testid="graph" /> }));
beforeEach(() => {
  workspaceStore.getState().loadDocument(fixture(), emptySession());
  workspaceStore.getState().setLanguage('en');
  workspaceStore.getState().setSetting('animations', false);
});
describe('localized shadcn selects and interface direction', () => {
  it('opens a themed portalled RTL listbox and records a selected item', async () => {
    workspaceStore.getState().setLanguage('fa');
    const change = vi.fn();
    render(
      <LocalizedSelect
        id="test-select"
        label="وضعیت"
        value="all"
        onValueChange={change}
        options={[
          { value: 'all', label: 'همه' },
          { value: 'ready', label: 'آماده' },
        ]}
      />,
    );
    const trigger = screen.getByRole('combobox', { name: 'وضعیت' });
    expect(trigger).toHaveAttribute('dir', 'rtl');
    await userEvent.click(trigger);
    const list = screen.getByRole('listbox');
    expect(list).toHaveAttribute('dir', 'rtl');
    expect(list).toHaveAttribute('data-slot', 'select-content');
    await userEvent.click(within(list).getByRole('option', { name: 'آماده' }));
    expect(change).toHaveBeenCalledWith('ready');
  });
  it('supports keyboard selection in LTR', async () => {
    const change = vi.fn();
    render(
      <LocalizedSelect
        id="keyboard-select"
        label="Status"
        value="all"
        onValueChange={change}
        options={[
          { value: 'all', label: 'All' },
          { value: 'ready', label: 'Ready' },
        ]}
      />,
    );
    screen.getByRole('combobox').focus();
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{End}{Enter}');
    expect(change).toHaveBeenCalledWith('ready');
  });
  it('switches root direction, translated controls and directional icons without changing content or answers', async () => {
    workspaceStore.getState().answer('a', 'yes');
    render(<App />);
    expect(document.documentElement).toHaveAttribute('lang', 'en');
    expect(document.documentElement).toHaveAttribute('dir', 'ltr');
    await userEvent.click(screen.getByRole('button', { name: 'Interface language' }));
    expect(document.documentElement).toHaveAttribute('lang', 'fa');
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(screen.getByRole('combobox', { name: 'وضعیت تصمیم' })).toHaveAttribute('dir', 'rtl');
    expect(workspaceStore.getState().documents.test?.direction).toBe('ltr');
    expect(workspaceStore.getState().sessions.test?.answers.a?.optionId).toBe('yes');
    expect(screen.getByRole('button', { name: 'سؤال بعدی' }).querySelector('svg')).toHaveClass(
      'lucide-arrow-left',
    );
    await userEvent.click(screen.getByRole('button', { name: 'زبان رابط' }));
    expect(document.documentElement).toHaveAttribute('dir', 'ltr');
    expect(screen.getByRole('button', { name: 'Next question' }).querySelector('svg')).toHaveClass(
      'lucide-arrow-right',
    );
  });
  it('isolates the numerator and denominator as LTR in a Persian interface', () => {
    workspaceStore.getState().setLanguage('fa');
    render(<App />);
    const ratio = document.querySelector('.progress-caption bdi');
    expect(ratio).toHaveAttribute('dir', 'ltr');
    expect(ratio?.textContent).toBe('۰ / ۳');
  });
  it('persists interface language separately from document direction', () => {
    const storage = memoryStorage(),
      store = createWorkspaceStore(storage);
    store.getState().loadDocument(fixture());
    store.getState().setLanguage('fa');
    const restored = createWorkspaceStore(storage).getState();
    expect(interfaceDirection(restored.language)).toBe('rtl');
    expect(restored.documents.test?.direction).toBe('ltr');
    expect(formatNumber('fa', 12)).toBe('۱۲');
  });
  it('shows an import-first empty workspace instead of seeded questions', () => {
    workspaceStore.setState({ documents: {}, sessions: {}, activeId: '' });
    render(<App />);
    expect(screen.getAllByText('Your workspace is empty').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Next question' })).toBeDisabled();
    expect(screen.queryByTestId('graph')).not.toBeInTheDocument();
    expect(document.querySelector('.progress-caption bdi')?.textContent).toBe('0 / 0');
  });
});
