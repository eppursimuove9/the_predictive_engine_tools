import { fmtMoney, fmtNum, fmtPct1 } from '../shared/format.js';
import { trio, invNorm } from './_math.js';

export const defaults = { baseline: 3, lift: 20, traffic: 6000, confidence: 95, power: 80, variants: 2, valuePerConv: 150 };
export const limits = { baseline: [0.5, 60], lift: [2, 100], traffic: [100, 5000000], confidence: [80, 99.5], power: [70, 95], variants: [2, 5], valuePerConv: [0, 100000] };
export const presets = [
  { id: 'landing', name: 'Landing page', note: '3% conversion', inputs: { baseline: 3, lift: 20, traffic: 8000, confidence: 95, power: 80, variants: 2, valuePerConv: 150 } },
  { id: 'checkout', name: 'Checkout', note: '12% conversion', inputs: { baseline: 12, lift: 10, traffic: 5000, confidence: 95, power: 80, variants: 2, valuePerConv: 90 } },
  { id: 'email', name: 'Email click rate', note: '2.5% clicks', inputs: { baseline: 2.5, lift: 25, traffic: 20000, confidence: 95, power: 80, variants: 2, valuePerConv: 4 } },
];

// Visitors needed in EACH variant for a two-sided test of two proportions. With more than two variants the
// significance level is split across the comparisons with the control (Bonferroni), which is conservative.
export function sampleSize(p1pct, liftPct, confidencePct, powerPct, variants) {
  const p1 = p1pct / 100;
  const p2 = Math.min(0.99, p1 * (1 + liftPct / 100));
  if (!(p2 > p1)) return null;
  const alpha = (1 - confidencePct / 100) / Math.max(1, variants - 1);
  const za = invNorm(1 - alpha / 2);
  const zb = invNorm(powerPct / 100);
  const pbar = (p1 + p2) / 2;
  const n = ((za * Math.sqrt(2 * pbar * (1 - pbar)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2) / (p2 - p1) ** 2;
  return Math.ceil(n);
}
export function model(i) {
  const perVariant = sampleSize(i.baseline, i.lift, i.confidence, i.power, i.variants);
  const total = perVariant === null ? null : perVariant * i.variants;
  const weeks = total === null ? null : total / i.traffic;
  const p1 = i.baseline / 100;
  const p2 = Math.min(0.99, p1 * (1 + i.lift / 100));
  const extraConvYear = i.traffic * 52 * (p2 - p1);
  const series = [];
  for (const l of [...new Set([5, 10, 15, 20, 30, 40, 50, 75, 100, i.lift])].sort((a, b) => a - b)) series.push({ k: l, n: sampleSize(i.baseline, l, i.confidence, i.power, i.variants) });
  return { p1, p2, perVariant, total, weeks, days: weeks === null ? null : Math.ceil(weeks * 7), extraConvYear, valueYear: extraConvYear * i.valuePerConv, series };
}
export function verdictFor(i, m) {
  if (m.perVariant === null) return { tone: 'bad', headline: 'This lift cannot be tested with these numbers.', detail: 'Lower the baseline or the lift so the improved rate stays below 99%.' };
  const run = Math.max(14, m.days);
  const head = `To detect a ${i.lift}% lift from ${i.baseline}%, you need about ${fmtNum(m.perVariant)} visitors in each of ${i.variants} variants, ${fmtNum(m.total)} in total. At ${fmtNum(i.traffic)} visitors a week that is ${m.weeks.toFixed(1)} weeks.`;
  const tail = ` Run it for at least two full weeks (${run} days here) so weekday and weekend behavior are both covered, and do not stop it early when it first looks significant. If it wins, it is worth about ${fmtMoney(m.valueYear)} a year.`;
  if (m.weeks <= 4) return { tone: 'good', headline: head, detail: `That fits in a month.${tail}` };
  if (m.weeks <= 12) return { tone: 'mixed', headline: head, detail: `That is a long test.${tail} A bigger change, or a page with more traffic, would finish sooner.` };
  return { tone: 'bad', headline: head, detail: `That is too slow to be useful. Test a bigger change, use a page with more traffic, or accept a lower confidence level.${tail}` };
}
export const kpis = (i, m) => [
  { label: 'Visitors per variant', value: m.perVariant === null ? 'N/A' : fmtNum(m.perVariant), note: `${i.variants} variants including the control.` },
  { label: 'Total visitors', value: m.total === null ? 'N/A' : fmtNum(m.total), note: 'Across all variants.' },
  { label: 'Time to run', value: m.weeks === null ? 'N/A' : `${m.weeks.toFixed(1)} wks`, tone: m.weeks === null ? 'bad' : (m.weeks <= 4 ? 'good' : (m.weeks <= 12 ? 'mixed' : 'bad')), note: `At ${fmtNum(i.traffic)} visitors a week.` },
  { label: 'Value of the lift', value: fmtMoney(m.valueYear), note: 'Per year if the lift is real.' },
];
export const results = [
  { label: 'Conversion rate today', get: (m) => m.p1 * 100, kind: 'pp' },
  { label: 'Conversion rate to detect', get: (m) => m.p2 * 100, kind: 'pp' },
  { label: 'Visitors needed per variant', get: (m) => m.perVariant, kind: 'int', scenario: true },
  { label: 'Visitors needed in total', get: (m) => m.total, kind: 'int', scenario: true },
  { label: 'Weeks to run', get: (m) => m.weeks, kind: 'num1', scenario: true },
  { label: 'Extra conversions per year if it wins', get: (m) => m.extraConvYear, kind: 'int' },
  { label: 'Value per year if it wins', get: (m) => m.valueYear, kind: 'money' },
];
export const chart = {
  title: 'Smaller lifts need far more visitors', type: 'line', x: 'k', xKind: 'pp0', numericX: true, refX: (i) => ({ x: i.lift, label: `Your lift ${i.lift}%` }), xTitle: 'Lift to detect', xFormat: (v) => `${v}%`, yKind: 'int',
  data: (i, m) => m.series.filter((r) => r.n !== null), series: [{ key: 'n', name: 'Visitors per variant' }],
  note: 'Visitors needed in each variant for every size of lift you could try to detect, at your confidence and power. Halving the lift roughly quadruples the visitors.',
  caption: (i) => `At your ${i.lift}% lift the test needs the visitors shown above. If that is too many, test a bigger change.`,
};
export const scenarios = trio(
  (i) => ({ ...i, lift: Math.max(2, i.lift * 0.6), traffic: i.traffic * 0.8 }),
  (i) => ({ ...i, lift: Math.min(100, i.lift * 1.5), traffic: i.traffic * 1.2 }),
);
export const scenarioNote = 'Illustrative cases. Pessimistic: a lift 40% smaller and 20% less traffic. Optimistic: a lift 50% bigger and 20% more traffic.';
export const sens = [
  { label: 'Lift to detect (±30%)', worse: (i) => ({ ...i, lift: Math.max(2, i.lift * 0.7) }), better: (i) => ({ ...i, lift: Math.min(100, i.lift * 1.3) }) },
  { label: 'Weekly traffic (±25%)', worse: (i) => ({ ...i, traffic: i.traffic * 0.75 }), better: (i) => ({ ...i, traffic: i.traffic * 1.25 }) },
  { label: 'Baseline conversion (±20%)', worse: (i) => ({ ...i, baseline: Math.max(0.5, i.baseline * 0.8) }), better: (i) => ({ ...i, baseline: Math.min(60, i.baseline * 1.2) }) },
  { label: 'Confidence (95% vs 90% and 99%)', worse: (i) => ({ ...i, confidence: 99 }), better: (i) => ({ ...i, confidence: 90 }) },
  { label: 'Variants (±1)', worse: (i) => ({ ...i, variants: Math.min(5, i.variants + 1) }), better: (i) => ({ ...i, variants: Math.max(2, i.variants - 1) }) },
];
export const sensMetric = { label: 'weeks to run', fn: (m) => m.weeks ?? 0, kind: 'num1', higherIsBetter: false };
export const bench = (i) => [
  { label: 'Confidence level', value: i.confidence, unit: '%', range: [90, 99], strength: 'rule', note: '95% is the usual convention in A/B testing, meaning about a 1 in 20 chance of a false winner. It is a convention, not a law.', source: 'Statistical convention' },
  { label: 'Statistical power', value: i.power, unit: '%', range: [80, 95], strength: 'rule', note: '80% is the usual convention: an 80% chance of detecting the lift if it is really there.', source: 'Statistical convention' },
];
export const planning = 'The sample size uses the standard formula for comparing two proportions with a two-sided test. With more than two variants the confidence level is split across the comparisons with the control, which is conservative.';
export const how = [
  { h: 'What it tells you', p: 'How many visitors each version of a page needs before you can trust the result. Stop earlier and you will often see a winner that is just luck.' },
  { h: 'Lift to detect', p: 'The smallest relative improvement worth finding. A 20% lift on a 3% rate means going from 3.0% to 3.6%. Smaller lifts need many more visitors.' },
  { h: 'Confidence and power', p: 'Confidence is how sure you want to be that a winner is real. Power is how likely you are to catch a real lift. Raising either needs more visitors.' },
  { h: 'Before you start', p: 'Decide the number of visitors in advance and do not peek and stop. Run whole weeks. Test one change at a time if you want to know what caused the result.' },
];
export default {
  slug: 'ab-test-planner', title: 'A/B Test Planner', eyebrow: 'Marketing', titleLead: 'A/B Test', titleAccent: 'Planner', fileName: 'AB_Test_Planner',
  blurb: 'How many visitors and how many weeks a test needs, and what a win would be worth. Stops you from running tests that can never reach a result.',
  defaults, limits, presets,
  groups: [{ title: 'Your test', fields: [
    { key: 'baseline', label: 'Current Conversion Rate', min: 0.5, max: 50, step: 0.1, suffix: '%', tooltip: 'Share of visitors who convert today on the page or email you will test.' },
    { key: 'lift', label: 'Lift You Want to Detect', min: 2, max: 100, suffix: '%', tooltip: 'Relative improvement. 20% on a 3% rate means going to 3.6%.' },
    { key: 'traffic', label: 'Visitors per Week', min: 100, max: 500000, step: 100, tooltip: 'Total visitors to the page in a week, before splitting across variants.' },
    { key: 'valuePerConv', label: 'Value of One Conversion', min: 0, max: 20000, step: 1, prefix: '$', tooltip: 'What a conversion is worth to you: margin on a sale, or the value of a lead.' },
    { key: 'confidence', label: 'Confidence Level', min: 80, max: 99.5, step: 0.5, suffix: '%', advanced: true, tooltip: 'How sure you want to be that a winner is real. 95% is the usual choice.' },
    { key: 'power', label: 'Statistical Power', min: 70, max: 95, step: 1, suffix: '%', advanced: true, tooltip: 'Chance of detecting the lift if it is real. 80% is the usual choice.' },
    { key: 'variants', label: 'Variants Including Control', min: 2, max: 5, advanced: true, tooltip: 'Number of versions in the test, including the original.' },
  ], advancedSummary: (i) => `${fmtPct1(i.confidence)} confidence · ${i.power}% power · ${i.variants} variants` }],
  model, verdictFor, kpis, results, chart, scenarios, scenarioNote, sens, sensMetric, bench, planning, how,
};
