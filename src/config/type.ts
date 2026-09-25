// Typography tokens (plan section 4). Geist and Geist Mono are loaded from
// local variable woff2 files in public/fonts before any frame renders.
export const FONT_SANS = 'Geist';
export const FONT_MONO = 'Geist Mono';

export const TYPE = {
  headline: {
    fontFamily: FONT_SANS,
    fontWeight: 800,
    textTransform: 'uppercase' as const,
    letterSpacing: '-0.035em',
    lineHeight: 0.96,
  },
  support: {
    fontFamily: FONT_SANS,
    fontWeight: 500,
    lineHeight: 1.15,
  },
  mono: {
    fontFamily: FONT_MONO,
    fontWeight: 500,
    letterSpacing: '0.06em',
  },
  size: {
    opening: 100,
    main: 82,
    stage: 66,
    support: 36,
    website: 42,
    ending: 88,
    solutionTop: 64,
    solutionBottom: 96,
    dayLabel: 30,
    uiLabel: 22,
    uiSmall: 18,
    preview: 30,
  },
} as const;
