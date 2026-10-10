/** 画面の線の絵(見本の線アイコンに合わせて自作。太さ 1.7・角丸) */
import type { ReactNode } from 'react';

function I(p: { children: ReactNode; size?: number; className?: string; label?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={p.size ?? 22} height={p.size ?? 22} className={p.className} fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden={p.label ? undefined : true} aria-label={p.label} role={p.label ? 'img' : undefined}>
      {p.children}
    </svg>
  );
}
type P = { size?: number; className?: string; label?: string };

export const IcBack = (p: P) => <I {...p}><path d="M15 5l-7 7 7 7" /></I>;
export const IcClose = (p: P) => <I {...p}><path d="M6 6l12 12M18 6L6 18" /></I>;
export const IcNext = (p: P) => <I {...p}><path d="M9 5l7 7-7 7" /></I>;
export const IcGear = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-2.6-1.5L14.2 2.6h-4l-.4 2.4a7.6 7.6 0 0 0-2.6 1.5l-2.3-.9-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.3-.9a7.6 7.6 0 0 0 2.6 1.5l.4 2.4h4l.4-2.4a7.6 7.6 0 0 0 2.6-1.5l2.3.9 2-3.4-2-1.5Z" />
  </I>
);
export const IcImage = (p: P) => (
  <I {...p}><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="M3.5 17l5-5 4 4 3-3 5 5" /></I>
);
export const IcCalendar = (p: P) => (
  <I {...p}><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /><path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.5h2M11 16.5h2" /></I>
);
export const IcSun = (p: P) => (
  <I {...p}><circle cx="12" cy="12" r="3.6" /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" /></I>
);
export const IcGrain = (p: P) => (
  <I {...p}>
    {[[6, 6], [12, 5], [18, 6], [8.5, 10], [15.5, 10], [5, 13], [12, 12.5], [19, 13], [8.5, 16], [15.5, 16], [6, 19.5], [12, 19.5], [18, 19.5]].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r="0.9" fill="currentColor" stroke="none" />
    ))}
  </I>
);
export const IcFilter = (p: P) => (
  <I {...p}><circle cx="9" cy="9.5" r="5" /><circle cx="15" cy="9.5" r="5" /><circle cx="12" cy="14.5" r="5" /></I>
);
export const IcFlip = (p: P) => (
  <I {...p}>
    <path d="M8.5 5.5 10 3.8h4l1.5 1.7H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2h3.5Z" />
    <path d="M8.3 12.2a3.8 3.8 0 0 1 6.6-2.2M15.7 12.8a3.8 3.8 0 0 1-6.6 2.2" /><path d="M15.4 8.2v2.1h-2.1M8.6 16.8v-2.1h2.1" />
  </I>
);
export const IcReset = (p: P) => (
  <I {...p}><path d="M12 4a8 8 0 1 1-7.4 5" /><path d="M12 1.8V6" /></I>
);
export const IcEye = (p: P) => (
  <I {...p}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></I>
);
export const IcStrength = (p: P) => (
  <I {...p}><path d="M4 18 20 6" /><path d="M5 7.5h5M7.5 5v5M14 17h5" /></I>
);
export const IcShuffle = (p: P) => (
  <I {...p}><path d="M3 7h3.5c4.5 0 6.5 10 11 10H21M3 17h3.5c1.6 0 2.8-1.3 3.8-3M14 8.6C15 7.6 16 7 17.5 7H21" /><path d="M18.5 4.5 21 7l-2.5 2.5M18.5 14.5 21 17l-2.5 2.5" /></I>
);
export const IcCheck = (p: P) => <I {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></I>;
export const IcCheckCircle = (p: P) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M7.8 12.3l3 3 5.4-5.6" /></I>;
export const IcCrown = (p: P) => (
  <I {...p}><path d="M3.5 8l4.5 4 4-6.5 4 6.5 4.5-4-1.8 10.5H5.3L3.5 8Z" fill="currentColor" stroke="none" /></I>
);
export const IcLock = (p: P) => (
  <I {...p}><rect x="5" y="10.5" width="14" height="10" rx="2.2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /><path d="M12 14.5v2.5" /></I>
);
export const IcPhone = (p: P) => <I {...p}><rect x="6.5" y="2.8" width="11" height="18.4" rx="2.4" /><path d="M10.5 18h3" /></I>;
export const IcUser = (p: P) => <I {...p}><circle cx="12" cy="8" r="3.8" /><path d="M4.5 20.5c1.2-4 4-5.8 7.5-5.8s6.3 1.8 7.5 5.8" /></I>;
export const IcNoAds = (p: P) => (
  <I {...p}><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /><path d="M8.5 15l1.6-6h1.2l1.6 6M9 13.2h3.4M14.6 9v6h1c1.4 0 2-1.2 2-3s-.6-3-2-3h-1Z" /></I>
);
export const IcNoName = (p: P) => (
  <I {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M7 15.5h5" /><path d="M4 4l16 16" /></I>
);
export const IcSliders = (p: P) => (
  <I {...p}><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></I>
);
export const IcHelp = (p: P) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6v.7" /><circle cx="12" cy="17.3" r=".6" fill="currentColor" /></I>;
export const IcShield = (p: P) => <I {...p}><path d="M12 3 5 5.8v5.4c0 4.6 3 8.2 7 9.8 4-1.6 7-5.2 7-9.8V5.8L12 3Z" /><path d="M9 12l2.2 2.2L15.3 10" /></I>;
export const IcInfo = (p: P) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5" /><circle cx="12" cy="7.7" r=".7" fill="currentColor" /></I>;
export const IcRestore = (p: P) => <I {...p}><path d="M4 12a8 8 0 1 0 2.4-5.7L4 8.7" /><path d="M4 4v4.7h4.7" /></I>;
export const IcDownload = (p: P) => <I {...p}><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" /><path d="M4.5 16.5v2.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-2.5" /></I>;
export const IcEdit = (p: P) => <I {...p}><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="M13.5 6.5l4 4" /></I>;
export const IcCamera = (p: P) => (
  <I {...p}><path d="M8.5 5.5 10 3.8h4l1.5 1.7H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2h3.5Z" /><circle cx="12" cy="12.5" r="4" /></I>
);
export const IcGrid = (p: P) => (
  <I {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></I>
);

/** 鍵の印(完全版の効果)。塗りつぶし */
export function LockBadge() {
  return (
    <svg className="lock" viewBox="0 0 16 16" width="12" height="12" aria-label="完全版" role="img">
      <rect x="3" y="7" width="10" height="7.5" rx="1.6" fill="currentColor" />
      <path d="M5.2 7V5.2a2.8 2.8 0 0 1 5.6 0V7" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
