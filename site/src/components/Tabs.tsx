import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface Tab {
  id: string;
  label: string;
  render: () => ReactNode;
}

/** Accessible tabs (WAI-ARIA pattern with arrow / Home / End keys). */
export function Tabs({ tabs, active, onChange, label }: { tabs: Tab[]; active: string; onChange: (id: string) => void; label: string }) {
  const baseId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = -1;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    const tab = tabs[next];
    if (!tab) return;
    event.preventDefault();
    onChange(tab.id);
    refs.current[next]?.focus();
  }

  if (!current) return null;
  return (
    <div className="tabs">
      <div className="tablist" role="tablist" aria-label={label}>
        {tabs.map((tab, i) => {
          const selected = tab.id === current.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              className="tab"
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        className="tabpanel"
        role="tabpanel"
        id={`${baseId}-panel-${current.id}`}
        aria-labelledby={`${baseId}-tab-${current.id}`}
        tabIndex={0}
      >
        {current.render()}
      </div>
    </div>
  );
}
