import { fmtMoney, fmtPct1, signedMoney } from '../shared/format.js';

export const DEFAULTS = { arr: 5000000, churn: 10, contraction: 3, expansion: 8, newArr: 1500000, grossMargin: 75, programCost: 150000, programReduction: 3 };
export const LIMITS = { arr: [50000, 1000000000], churn: [0, 60], contraction: [0, 30], expansion: [0, 80], newArr: [0, 500000000], grossMargin: [10, 100], programCost: [0, 50000000], programReduction: [0, 30] };
export const PRESETS = [
  { id: 'leaky', name: 'Leaky bucket', note: 'NRR under 100%', inputs: { arr: 3000000, churn: 18, contraction: 5, expansion: 6, newArr: 1200000, programCost: 120000, programReduction: 4 } },
  { id: 'steady', name: 'Slightly leaky', note: 'NRR about 95%', inputs: {} },
  { id: 'expander', name: 'Strong expansion', note: 'NRR about 115%', inputs: { arr: 20000000, churn: 6, contraction: 2, expansion: 23, newArr: 6000000, programCost: 400000, programReduction: 2 } },
];

export const YEARS = 3;
export const nrrOf = (i, churn = i.churn) => Math.max(0, 100 - churn - i.contraction + i.expansion);
export const grrOf = (i, churn = i.churn) => Math.max(0, 100 - churn - i.contraction);

// ARR path. New logos are added over the year and, to keep the math simple, are not churned in the year they are won.
export function path(i, churn) {
  const nrr = nrrOf(i, churn) / 100;
  const arr = [i.arr]; const rev = [];
  for (let y = 1; y <= YEARS; y++) {
    const start = arr[y - 1]; const end = start * nrr + i.newArr;
    arr.push(end); rev.push((start + end) / 2); // revenue in a year is approximated by the average of opening and closing ARR
  }
  return { arr, rev };
}

export function model(i) {
  const nrr = nrrOf(i); const grr = grrOf(i);
  const base = path(i, i.churn);
  const improvedChurn = Math.max(0, i.churn - i.programReduction);
  const better = path(i, improvedChurn);
  const gp = i.grossMargin / 100;
  const incArr3 = better.arr[YEARS] - base.arr[YEARS];
  const incGp = (better.rev.reduce((a, b) => a + b, 0) - base.rev.reduce((a, b) => a + b, 0)) * gp;
  const cost3 = i.programCost * YEARS;
  const programNet = incGp - cost3;
  // Churn reduction (points a year) that would make the program break even over three years.
  let breakEvenPts = null;
  if (cost3 > 0) {
    const gain = (pts) => { const p = path(i, Math.max(0, i.churn - pts)); return (p.rev.reduce((a, b) => a + b, 0) - base.rev.reduce((a, b) => a + b, 0)) * gp; };
    if (gain(i.churn) >= cost3) { let lo = 0; let hi = i.churn; for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (gain(mid) >= cost3) hi = mid; else lo = mid; } breakEvenPts = hi; }
  }
  // Value of one point of churn removed.
  const one = path(i, Math.max(0, i.churn - 1));
  const pointArr3 = one.arr[YEARS] - base.arr[YEARS];
  const onlyExisting = [i.arr, i.arr * nrr / 100, i.arr * Math.pow(nrr / 100, 2), i.arr * Math.pow(nrr / 100, 3)];
  const series = [0, 1, 2, 3].map((y) => ({ year: y, base: Math.round(base.arr[y]), program: Math.round(better.arr[y]), existing: Math.round(onlyExisting[y]) }));
  return {
    nrr, grr, base, better, series, incArr3, incGp, cost3, programNet, programRoi: cost3 > 0 ? (programNet / cost3) * 100 : null, breakEvenPts,
    pointArr3, existingChange: i.arr * (nrr - 100) / 100, arr3: base.arr[YEARS], growth3: ((base.arr[YEARS] / i.arr) - 1) * 100,
    newNeededToStandStill: nrr < 100 ? i.arr * (1 - nrr / 100) : 0, churnArr: i.arr * i.churn / 100,
    masked: grr < 88 && nrr >= 100,
  };
}

