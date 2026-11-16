import { fmtMoney, fmtPct1 } from '../shared/format.js';
import { trio } from './_math.js';

export const defaults = { tools: 25, seats: 40, seatCost: 45, active: 65, overlap: 20, reclaim: 70, retire: 50, migration: 30000 };
export const limits = { tools: [1, 300], seats: [1, 5000], seatCost: [1, 1000], active: [5, 100], overlap: [0, 80], reclaim: [0, 100], retire: [0, 100], migration: [0, 5000000] };
export const presets = [
  { id: 'lean', name: 'Lean startup', note: '12 tools, 15 users', inputs: { tools: 12, seats: 15, seatCost: 40, active: 80, overlap: 10, reclaim: 70, retire: 50, migration: 8000 } },
  { id: 'scale', name: 'Scale-up', note: '25 tools, 60 users', inputs: { tools: 25, seats: 60, seatCost: 50, active: 60, overlap: 25, reclaim: 70, retire: 50, migration: 40000 } },
  { id: 'ent', name: 'Enterprise', note: '45 tools, 250 users', inputs: { tools: 45, seats: 250, seatCost: 65, active: 55, overlap: 30, reclaim: 60, retire: 40, migration: 150000 } },
];
export function model(i) {
  const total = i.tools * i.seats * i.seatCost * 12;
  const unused = total * (1 - i.active / 100);
  const unusedSaving = unused * (i.reclaim / 100);
  const afterSeats = total - unusedSaving;
  // Consolidation is applied to what is left after the seat clean-up, so the same dollar is never counted twice.
  const overlapSaving = afterSeats * (i.overlap / 100) * (i.retire / 100);
  const afterAll = afterSeats - overlapSaving;
  const saving = unusedSaving + overlapSaving;
  const netYear1 = saving - i.migration;
  const payback = saving > 0 ? (i.migration / saving) * 12 : (i.migration === 0 ? 0 : null);
  const activeUsers = i.tools * i.seats * (i.active / 100);
  return {
    total, unused, unusedSaving, overlapSaving, saving, netYear1, payback, afterSeats, afterAll, savingPct: total > 0 ? (saving / total) * 100 : 0,
    costPerActive: activeUsers > 0 ? total / activeUsers : null,
    bars: [{ k: 'Today', v: Math.round(total) }, { k: 'After seat clean-up', v: Math.round(afterSeats) }, { k: 'After consolidation', v: Math.round(afterAll) }],
  };
}
export function verdictFor(i, m) {
  const head = `Your stack costs about ${fmtMoney(m.total)} a year, and about ${fmtMoney(m.unused)} of it pays for licenses nobody uses. You could realistically save ${fmtMoney(m.saving)} a year (${fmtPct1(m.savingPct)} of spend).`;
  const detail = `Most of it comes from cancelling unused seats (${fmtMoney(m.unusedSaving)}), the rest from retiring overlapping tools (${fmtMoney(m.overlapSaving)}). After the ${fmtMoney(i.migration)} one-time cost, the first-year net is ${fmtMoney(m.netYear1)}.`;
  const tone = m.savingPct >= 20 ? 'bad' : (m.savingPct >= 10 ? 'mixed' : 'good');
  return { tone, headline: head, detail: tone === 'good' ? `Your stack is already fairly tight. ${detail}` : detail };
}
export const kpis = (i, m) => [
  { label: 'Spend per year', value: fmtMoney(m.total), note: `${i.tools} tools, ${i.seats} seats each.` },
  { label: 'Paid but unused', value: fmtMoney(m.unused), tone: m.unused / Math.max(1, m.total) >= 0.3 ? 'bad' : 'mixed', note: `${100 - i.active}% of seats are idle.` },
  { label: 'Realistic saving', value: fmtMoney(m.saving), tone: 'good', note: `${fmtPct1(m.savingPct)} of spend.` },
  { label: 'Cost per active user', value: m.costPerActive === null ? 'N/A' : fmtMoney(m.costPerActive), note: 'Per year, across all tools.' },
];
export const results = [
  { label: 'Total stack spend per year', get: (m) => m.total, kind: 'money', scenario: true },
  { label: 'Spend on unused seats', get: (m) => m.unused, kind: 'money', scenario: true },
  { label: 'Saving from cancelling unused seats', get: (m) => m.unusedSaving, kind: 'money' },
  { label: 'Saving from retiring overlapping tools', get: (m) => m.overlapSaving, kind: 'money' },
  { label: 'Total realistic saving per year', get: (m) => m.saving, kind: 'money', scenario: true },
  { label: 'Saving as share of spend', get: (m) => m.savingPct, kind: 'pp' },
  { label: 'First-year net after one-time cost', get: (m) => m.netYear1, kind: 'money', scenario: true },
  { label: 'Payback (months)', get: (m) => m.payback, kind: 'months' },
  { label: 'Cost per active user per year', get: (m) => m.costPerActive, kind: 'money' },
];
export const chart = {
  title: 'Spend after each step', type: 'bar', x: 'k', xKind: 'text', xTitle: 'Step', yKind: 'money', data: (i, m) => m.bars, series: [{ key: 'v', name: 'Yearly spend' }],
  note: 'Yearly stack spend today, after cancelling the unused seats you can really cancel, and after retiring overlapping tools.',
  caption: (i, m) => `Spend falls from ${fmtMoney(m.total)} to ${fmtMoney(m.afterAll)}.`,
};
export const scenarios = trio(
  (i) => ({ ...i, reclaim: i.reclaim * 0.6, retire: i.retire * 0.5, migration: i.migration * 1.3 }),
  (i) => ({ ...i, reclaim: Math.min(100, i.reclaim * 1.2), retire: Math.min(100, i.retire * 1.4) }),
);
export const scenarioNote = 'Illustrative cases. Pessimistic: you cancel 40% fewer unused seats, retire half as many overlapping tools, and migration costs 30% more. Optimistic: 20% more seats cancelled and 40% more tools retired.';
export const sens = [
  { label: 'Share of seats actually used (±10 points)', worse: (i) => ({ ...i, active: Math.min(100, i.active + 10) }), better: (i) => ({ ...i, active: Math.max(5, i.active - 10) }) },
  { label: 'Unused seats you can cancel (±20 points)', worse: (i) => ({ ...i, reclaim: Math.max(0, i.reclaim - 20) }), better: (i) => ({ ...i, reclaim: Math.min(100, i.reclaim + 20) }) },
  { label: 'Tools with an overlap (±10 points)', worse: (i) => ({ ...i, overlap: Math.max(0, i.overlap - 10) }), better: (i) => ({ ...i, overlap: Math.min(80, i.overlap + 10) }) },
  { label: 'Overlapping tools you retire (±25 points)', worse: (i) => ({ ...i, retire: Math.max(0, i.retire - 25) }), better: (i) => ({ ...i, retire: Math.min(100, i.retire + 25) }) },
  { label: 'Migration cost (±30%)', worse: (i) => ({ ...i, migration: i.migration * 1.3 }), better: (i) => ({ ...i, migration: i.migration * 0.7 }) },
];
export const sensMetric = { label: 'first-year net saving (USD)', fn: (m) => m.netYear1, kind: 'money' };
export const bench = (i) => [
  { label: 'Share of paid seats actually used', value: i.active, unit: '%', range: [80, 100], strength: 'rule', note: 'Teams often aim for roughly 80% or more of paid seats in monthly use. This is a common management heuristic, not a published study.', source: 'Practitioner rule of thumb, no published source' },
];
export const planning = 'We could not verify a reliable public benchmark for unused seats or tool overlap in go-to-market stacks. Pull real usage from each tool (last login within 30 days) and mark overlaps by function.';
export const how = [
  { h: 'Total spend', p: 'Tools, times seats per tool, times the average monthly price per seat, times 12. Use an average across your stack; for a more exact figure, enter your real totals by adjusting seats and price.' },
  { h: 'Unused seats', p: 'The share of paid seats nobody uses in a month. You usually cannot cancel all of them because of contract minimums and seasonality, so the tool asks what share you can really cancel.' },
  { h: 'Overlap', p: 'Tools that do the same job as another one, such as two sequencing tools or two enrichment tools. The saving is applied after the seat clean-up so the same dollar is not counted twice.' },
  { h: 'One-time cost', p: 'Migration, integration and retraining. It is subtracted from the first-year saving, so the first-year net is the honest number.' },
];
export default {
  slug: 'tech-stack-waste', title: 'GTM Tech Stack Waste', eyebrow: 'RevOps and Operations', titleLead: 'GTM Tech Stack', titleAccent: 'Waste', fileName: 'GTM_Tech_Stack_Waste',
  blurb: 'How much of your sales and marketing software you pay for and do not use, and what a clean-up would really save after the cost of doing it.',
  defaults, limits, presets,
  groups: [{ title: 'Your stack', fields: [
    { key: 'tools', label: 'Paid Tools', min: 1, max: 150, tooltip: 'Number of paid go-to-market tools: CRM, sequencing, enrichment, analytics, ads and so on.' },
    { key: 'seats', label: 'Licensed Seats per Tool', min: 1, max: 1000, tooltip: 'Average number of paid seats in each tool.' },
    { key: 'seatCost', label: 'Average Price per Seat per Month', min: 1, max: 500, prefix: '$', tooltip: 'Average monthly price of one seat across your tools.' },
    { key: 'active', label: 'Seats Actually Used', min: 5, max: 100, suffix: '%', tooltip: 'Share of paid seats with real use in the last month.' },
    { key: 'overlap', label: 'Tools That Overlap Another', min: 0, max: 80, suffix: '%', advanced: true, tooltip: 'Share of your spend on tools that do the same job as another tool.' },
    { key: 'reclaim', label: 'Unused Seats You Can Cancel', min: 0, max: 100, suffix: '%', advanced: true, tooltip: 'Contracts and seasonality stop you from cancelling every unused seat.' },
    { key: 'retire', label: 'Overlapping Tools You Will Retire', min: 0, max: 100, suffix: '%', advanced: true, tooltip: 'Not every duplicate can go: some teams depend on them.' },
    { key: 'migration', label: 'One-time Clean-up Cost', min: 0, max: 1000000, step: 1000, prefix: '$', advanced: true, tooltip: 'Migration, integration and retraining.' },
  ], advancedSummary: (i) => `Overlap ${i.overlap}% · cancel ${i.reclaim}% · retire ${i.retire}% · cost ${fmtMoney(i.migration)}` }],
  model, verdictFor, kpis, results, chart, scenarios, scenarioNote, sens, sensMetric, bench, planning, how,
};
