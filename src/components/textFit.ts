// Letter-spacing per headline after measuring Geist 800 in Chromium
// (scripts/qa/measure-type.mjs). Plan rule: if a line exceeds its box,
// tighten tracking to at most -0.045em before touching font size.
export const FIT = {
  opening: '-0.035em',
  solutionTop: '-0.035em',
  solutionBottom: '-0.035em',
  proof: '-0.035em',
  ending: '-0.035em',
  stage: {
    'DAY 01': '-0.035em',
    'DAYS 02 TO 05': '-0.035em',
    'DAY 06': '-0.035em',
    'DAY 07': '-0.035em',
  },
} as const;