export function verdictFor(i, m) {
  const head = `Your existing customers are worth ${fmtPct1(m.nrr)} of last year's revenue (net revenue retention), after losing ${fmtPct1(100 - m.grr)} to churn and downgrades and gaining ${fmtPct1(i.expansion)} from expansion.`;
  let tone; let detail;
  if (m.nrr < 100) {
    tone = m.nrr < 90 ? 'bad' : 'mixed';
    detail = `Your base shrinks by about ${fmtMoney(-m.existingChange)} a year, so you must win ${fmtMoney(m.newNeededToStandStill)} of new revenue each year just to stand still. ARR reaches ${fmtMoney(m.arr3)} in 3 years with ${fmtMoney(i.newArr)} of new revenue a year.`;
  } else if (m.masked) {
    tone = 'mixed';
    detail = `Expansion is hiding a leak: you keep only ${fmtPct1(m.grr)} of revenue before upsell. If expansion slows, retention falls quickly. ARR reaches ${fmtMoney(m.arr3)} in 3 years.`;
  } else {
    tone = 'good';
    detail = `Your base grows by about ${fmtMoney(m.existingChange)} a year before any new customers. ARR reaches ${fmtMoney(m.arr3)} in 3 years.`;
  }
  if (i.programCost > 0 && i.programReduction > 0) {
    detail += m.programNet >= 0
      ? ` A ${fmtMoney(i.programCost)} a year retention program that cuts churn by ${i.programReduction} points pays for itself: about ${signedMoney(m.programNet)} net over 3 years.`
      : ` A ${fmtMoney(i.programCost)} a year retention program that cuts churn by ${i.programReduction} points does not pay for itself over 3 years (${signedMoney(m.programNet)} net).`;
  }
  return { tone, headline: head, detail };
}

export const SCENARIOS = [
  { label: 'Pessimistic', apply: (i) => ({ ...i, churn: Math.min(60, i.churn + 3), expansion: Math.max(0, i.expansion - 3), programReduction: i.programReduction * 0.5 }) },
  { label: 'Base case', apply: (i) => i },
  { label: 'Optimistic', apply: (i) => ({ ...i, churn: Math.max(0, i.churn - 2), expansion: i.expansion + 3, programReduction: i.programReduction * 1.25 }) },
];
export const SENS = [
  { label: 'Annual churn (±3 points)', worse: (i) => ({ ...i, churn: Math.min(60, i.churn + 3) }), better: (i) => ({ ...i, churn: Math.max(0, i.churn - 3) }) },
  { label: 'Expansion (±4 points)', worse: (i) => ({ ...i, expansion: Math.max(0, i.expansion - 4) }), better: (i) => ({ ...i, expansion: i.expansion + 4 }) },
  { label: 'Downgrades (±2 points)', worse: (i) => ({ ...i, contraction: i.contraction + 2 }), better: (i) => ({ ...i, contraction: Math.max(0, i.contraction - 2) }) },
  { label: 'New revenue per year (±20%)', worse: (i) => ({ ...i, newArr: i.newArr * 0.8 }), better: (i) => ({ ...i, newArr: i.newArr * 1.2 }) },
];

export const BENCH = (i, m) => [
  { label: 'Net revenue retention (NRR)', value: m.nrr, unit: '%', range: [97, 111], strength: 'survey',
    note: 'The 2025 survey of private B2B SaaS companies found a median NRR of 102% for companies with an average contract value of $25,000 to $50,000, with the lowest quartile at 97% and the top quartile at 111%. Other contract sizes differ, and the figures for them are in charts we could not read.',
    source: 'SaaS Capital, 2025 B2B SaaS retention benchmarks', url: 'https://www.saas-capital.com/research/saas-retention-benchmarks-for-private-b2b-companies/' },
];

export const HOW = [
  { h: 'Gross retention (GRR)', p: 'The share of last year\'s revenue you keep before counting any upsell: 100 minus cancellations minus downgrades. It can never go above 100 and shows how leaky the base really is.' },
  { h: 'Net retention (NRR)', p: 'Gross retention plus expansion from existing customers. Above 100% means your base grows on its own. Below 100% means you must keep winning new customers just to stay where you are.' },
  { h: 'Why both', p: 'A strong NRR can hide a weak GRR: heavy upsell to a few accounts covers for many that leave. Watch the gap.' },
  { h: 'The 3-year path', p: 'Each year the opening ARR is multiplied by NRR and the new revenue is added. Revenue for a year is approximated by the average of opening and closing ARR, so the numbers are good for comparing options, not for a budget to the dollar.' },
  { h: 'The retention program', p: 'Tests a program with a yearly cost and a number of churn points it removes. The result is the extra gross profit it keeps over three years minus what it costs. The break-even line says how many points it has to remove just to pay for itself, which is usually the number to challenge.' },
  { h: 'Value of one point', p: 'What 1 point less annual churn adds to ARR after three years. It gives a feel for how much a retention effort is worth before you design it.' },
];

