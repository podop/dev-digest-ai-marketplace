import { t } from '../i18n';
import type { DocKind } from '../lib/types';

const LABEL_KEYS = { plugin: 'type.plugin', skill: 'type.skill', agent: 'type.agent' } as const;

export function TypeBadge({ kind }: { kind: DocKind }) {
  return <span className={`badge badge-${kind}`}>{t(LABEL_KEYS[kind])}</span>;
}
