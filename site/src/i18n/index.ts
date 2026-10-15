import en from './en.json';

/** Every UI string lives in en.json; components read them through `t()` / `tn()`. */
export type MessageKey = keyof typeof en;
export type Vars = Record<string, string | number>;

const messages: Record<MessageKey, string> = en;
const pluralRules = new Intl.PluralRules('en');
const numberFormat = new Intl.NumberFormat('en');

export function t(key: MessageKey, vars?: Vars): string {
  const template = messages[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  );
}

/** Keys that come in `.one` / `.other` pairs. */
export type PluralKey = { [K in MessageKey]: K extends `${infer Base}.one` ? Base : never }[MessageKey];

/** Pluralised message; `{count}` is available to the template. */
export function tn(base: PluralKey, count: number, vars?: Vars): string {
  const form = pluralRules.select(count) === 'one' ? 'one' : 'other';
  return t(`${base}.${form}` as MessageKey, { count: numberFormat.format(count), ...vars });
}

export function formatNumber(n: number): string {
  return numberFormat.format(n);
}
