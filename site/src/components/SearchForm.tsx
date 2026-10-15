import { useEffect, useState, type FormEvent } from 'react';
import { t } from '../i18n';
import { navigate, routes } from '../lib/router';

interface Props {
  variant: 'header' | 'hero';
  initialQuery?: string;
}

/** Search box that submits to the search page. `data-search` lets the `/` shortcut find it. */
export function SearchForm({ variant, initialQuery = '' }: Props) {
  const [query, setQuery] = useState(initialQuery);
  useEffect(() => setQuery(initialQuery), [initialQuery]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    navigate(routes.search(query.trim()));
  }

  const inputId = `search-${variant}`;
  return (
    <form className={`search-form search-form-${variant}`} role="search" onSubmit={onSubmit}>
      <label htmlFor={inputId} className="visually-hidden">
        {t('search.label')}
      </label>
      <input
        id={inputId}
        type="search"
        className="input search-input"
        placeholder={variant === 'hero' ? t('search.placeholderLong') : t('search.placeholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        data-search={variant === 'hero' ? 'primary' : 'header'}
        autoComplete="off"
        spellCheck={false}
      />
      <button type="submit" className="button button-primary">
        {t('search.submit')}
      </button>
    </form>
  );
}
