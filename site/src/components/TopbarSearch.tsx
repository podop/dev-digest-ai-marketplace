import { useState, type FormEvent } from 'react';
import { t } from '../i18n';
import { navigate, routes } from '../lib/router';
import { Icon, Kbd } from '../ui';

/** "Search or jump to…" field in the topbar. Submits to `#/search?q=`; `/` and Ctrl/Cmd+K focus it. */
export function TopbarSearch() {
  const [query, setQuery] = useState('');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    navigate(routes.search(query.trim()));
    setQuery('');
  }

  return (
    <form role="search" onSubmit={onSubmit} className="dd-topbar-search" aria-label={t('search.label')}>
      <label
        className="dd-field"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 8px 6px 12px',
          borderRadius: 7,
          border: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          color: 'var(--text-muted)',
          fontSize: 13,
          cursor: 'text',
        }}
      >
        <Icon.Search size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
        <span className="visually-hidden">{t('search.label')}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search.topbarPlaceholder')}
          data-search="header"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontSize: 13,
            padding: '2px 0',
          }}
        />
        <span aria-hidden="true" title={t('search.shortcutHint')}>
          <Kbd>{t('search.kbd')}</Kbd>
        </span>
      </label>
    </form>
  );
}
