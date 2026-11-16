import { fmtMoney, fmtPct1, fmtNum } from '../shared/format.js';
import { trio, div } from './_math.js';

export const defaults = { customers: 400, arr: 20000000, perCsm: 50, csmCost: 120000, margin: 75, churnCut: 3, current: 5 };
export const limits = { customers: [5, 100000], arr: [100000, 5000000000], perCsm: [3, 500], csmCost: [20000, 500000], margin: [10, 100], churnCut: [0, 20], current: [0, 1000] };
export const presets = [
  { id: 'smb', name: 'SMB, low touch', note: '$4K accounts', inputs: { customers: 1500, arr: 6000000, perCsm: 150, csmCost: 85000, margin: 78, churnCut: 2, current: 6 } },
  { id: 'mid', name: 'Mid-market', note: '$50K accounts', inputs: { customers: 300, arr: 15000000, perCsm: 40, csmCost: 110000, margin: 78, churnCut: 2.5, current: 6 } },
  { id: 'ent', name: 'Enterprise', note: '$500K accounts', inputs: { customers: 60, arr: 30000000, perCsm: 10, csmCost: 160000, margin: 80, churnCut: 2, current: 5 } },
];
export function model(i) {
  const needed = Math.ceil(i.customers / i.perCsm);
  const gap = needed - i.current;
  const add = Math.max(0, gap);
  const incCost = add * i.csmCost;
  const retainedArr = i.arr * (i.churnCut / 100);
  const retainedGp = retainedArr * (i.margin / 100);
  const net = retainedGp - incCost;
  const series = [];
  for (const r of [...new Set([10, 20, 30, 40, 50, 75, 100, 150, 200, i.perCsm])].sort((a, b) => a - b)) series.push({ k: r, n: Math.ceil(i.customers / r) });
  return {
    needed, gap, add, incCost, totalCost: needed * i.csmCost, costPctArr: (needed * i.csmCost / i.arr) * 100, arrPerCsm: i.arr / needed,
    retainedArr, retainedGp, net, roi: div(net, incCost) === null ? null : (net / incCost) * 100,
    breakEvenCut: incCost > 0 ? (incCost / (i.arr * (i.margin / 100))) * 100 : 0, series,
  };
}
export function verdictFor(i, m) {
  const head = `At ${i.perCsm} accounts per manager you need ${m.needed} customer success managers. You have ${i.current}, so ${m.gap > 0 ? `you are short by ${m.gap}` : 'you have enough'}.`;
  if (m.add === 0) return { tone: 'good', headline: head, detail: `Each manager covers about ${fmtMoney(m.arrPerCsm)} of ARR. Your current team already meets the coverage you chose.` };
  if (m.net < 0) return { tone: 'bad', headline: head, detail: `Hiring ${m.add} more costs ${fmtMoney(m.incCost)} a year. Retaining ${fmtPct1(i.churnCut)} more ARR is worth only ${fmtMoney(m.retainedGp)} in gross profit, so it does not pay. It would need ${fmtPct1(m.breakEvenCut)} of ARR kept to break even. Consider a pooled or digital model for smaller accounts.` };
  return { tone: m.roi >= 50 ? 'good' : 'mixed', headline: head, detail: `Hiring ${m.add} more costs ${fmtMoney(m.incCost)} a year. If it keeps ${fmtPct1(i.churnCut)} more of your ARR, that is ${fmtMoney(m.retainedGp)} of gross profit, a net gain of ${fmtMoney(m.net)}. It breaks even if it keeps just ${fmtPct1(m.breakEvenCut)}.` };
}
export const kpis = (i, m) => [
  { label: 'Managers needed', value: String(m.needed), note: `For ${fmtNum(i.customers)} accounts.` },
  { label: 'Extra hires', value: String(m.add), tone: m.add === 0 ? 'good' : 'mixed', note: `Cost ${fmtMoney(m.incCost)} a year.` },
  { label: 'Net gain per year', value: fmtMoney(m.add === 0 ? 0 : m.net), tone: m.add === 0 ? 'neutral' : (m.net >= 0 ? 'good' : 'bad'), note: `Retained profit ${fmtMoney(m.retainedGp)}.` },
  { label: 'Cost as share of ARR', value: fmtPct1(m.costPctArr), note: 'Full team, per year.' },
];
export const results = [
  { label: 'Managers needed', get: (m) => m.needed, kind: 'int', scenario: true },
  { label: 'Gap versus current team', get: (m) => m.gap, kind: 'int' },
  { label: 'Extra hires', get: (m) => m.add, kind: 'int', scenario: true },
  { label: 'Cost of the full team per year', get: (m) => m.totalCost, kind: 'money' },
  { label: 'Cost of the extra hires per year', get: (m) => m.incCost, kind: 'money', scenario: true },
  { label: 'Team cost as share of ARR', get: (m) => m.costPctArr, kind: 'pp' },
  { label: 'ARR per manager', get: (m) => m.arrPerCsm, kind: 'money' },
  { label: 'ARR kept by better coverage', get: (m) => m.retainedArr, kind: 'money', scenario: true },
  { label: 'Gross profit on that ARR', get: (m) => m.retainedGp, kind: 'money' },
  { label: 'Net gain after the extra hires', get: (m) => (m.add === 0 ? 0 : m.net), kind: 'money', scenario: true },
  { label: 'Break-even share of ARR to keep', get: (m) => m.breakEvenCut, kind: 'pp' },
];
export const chart = {
  title: 'Managers needed at each coverage ratio', type: 'bar', x: 'k', xKind: 'int', xTitle: 'Accounts per manager', xFormat: (v) => `${v}`, yKind: 'int', highlightX: (i) => i.perCsm, data: (i, m) => m.series,
  series: [{ key: 'n', name: 'Managers needed' }],
  note: 'How many customer success managers your number of accounts needs at each coverage ratio. A lower ratio means more attention per account and more cost.',
  caption: (i, m) => `Your ratio (${i.perCsm} accounts per manager, in orange) needs ${m.needed}.`,
};
export const scenarios = trio(
  (i) => ({ ...i, churnCut: i.churnCut * 0.5, csmCost: i.csmCost * 1.1 }),
  (i) => ({ ...i, churnCut: i.churnCut * 1.4 }),
);
export const scenarioNote = 'Illustrative cases. Pessimistic: the churn you remove is half as large and each manager costs 10% more. Optimistic: 40% more churn removed.';
export const sens = [
  { label: 'ARR kept by coverage (±40%)', worse: (i) => ({ ...i, churnCut: i.churnCut * 0.6 }), better: (i) => ({ ...i, churnCut: i.churnCut * 1.4 }) },
  { label: 'Cost per manager (±15%)', worse: (i) => ({ ...i, csmCost: i.csmCost * 1.15 }), better: (i) => ({ ...i, csmCost: i.csmCost * 0.85 }) },
  { label: 'Accounts per manager (±20%)', worse: (i) => ({ ...i, perCsm: Math.max(3, i.perCsm * 0.8) }), better: (i) => ({ ...i, perCsm: i.perCsm * 1.2 }) },
  { label: 'Gross margin (±5 points)', worse: (i) => ({ ...i, margin: Math.max(10, i.margin - 5) }), better: (i) => ({ ...i, margin: Math.min(100, i.margin + 5) }) },
  { label: 'Total ARR (±15%)', worse: (i) => ({ ...i, arr: i.arr * 0.85 }), better: (i) => ({ ...i, arr: i.arr * 1.15 }) },
];
export const sensMetric = { label: 'net gain per year (USD)', fn: (m) => (m.add === 0 ? 0 : m.net), kind: 'money' };
export const bench = () => [];
export const planning = 'We could not verify reliable public benchmarks for accounts per customer success manager, or for how much churn better coverage removes. Both depend heavily on account size and product complexity. The share of churn you remove is the most uncertain input, so test it on a pilot group first.';
export const how = [
  { h: 'Managers needed', p: 'Accounts divided by the accounts one manager can cover, rounded up. Lower ratios suit large accounts that need real attention.' },
  { h: 'What coverage buys', p: 'Better coverage is worth the ARR you keep that you would otherwise lose. The tool values it at gross margin, since revenue you spend delivering is not profit you keep.' },
  { h: 'Break-even', p: 'The share of ARR the new hires must save for the extra cost to pay for itself. Compare it to what you honestly think coverage can do.' },
  { h: 'Small accounts', p: 'When ARR per account is small, a dedicated manager rarely pays. Pooled, digital or low-touch models are usually the better answer there.' },
];
export default {
  slug: 'cs-capacity', title: 'Customer Success Capacity', eyebrow: 'Customer Success', titleLead: 'Customer Success', titleAccent: 'Capacity', fileName: 'CS_Capacity',
  blurb: 'How many customer success managers your accounts need, what the extra hires cost, and how much retained revenue it takes to justify them.',
  defaults, limits, presets,
  groups: [{ title: 'Your accounts and team', fields: [
    { key: 'customers', label: 'Customer Accounts', min: 5, max: 20000, tooltip: 'Accounts that need success coverage.' },
    { key: 'arr', label: 'Total ARR', min: 100000, max: 500000000, step: 100000, prefix: '$', tooltip: 'Annual recurring revenue of those accounts.' },
    { key: 'perCsm', label: 'Accounts per Manager', min: 3, max: 300, tooltip: 'How many accounts one manager covers.' },
    { key: 'current', label: 'Managers Today', min: 0, max: 200, tooltip: 'Customer success managers you have now.' },
    { key: 'csmCost', label: 'Fully Loaded Cost per Manager', min: 20000, max: 300000, step: 5000, prefix: '$', tooltip: 'Salary, bonus, benefits and tools per manager per year.' },
    { key: 'churnCut', label: 'ARR Kept by Better Coverage', min: 0, max: 15, step: 0.5, suffix: '%', advanced: true, tooltip: 'Share of total ARR you expect to keep that would otherwise churn. The most uncertain input.' },
    { key: 'margin', label: 'Gross Margin', min: 10, max: 100, suffix: '%', advanced: true, tooltip: 'Retained revenue is valued at this margin.' },
  ], advancedSummary: (i) => `Keeps ${i.churnCut}% of ARR · margin ${i.margin}%` }],
  model, verdictFor, kpis, results, chart, scenarios, scenarioNote, sens, sensMetric, bench, planning, how,
};
