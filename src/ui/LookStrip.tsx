import { useEffect, useRef } from 'react';
import { LOOKS } from '../fx/presets';

/** 味の一覧(横に流す)。完全版の味には鍵の印 */
export function LookStrip(p: { value: string; premium: boolean; onChange: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    // 選んでいる味を帯の中央へ(ページ全体は動かさない)
    const box = ref.current, el = box?.querySelector<HTMLElement>('[data-active="1"]');
    if (!box || !el) return;
    const left = el.offsetLeft - (box.clientWidth - el.offsetWidth) / 2;
    box.scrollTo({ left, behavior: first.current ? 'auto' : 'smooth' });
    first.current = false;
  }, [p.value]);
  return (
    <div className="looks" ref={ref} role="listbox" aria-label="効果">
      {LOOKS.map((l) => (
        <button key={l.id} role="option" aria-selected={l.id === p.value} data-active={l.id === p.value ? '1' : '0'} data-look={l.id}
          className={'look' + (l.id === p.value ? ' on' : '')} onClick={() => p.onChange(l.id)}>
          <span className={'swatch sw-' + l.id} />
          <span className="look-name">{l.name}{!l.free && !p.premium && <LockIcon />}</span>
          <span className="look-note">{l.note}</span>
        </button>
      ))}
    </div>
  );
}

export function LockIcon() {
  return (
    <svg className="lock" viewBox="0 0 16 16" width="13" height="13" aria-label="完全版" role="img">
      <rect x="3" y="7" width="10" height="7.5" rx="1.6" fill="currentColor" />
      <path d="M5.2 7V5.2a2.8 2.8 0 0 1 5.6 0V7" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
