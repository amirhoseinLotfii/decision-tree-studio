import type { Language } from '../state/workspace';
export function interfaceDirection(language: Language): 'rtl' | 'ltr' {
  return language === 'fa' ? 'rtl' : 'ltr';
}
export function formatNumber(language: Language, value: number): string {
  return new Intl.NumberFormat(language).format(value);
}
