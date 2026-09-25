// Locked palette from the plan (section 4). Essential text stays pure white.
export const PALETTE = {
  background: '#0A0A0F',
  surface: '#12121A',
  surfaceRaised: '#171722',
  magenta: '#E040FB',
  violet: '#7C4DFF',
  cyan: '#00E5FF',
  white: '#FFFFFF',
  text72: 'rgba(255,255,255,0.72)',
  text48: 'rgba(255,255,255,0.48)',
  // Ribbon core: a dark violet derived from #7C4DFF, dark enough to occlude.
  ribbonCore: '#1A0F33',
  ribbonCoreDeep: '#120A24',
} as const;

export const rgba = (hex: string, alpha: number) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

// Borders: 2 px magenta at 25 % opacity; active edges at 75 %.
export const BORDER_IDLE = rgba(PALETTE.magenta, 0.25);
export const BORDER_ACTIVE = rgba(PALETTE.magenta, 0.75);
