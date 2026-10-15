import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import { copyText } from '../lib/clipboard';

type CopyState = 'idle' | 'copied' | 'failed';

interface Props {
  /** Exact text placed on the clipboard. */
  value: string;
  /** Short description used in the button's accessible name. */
  label: string;
  /** Optional caption shown above the command. */
  caption?: string;
  multiline?: boolean;
}

export function CopyCommand({ value, label, caption, multiline = false }: Props) {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function onCopy() {
    const ok = await copyText(value);
    setState(ok ? 'copied' : 'failed');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 2000);
  }

  const buttonText = state === 'copied' ? t('copy.copied') : t('copy.copy');
  return (
    <div className="copy">
      {caption ? <div className="copy-caption">{caption}</div> : null}
      <div className={`copy-row${multiline ? ' copy-row-multiline' : ''}`}>
        <pre className="copy-value" tabIndex={0} aria-label={label}>
          <code>{value}</code>
        </pre>
        <button
          type="button"
          className={`button button-copy is-${state}`}
          onClick={onCopy}
          aria-label={t('copy.ariaLabel', { label })}
        >
          {buttonText}
        </button>
      </div>
      <span className="visually-hidden" role="status" aria-live="polite">
        {state === 'copied' ? t('copy.announceCopied', { label }) : state === 'failed' ? t('copy.failed') : ''}
      </span>
      {state === 'failed' ? <p className="copy-error">{t('copy.failed')}</p> : null}
    </div>
  );
}
