import { fmtMoney, fmtMoney2, fmtX, fmtPct1 } from '../shared/format.js';
import { trio, div } from './_math.js';

export const defaults = { reps: 10, quota: 900000, ote: 180000, basePct: 50, attainment: 75, accel: 1.5, overhead: 20 };
export const limits = { reps: [1, 500], quota: [50000, 20000000], ote: [30000, 1000000], basePct: [10, 100], attainment: [10, 250], accel: [1, 4], overhead: [0, 60] };
export const presets = [
  { id: 'smb', name: 'SMB AE', note: '$600K quota', inputs: { reps: 14, quota: 600000, ote: 130000, basePct: 55, attainment: 80, accel: 1.5, overhead: 20 } },
  { id: 'mid', name: 'Mid-market AE', note: '$1M quota', inputs: { reps: 10, quota: 1000000, ote: 220000, basePct: 50, attainment: 75, accel: 2, overhead: 22 } },
  { id: 'ent', name: 'Enterprise AE', note: '$2M quota', inputs: { reps: 8, quota: 2000000, ote: 320000, basePct: 50, attainment: 65, accel: 2, overhead: 22 } },
];

// Pay at a given attainment (as a fraction of quota). Variable pay earns at the base rate up to quota and
// at the accelerated rate above it.
const payAt = (i, a) => {
  const base = i.ote * (i.basePct / 100);
  const variable = i.ote - base;
  return base + variable * Math.min(a, 1) + variable * Math.max(a - 1, 0) * i.accel;
};
export function model(i) {
  const a = i.attainment / 100;
  const base = i.ote * (i.basePct / 100);
  const variable = i.ote - base;
  const payPerRep = payAt(i, a);
  const costPerRep = payPerRep * (1 + i.overhead / 100);
  const bookingsPerRep = i.quota * a;
  const costPerDollar = div(costPerRep, bookingsPerRep);
  const series = [];
  for (const p of [...new Set([...Array.from({ length: 19 }, (_, n) => 20 + n * 10), i.attainment])].sort((a, b) => a - b)) series.push({ k: p, c: Math.round(((payAt(i, p / 100) * (1 + i.overhead / 100)) / (i.quota * (p / 100))) * 1000) / 10 });
  return {
    base, variable, payPerRep, costPerRep, bookingsPerRep, costPerDollar,
    commissionRate: (variable / i.quota) * 100, quotaToOte: i.quota / i.ote,
    realization: (payPerRep / i.ote) * 100, totalPay: payPerRep * i.reps, totalCost: costPerRep * i.reps, totalBookings: bookingsPerRep * i.reps,
    costPct: costPerDollar === null ? null : costPerDollar * 100, costAt100: ((i.ote * (1 + i.overhead / 100)) / i.quota) * 100, series,
  };
}
export function verdictFor(i, m) {
  const head = `At ${i.attainment}% of quota, each rep earns about ${fmtMoney(m.payPerRep)} and costs ${fmtMoney(m.costPerRep)} with overhead. You pay about ${fmtMoney2(m.costPerDollar)} for every $1 of bookings.`;
  const x = fmtX(m.quotaToOte);
  if (m.quotaToOte >= 4) return { tone: 'good', headline: head, detail: `Quota is ${x} target pay, so comp is about ${fmtPct1(m.costAt100)} of bookings when reps hit quota. That leaves room for the rest of the sales cost.` };
  if (m.quotaToOte >= 3) return { tone: 'mixed', headline: head, detail: `Quota is ${x} target pay. Hitting quota costs about ${fmtPct1(m.costAt100)} of bookings in pay alone, which is on the high side. Check quota is not set too low for the pay.` };
  return { tone: 'bad', headline: head, detail: `Quota is only ${x} target pay. At quota, pay alone is ${fmtPct1(m.costAt100)} of bookings, which is hard to sustain once management, tools and marketing are added.` };
}
export const kpis = (i, m) => [
  { label: 'Pay per rep', value: fmtMoney(m.payPerRep), note: `${Math.round(m.realization)}% of target pay.` },
  { label: 'Commission rate', value: fmtPct1(m.commissionRate), note: 'Variable pay divided by quota.' },
  { label: 'Cost per $1 booked', value: fmtMoney2(m.costPerDollar), tone: m.quotaToOte >= 4 ? 'good' : (m.quotaToOte >= 3 ? 'mixed' : 'bad'), note: 'Pay plus overhead over bookings.' },
  { label: 'Team comp cost', value: fmtMoney(m.totalCost), note: `${i.reps} reps, with overhead.` },
];
export const results = [
  { label: 'Base salary per rep', get: (m) => m.base, kind: 'money' },
  { label: 'Variable pay at target per rep', get: (m) => m.variable, kind: 'money' },
  { label: 'Commission rate on quota', get: (m) => m.commissionRate, kind: 'pp' },
  { label: 'Quota to target pay multiple', get: (m) => m.quotaToOte, kind: 'x' },
  { label: 'Pay per rep at this attainment', get: (m) => m.payPerRep, kind: 'money', scenario: true },
  { label: 'Pay as share of target pay', get: (m) => m.realization, kind: 'pp0', scenario: true },
  { label: 'Bookings per rep', get: (m) => m.bookingsPerRep, kind: 'money', scenario: true },
  { label: 'Cost per $1 booked', get: (m) => m.costPerDollar, kind: 'money2', scenario: true },
  { label: 'Team pay', get: (m) => m.totalPay, kind: 'money' },
  { label: 'Team comp cost with overhead', get: (m) => m.totalCost, kind: 'money', scenario: true },
  { label: 'Team bookings', get: (m) => m.totalBookings, kind: 'money', scenario: true },
];
export const chart = {
  title: 'Comp cost as a share of bookings, by attainment', type: 'line', x: 'k', xKind: 'pp0', numericX: true, refX: (i) => ({ x: i.attainment, label: `Your case ${i.attainment}%` }), xTitle: 'Attainment', xFormat: (v) => `${v}%`, yKind: 'pp',
  data: (i, m) => m.series, series: [{ key: 'c', name: 'Comp cost, % of bookings' }],
  note: 'Pay plus overhead divided by the bookings a rep brings in. Low attainment is expensive because base pay is fixed. The kink at 100% is where accelerators start.',
  caption: (i, m) => `At 100% of quota the cost is ${fmtPct1(m.costAt100)} of bookings. At your ${i.attainment}% it is ${m.costPct === null ? 'n/a' : fmtPct1(m.costPct)}.`,
};
export const scenarios = trio(
  (i) => ({ ...i, attainment: Math.max(10, i.attainment - 15) }),
  (i) => ({ ...i, attainment: Math.min(250, i.attainment + 15) }),
);
export const scenarioNote = 'Illustrative cases. Pessimistic: attainment 15 points lower. Optimistic: attainment 15 points higher. Everything else stays the same.';
export const sens = [
  { label: 'Quota attainment (±10 points)', worse: (i) => ({ ...i, attainment: Math.max(10, i.attainment - 10) }), better: (i) => ({ ...i, attainment: Math.min(250, i.attainment + 10) }) },
  { label: 'Quota (±15%)', worse: (i) => ({ ...i, quota: i.quota * 0.85 }), better: (i) => ({ ...i, quota: i.quota * 1.15 }) },
  { label: 'Target pay (±10%)', worse: (i) => ({ ...i, ote: i.ote * 1.1 }), better: (i) => ({ ...i, ote: i.ote * 0.9 }) },
  { label: 'Accelerator (±0.5)', worse: (i) => ({ ...i, accel: Math.min(4, i.accel + 0.5) }), better: (i) => ({ ...i, accel: Math.max(1, i.accel - 0.5) }) },
];
export const sensMetric = { label: 'cost per $1 booked (USD)', fn: (m) => m.costPerDollar ?? 0, kind: 'money2', higherIsBetter: false };
export const bench = (i, m) => [
  { label: 'Quota to target pay multiple', value: m.quotaToOte, unit: 'x', range: [4, 6], strength: 'rule', note: 'Many sales leaders aim for a quota of about four to six times target pay. This is a common heuristic, not a published study, and enterprise roles often sit lower.', source: 'Practitioner rule of thumb, no published source' },
];
export const planning = 'We found no reliable public benchmark for pay mix, accelerators or cost of sales that fits every market. Compare with your own history and with offers in your segment.';
export const how = [
  { h: 'How pay is calculated', p: 'Base salary is paid whatever happens. Variable pay is earned on bookings: at the normal rate up to quota, and at the accelerated rate on everything above it.' },
  { h: 'Quota to target pay', p: 'Quota divided by target pay. A higher multiple means each rep brings in more revenue for every dollar of pay, so a rep hitting quota is cheaper to your business.' },
  { h: 'Cost per $1 booked', p: 'Total pay plus overhead (payroll taxes and benefits), divided by the bookings. It is the clearest single number for how efficient your plan is.' },
  { h: 'The chart', p: 'Shows the same cost for every attainment level. When reps miss quota the cost climbs fast, because base pay does not shrink with the results.' },
];
export default {
  slug: 'comp-plan', title: 'Sales Comp Plan Cost', eyebrow: 'RevOps and Sales Leadership', titleLead: 'Sales Comp', titleAccent: 'Plan Cost', fileName: 'Sales_Comp_Plan_Cost',
  blurb: 'What your pay plan really costs per dollar of bookings, at the attainment your reps actually reach. Test quotas, pay mix and accelerators before you set the plan.',
  defaults, limits, presets,
  groups: [{ title: 'Your pay plan', fields: [
    { key: 'reps', label: 'Quota-carrying Reps', min: 1, max: 200, tooltip: 'Number of reps on this plan.' },
    { key: 'quota', label: 'Annual Quota per Rep', min: 50000, max: 5000000, step: 10000, prefix: '$', tooltip: 'Bookings each rep is expected to close in a year.' },
    { key: 'ote', label: 'Target Pay per Rep (OTE)', min: 30000, max: 600000, step: 5000, prefix: '$', tooltip: 'Base plus variable pay if the rep hits 100% of quota.' },
    { key: 'basePct', label: 'Base Salary Share of Target Pay', min: 10, max: 100, suffix: '%', tooltip: 'The rest is variable. A 50/50 split is common for account executives.' },
    { key: 'attainment', label: 'Average Quota Attainment', min: 10, max: 200, suffix: '%', tooltip: 'Average share of quota your reps actually reach.' },
    { key: 'accel', label: 'Accelerator Above Quota', min: 1, max: 4, step: 0.5, suffix: 'x', advanced: true, tooltip: 'Multiplier on the commission rate for bookings above quota. 1x means no accelerator.' },
    { key: 'overhead', label: 'Payroll Taxes and Benefits', min: 0, max: 60, suffix: '%', advanced: true, tooltip: 'Extra cost on top of pay: taxes, benefits, equipment.' },
  ], advancedSummary: (i) => `Accelerator ${i.accel}x · overhead ${i.overhead}%` }],
  model, verdictFor, kpis, results, chart, scenarios, scenarioNote, sens, sensMetric, bench, planning, how,
};
