import { useEffect, useRef } from 'react';
import { LOOKS } from '../fx/presets';
import { IcGrid, LockBadge } from './icons';
import { lookThumb } from './lookInfo';

/** 味の一覧(横に流す)。見本の写真に名前。完全版の味には鍵の印。先頭に「一覧」 */
export function LookStrip(p: { value: string; premium: boolean; onChange: (id: string) => void; onAll?: () => void }) {
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
      {p.onAll && (
        <button className="look look-all" data-testid="open-looks" onClick={p.onAll}>
          <span className="look-thumb all"><IcGrid size={22} /></span>
          <span className="look-name">一覧</span>
        </button>
      )}
      {LOOKS.map((l) => {
        const t = lookThumb(l.id);
        return (
          <button key={l.id} role="option" aria-selected={l.id === p.value} data-active={l.id === p.value ? '1' : '0'} data-look={l.id}
            className={'look' + (l.id === p.value ? ' on' : '')} onClick={() => p.onChange(l.id)}>
            <span className={'look-thumb sw-' + l.id}>
              {t && <img src={t} alt="" draggable={false} />}
              {!l.free && !p.premium && <span className="look-lock"><LockBadge /></span>}
            </span>
            <span className="look-name">{l.name}</span>
          </button>
        );
      })}
    </div>
  );
}
