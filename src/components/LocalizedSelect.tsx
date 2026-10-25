import { useStore } from 'zustand';
import { workspaceStore } from '../state/workspace';
import { interfaceDirection } from '../lib/locale';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

type SelectOption = { value: string; label: string; direction?: 'ltr' | 'rtl' };
export function LocalizedSelect({
  id,
  label,
  value,
  options,
  onValueChange,
  className,
}: {
  id: string;
  label: string;
  value: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
  className?: string;
}) {
  const language = useStore(workspaceStore, (state) => state.language);
  const direction = interfaceDirection(language);
  return (
    <Select dir={direction} value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} aria-label={label} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start" dir={direction}>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <bdi dir={option.direction ?? direction} title={option.label}>
                {option.label}
              </bdi>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
