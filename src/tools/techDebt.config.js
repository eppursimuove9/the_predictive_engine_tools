import { fmtMoney, fmtMonths, fmtNum } from '../shared/format.js';
import { trio } from './_math.js';

export const defaults = { engineers: 40, cost: 180000, pctLost: 25, refactor: 600000, recovery: 50, ramp: 6 };
export const limits = { engineers: [1, 5000], cost: [20000, 600000], pctLost: [1, 60], refactor: [0, 100000000], recovery: [5, 100], ramp: [1, 24] };
export const presets = [
  { id: 'startup', name: 'Startup', note: '12 engineers', inputs: { engineers: 12, cost: 170000, pctLost: 30, refactor: 150000, recovery: 50, ramp: 3 } },
  { id: 'scale', name: 'Scale-up', note: '60 engineers', inputs: { engineers: 60, cost: 185000, pctLost: 22, refactor: 900000, recovery: 45, ramp: 6 } },
  { id: 'ent', name: 'Large enterprise', note: '250 engineers', inputs: { engineers: 250, cost: 160000, pctLost: 20, refactor: 6000000, recovery: 40, ramp: 12 } },
];
export function model(i) {
  const annualCost = i.engineers * i.cost * (i.pctLost / 100);
  const recoveredYear = annualCost * (i.recovery / 100);
  // Recovery phases in linearly over the ramp, then holds.
  const monthly = (t) => (recoveredYear / 12) * Math.min(1, t / i.ramp);
  let cum = -i.refactor; let payback = null;
  const series = [{ k: 0, v: Math.round(cum), drag: 0 }];
  for (let t = 1; t <= 120; t++) {
    const prev = cum; cum += monthly(t);
    if (payback === null && prev < 0 && cum >= 0) payback = t - 1 + (-prev) / monthly(t);
    if (t <= 36) series.push({ k: t, v: Math.round(cum), drag: Math.round((annualCost / 12) * t) });
  }
  if (i.refactor === 0) payback = 0;
  const net36 = series[36].v;
  return { annualCost, recoveredYear, payback, net36, fte: i.engineers * (i.pctLost / 100) * (i.recovery / 100), dragPerEngineer: i.cost * (i.pctLost / 100), series, roi36: i.refactor > 0 ? (net36 / i.refactor) * 100 : null };
}
export function verdictFor(i, m) {
  const head = `If ${i.pctLost}% of your engineers' time goes to workarounds and slow code, that costs about ${fmtMoney(m.annualCost)} a year, or ${fmtMoney(m.dragPerEngineer)} per engineer.`;
  if (m.payback === null) return { tone: 'bad', headline: head, detail: `Paying down ${i.recovery}% of it for ${fmtMoney(i.refactor)} would not pay back within ten years. Narrow the work to the parts of the code that slow people down most, or accept the drag.` };
  const frees = `It would free the equivalent of ${m.fte.toFixed(1)} engineers and net ${fmtMoney(m.net36)} over three years.`;
  if (m.payback <= 12) return { tone: 'good', headline: head, detail: `A ${fmtMoney(i.refactor)} clean-up that recovers ${i.recovery}% of it pays back in ${fmtMonths(m.payback)}. ${frees}` };
  return { tone: m.payback <= 24 ? 'mixed' : 'bad', headline: head, detail: `A ${fmtMoney(i.refactor)} clean-up pays back in ${fmtMonths(m.payback)}, ${m.payback <= 24 ? 'which is acceptable but slow' : 'which is long'}. ${frees}` };
}
export const kpis = (i, m) => [
  { label: 'Yearly cost of the drag', value: fmtMoney(m.annualCost), note: `${i.pctLost}% of ${i.engineers} engineers.` },
  { label: 'Recovered per year', value: fmtMoney(m.recoveredYear), note: `${i.recovery}% of the drag, once fully in effect.` },
  { label: 'Payback', value: fmtMonths(m.payback), tone: m.payback === null ? 'bad' : (m.payback <= 12 ? 'good' : (m.payback <= 24 ? 'mixed' : 'bad')), note: 'Clean-up cost recovered.' },
  { label: '3-year net', value: fmtMoney(m.net36), tone: m.net36 > 0 ? 'good' : 'bad', note: `Capacity freed: ${m.fte.toFixed(1)} engineers.` },
];
export const results = [
  { label: 'Yearly cost of the drag', get: (m) => m.annualCost, kind: 'money', scenario: true },
  { label: 'Cost of the drag per engineer', get: (m) => m.dragPerEngineer, kind: 'money' },
  { label: 'Yearly value recovered (fully in effect)', get: (m) => m.recoveredYear, kind: 'money', scenario: true },
  { label: 'Engineering capacity freed (FTE)', get: (m) => m.fte, kind: 'num1' },
  { label: 'Payback (months)', get: (m) => m.payback, kind: 'months', scenario: true },
  { label: 'Three-year net after the clean-up cost', get: (m) => m.net36, kind: 'money', scenario: true },
  { label: 'Three-year return on the clean-up cost', get: (m) => m.roi36, kind: 'pp0' },
];
export const chart = {
  title: 'Paying down the debt versus doing nothing', type: 'line', x: 'k', xKind: 'int', xTitle: 'Month', xFormat: (v) => `M${v}`, yKind: 'money', data: (i, m) => m.series,
  series: [{ key: 'v', name: 'Net result of the clean-up' }, { key: 'drag', name: 'Cumulative cost of doing nothing' }],
  note: 'The first line starts below zero by the clean-up cost and climbs as the recovered time phases in. The second line is the drag you keep paying if you do nothing.',
  ref: () => ({ y: 0, label: 'Break-even' }),
  caption: (i, m) => (m.payback === null ? 'The clean-up does not pay back within the horizon.' : `The clean-up breaks even in month ${Math.ceil(m.payback)}.`),
};
export const scenarios = trio(
  (i) => ({ ...i, recovery: Math.max(5, i.recovery * 0.6), refactor: i.refactor * 1.4, ramp: i.ramp + 3 }),
  (i) => ({ ...i, recovery: Math.min(100, i.recovery * 1.25), refactor: i.refactor * 0.9 }),
);
export const scenarioNote = 'Illustrative cases. Pessimistic: only 40% less of the drag is recovered, the clean-up costs 40% more and takes three months longer to show. Optimistic: 25% more recovered and 10% cheaper.';
export const sens = [
  { label: 'Share of time lost (±5 points)', worse: (i) => ({ ...i, pctLost: Math.max(1, i.pctLost - 5) }), better: (i) => ({ ...i, pctLost: Math.min(60, i.pctLost + 5) }) },
  { label: 'Share of the drag recovered (±15 points)', worse: (i) => ({ ...i, recovery: Math.max(5, i.recovery - 15) }), better: (i) => ({ ...i, recovery: Math.min(100, i.recovery + 15) }) },
  { label: 'Clean-up cost (±30%)', worse: (i) => ({ ...i, refactor: i.refactor * 1.3 }), better: (i) => ({ ...i, refactor: i.refactor * 0.7 }) },
  { label: 'Cost per engineer (±15%)', worse: (i) => ({ ...i, cost: i.cost * 0.85 }), better: (i) => ({ ...i, cost: i.cost * 1.15 }) },
  { label: 'Time until it takes effect (±3 months)', worse: (i) => ({ ...i, ramp: i.ramp + 3 }), better: (i) => ({ ...i, ramp: Math.max(1, i.ramp - 3) }) },
];
export const sensMetric = { label: 'three-year net (USD)', fn: (m) => m.net36, kind: 'money' };
export const bench = (i) => [
  { label: 'Share of engineering time on maintenance, debt and bad code', value: i.pctLost, unit: '%', range: [10, 43], strength: 'survey', noStatus: true, refText: 'Roughly 17 hours of a 40-hour week reported in one survey', note: 'In a 2018 Stripe survey of developers, respondents reported spending about 17 hours a week on maintenance work such as dealing with technical debt and bad code. It is self-reported and covers more than debt, so treat it as a ceiling.', source: 'Stripe, The Developer Coefficient (2018)', url: 'https://stripe.com/files/reports/the-developer-coefficient.pdf' },
];
export const planning = 'The share of time lost and the share you can recover are estimates. Measure the first with a survey or by tagging work that exists only because of past shortcuts, and test the second on one team before committing to a large program.';
export const how = [
  { h: 'The drag', p: 'The share of engineering time lost to workarounds, slow builds, fragile code and rework, times the cost of your engineers. It is real money even though it never shows as a line in the budget.' },
  { h: 'What a clean-up recovers', p: 'Only part of the drag, and not at once. The tool phases the recovery in over the time you enter, then holds it, so early months do not look better than they will be.' },
  { h: 'Payback', p: 'When the cumulative recovered time covers the clean-up cost. Under a year is a strong case. Beyond two years, narrow the scope.' },
  { h: 'Capacity freed', p: 'The recovered time expressed as engineers. Whether it is cash depends on what you do with it: it is real value when it goes to shipping product instead of fixing old code.' },
];
export default {
  slug: 'tech-debt-cost', title: 'Technical Debt Cost', eyebrow: 'Engineering', titleLead: 'Technical Debt', titleAccent: 'Cost', fileName: 'Technical_Debt_Cost',
  blurb: 'What technical debt costs you each year in lost engineering time, and whether a clean-up project pays for itself.',
  defaults, limits, presets,
  groups: [{ title: 'Your engineering team', fields: [
    { key: 'engineers', label: 'Engineers', min: 1, max: 500, tooltip: 'Engineers affected by the debt.' },
    { key: 'cost', label: 'Fully Loaded Cost per Engineer', min: 20000, max: 400000, step: 5000, prefix: '$', tooltip: 'Salary plus benefits and overhead, per year.' },
    { key: 'pctLost', label: 'Time Lost to Debt and Workarounds', min: 1, max: 60, suffix: '%', tooltip: 'Share of engineering time lost to fragile code, slow builds and rework.' },
    { key: 'refactor', label: 'Cost of the Clean-up', min: 0, max: 20000000, step: 10000, prefix: '$', tooltip: 'Engineering time and other cost of paying the debt down.' },
    { key: 'recovery', label: 'Share of the Drag Recovered', min: 5, max: 100, suffix: '%', advanced: true, tooltip: 'How much of the lost time the clean-up wins back.' },
    { key: 'ramp', label: 'Months Until It Takes Full Effect', min: 1, max: 24, suffix: ' mo', advanced: true, tooltip: 'The recovery phases in over this time.' },
  ], advancedSummary: (i) => `Recovers ${i.recovery}% · full effect in ${i.ramp} months` }],
  model, verdictFor, kpis, results, chart, scenarios, scenarioNote, sens, sensMetric, bench, planning, how,
};
