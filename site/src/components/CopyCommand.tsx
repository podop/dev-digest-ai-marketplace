import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import { copyText } from '../lib/clipboard';
import { Button, type IconName } from '../ui';

type CopyState = 'idle' | 'copied' | 'failed';

/** Copy-to-clipboard state with a short "copied" window. */
export function useCopy(value: string) {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  async function copy() {
    const ok = await copyText(value);
    setState(ok ? 'copied' : 'failed');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 2000);
  }
  return [state, copy] as const;
}

function Announce({ state, label }: { state: CopyState; label: string }) {
  return (
    <span className="visually-hidden" role="status" aria-live="polite">
      {state === 'copied' ? t('copy.announceCopied', { label }) : state === 'failed' ? t('copy.failed') : ''}
    </span>
  );
}

interface Props {
  /** Exact text placed on the clipboard. */
  value: string;
  /** Short description used in the button's accessible name. */
  label: string;
  /** Optional caption shown above the command. */
  caption?: string;
  multiline?: boolean;
}

/** Mono command row with a copy button (DevDigest code surface). */
export function CopyCommand({ value, label, caption, multiline = false }: Props) {
  const [state, copy] = useCopy(value);
  return (
    <div className="cat-copy" style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      {caption ? <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>{caption}</div> : null}
      <div
        style={{
          display: 'flex',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: 8,
          padding: '6px 6px 6px 12px',
          borderRadius: 6,
          border: '1px solid var(--border)',
          background: 'var(--code-bg)',
          minWidth: 0,
        }}
      >
        <pre
          className="mono"
          tabIndex={0}
          aria-label={label}
          style={{
            flex: 1,
            minWidth: 0,
            margin: 0,
            padding: '4px 0',
            fontSize: 12.5,
            lineHeight: 1.55,
            color: 'var(--text-primary)',
            overflowX: 'auto',
            // Single commands wrap so the whole command stays visible; JSON keeps its layout.
            whiteSpace: multiline ? 'pre' : 'pre-wrap',
            overflowWrap: multiline ? 'normal' : 'anywhere',
          }}
        >
          <code>{value}</code>
        </pre>
        <Button
          kind="ghost"
          size="sm"
          icon={state === 'copied' ? 'Check' : 'Copy'}
          onClick={copy}
          aria-label={t('copy.ariaLabel', { label })}
          style={state === 'copied' ? { color: 'var(--ok)', borderColor: 'var(--ok)' } : undefined}
        >
          {state === 'copied' ? t('copy.copied') : t('copy.copy')}
        </Button>
      </div>
      <Announce state={state} label={label} />
      {state === 'failed' ? <p style={{ fontSize: 12.5, color: 'var(--crit)' }}>{t('copy.failed')}</p> : null}
    </div>
  );
}

/** Primary header action that copies a command ("Copy install"). */
export function CopyButton({ value, label, children, icon = 'Copy' }: { value: string; label: string; children: string; icon?: IconName }) {
  const [state, copy] = useCopy(value);
  return (
    <>
      <Button kind="primary" icon={state === 'copied' ? 'Check' : icon} onClick={copy} title={value}>
        {state === 'copied' ? t('copy.copied') : children}
      </Button>
      <Announce state={state} label={label} />
    </>
  );
}
