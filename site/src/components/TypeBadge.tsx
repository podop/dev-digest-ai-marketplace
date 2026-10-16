import { t } from '../i18n';
import type { DocKind } from '../lib/types';
import { Badge, type IconName } from '../ui';

const LABEL_KEYS = { plugin: 'type.plugin', skill: 'type.skill', agent: 'type.agent' } as const;

/** Type colors come from DevDigest tokens: plugin → accent, skill → ok, agent → warn. */
const STYLE: Record<DocKind, { color: string; bg: string; icon: IconName }> = {
  plugin: { color: 'var(--accent-text)', bg: 'var(--accent-bg)', icon: 'Boxes' },
  skill: { color: 'var(--ok)', bg: 'var(--ok-bg)', icon: 'Sparkles' },
  agent: { color: 'var(--warn)', bg: 'var(--warn-bg)', icon: 'Cpu' },
};

export const TYPE_ICON: Record<DocKind, IconName> = { plugin: 'Boxes', skill: 'Sparkles', agent: 'Cpu' };

export function TypeBadge({ kind }: { kind: DocKind }) {
  const s = STYLE[kind];
  return (
    <Badge color={s.color} bg={s.bg} icon={s.icon} style={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 11 }}>
      {t(LABEL_KEYS[kind])}
    </Badge>
  );
}
