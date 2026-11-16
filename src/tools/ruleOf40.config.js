import { fmtMoney2, fmtX, fmtPct1 } from '../shared/format.js';
import { trio, div } from './_math.js';

export const defaults = { arr: 12000000, arrPrev: 8500000, fcfMargin: -35, smSpend: 8000000, grossMargin: 75 };
export const limits = { arr: [100000, 5000000000], arrPrev: [100000, 5000000000], fcfMargin: [-150, 70], smSpend: [10000, 2000000000], grossMargin: [10, 95] };
export const presets = [
  { id: 'hyper', name: 'Hypergrowth', note: 'Grows 100%, burns cash', inputs: { arr: 30000000, arrPrev: 15000000, fcfMargin: -40, smSpend: 24000000, grossMargin: 78 } },
  { id: 'steady', name: 'Steady and profitable', note: '16% growth, 18% margin', inputs: { arr: 50000000, arrPrev: 43000000, fcfMargin: 18, smSpend: 22000000, grossMargin: 80 } },
  { id: 'turn', name: 'Turnaround', note: 'Slow growth', inputs: { arr: 25000000, arrPrev: 24000000, fcfMargin: -5, smSpend: 12000000, grossMargin: 72 } },
];
export function model(i) {
  const growth = (i.arr / i.arrPrev - 1) * 100;
  const score = growth + i.fcfMargin;
  const netNew = i.arr - i.arrPrev;
  const magic = div(netNew, i.smSpend);
  const gpNew = netNew * (i.grossMargin / 100);
  const payback = gpNew > 0 ? (i.smSpend / gpNew) * 12 : null;
  return {
    growth, score, gap: 40 - score, netNew, magic, payback, needGrowth: Math.max(0, 40 - score),
    bars: [{ k: 'Growth', v: Math.round(growth * 10) / 10 }, { k: 'Free cash flow margin', v: Math.round(i.fcfMargin * 10) / 10 }, { k: 'Rule of 40 score', v: Math.round(score * 10) / 10 }, { k: 'Target', v: 40 }],
  };
}
export function verdictFor(i, m) {
  const head = `ARR grew ${fmtPct1(m.growth)} and free cash flow margin is ${fmtPct1(i.fcfMargin)}, so your Rule of 40 score is ${fmtPct1(m.score)}.`;
  const magic = m.magic === null ? '' : ` For every dollar of sales and marketing you added ${fmtMoney2(m.magic)} of net new ARR over the year (a magic number of ${fmtX(m.magic, 2)}).`;
  if (m.score >= 40) return { tone: 'good', headline: head, detail: `You meet the benchmark of 40.${magic}` };
  const tone = m.score >= 20 ? 'mixed' : 'bad';
  return { tone, headline: head, detail: `You are ${fmtPct1(m.gap)} points short of 40. You could close it with ${fmtPct1(m.gap)} points more growth, or ${fmtPct1(m.gap)} points more cash flow margin, or a mix.${magic}` };
}
export const kpis = (i, m) => [
  { label: 'ARR growth', value: fmtPct1(m.growth), note: 'Year over year.' },
  { label: 'Free cash flow margin', value: fmtPct1(i.fcfMargin), tone: i.fcfMargin >= 0 ? 'good' : 'mixed', note: 'Share of revenue left as cash.' },
  { label: 'Rule of 40 score', value: fmtPct1(m.score), tone: m.score >= 40 ? 'good' : (m.score >= 20 ? 'mixed' : 'bad'), note: 'Target 40 or more.' },
  { label: 'Magic number', value: m.magic === null ? 'N/A' : fmtX(m.magic, 2), tone: m.magic === null ? 'neutral' : (m.magic >= 0.75 ? 'good' : (m.magic >= 0.5 ? 'mixed' : 'bad')), note: 'Net new ARR per $1 of sales and marketing.' },
];
export const results = [
  { label: 'ARR growth', get: (m) => m.growth, kind: 'pp', scenario: true },
  { label: 'Free cash flow margin', get: (m, i) => i.fcfMargin, kind: 'pp', scenario: true },
  { label: 'Rule of 40 score', get: (m) => m.score, kind: 'pp', scenario: true },
  { label: 'Points short of 40', get: (m) => Math.max(0, m.gap), kind: 'pp' },
  { label: 'Net new ARR in the year', get: (m) => m.netNew, kind: 'money' },
  { label: 'Magic number (annual)', get: (m) => m.magic, kind: 'num2', scenario: true },
  { label: 'Sales and marketing payback (months)', get: (m) => m.payback, kind: 'months', scenario: true },
];
export const chart = {
  title: 'Growth, margin and the Rule of 40', type: 'bar', x: 'k', xKind: 'text', xTitle: 'Measure', yKind: 'pp', data: (i, m) => m.bars, series: [{ key: 'v', name: 'Percent' }],
  note: 'Growth plus free cash flow margin gives the score. The company meets the rule when the score bar reaches the target bar.',
  caption: (i, m) => `Score ${fmtPct1(m.score)} versus a target of 40.`,
};
export const scenarios = trio(
  (i) => ({ ...i, arr: i.arrPrev + (i.arr - i.arrPrev) * 0.75, fcfMargin: i.fcfMargin - 5 }),
  (i) => ({ ...i, arr: i.arrPrev + (i.arr - i.arrPrev) * 1.2, fcfMargin: i.fcfMargin + 5 }),
);
export const scenarioNote = 'Illustrative cases. Pessimistic: net new ARR 25% lower and margin 5 points lower. Optimistic: net new ARR 20% higher and margin 5 points higher.';
export const sens = [
  { label: 'Net new ARR (±20%)', worse: (i) => ({ ...i, arr: i.arrPrev + (i.arr - i.arrPrev) * 0.8 }), better: (i) => ({ ...i, arr: i.arrPrev + (i.arr - i.arrPrev) * 1.2 }) },
  { label: 'Free cash flow margin (±5 points)', worse: (i) => ({ ...i, fcfMargin: i.fcfMargin - 5 }), better: (i) => ({ ...i, fcfMargin: i.fcfMargin + 5 }) },
  { label: 'Prior-year ARR (±5%)', worse: (i) => ({ ...i, arrPrev: i.arrPrev * 1.05 }), better: (i) => ({ ...i, arrPrev: i.arrPrev * 0.95 }) },
];
export const sensMetric = { label: 'Rule of 40 score (points)', fn: (m) => m.score, kind: 'pp' };
export const bench = (i, m) => [
  { label: 'Rule of 40 score', value: m.score, unit: 'points', range: [40, 200], strength: 'secondary', refText: '40 or more', note: 'The rule says growth rate plus profit margin should be at least 40%. One analysis of a 2021 KeyBanc survey of 173 private SaaS companies found about 29% met it. Brad Feld is credited with popularizing it.', source: 'SaaStr, The Rule of 40 in SaaS', url: 'https://www.saastr.com/saas-rule-of-40/' },
  { label: 'Magic number', value: m.magic, unit: 'x', range: [0.75, 5], strength: 'secondary', refText: 'Above 0.75 efficient, 0.5 to 0.75 acceptable, below 0.5 pull back', note: 'The usual definition uses quarterly revenue change times four over the prior quarter of sales and marketing spend. This tool uses a simpler annual version, so read it as a rough guide.', source: 'ChartMogul, SaaS magic number', url: 'https://chartmogul.com/saas-metrics/magic-number/' },
];
export const planning = 'Definitions vary: some use revenue growth, some ARR growth; some use free cash flow margin, some EBITDA or operating margin. Pick one definition and use it every time.';
export const how = [
  { h: 'Rule of 40', p: 'Growth rate plus profit margin. The idea is that a company can trade growth for profit, as long as the two together reach 40. Here growth is ARR growth over the year and profit is free cash flow margin.' },
  { h: 'Magic number', p: 'Net new ARR over the year divided by sales and marketing spend. Above about 0.75 suggests selling is efficient enough to invest more. This is an annual approximation of the standard quarterly version.' },
  { h: 'Payback', p: 'Months of gross profit from the new ARR needed to repay the sales and marketing spend. Shorter is better.' },
  { h: 'Use consistent inputs', p: 'ARR growth is net: it includes churn and expansion. Free cash flow margin can be negative.' },
];
export default {
  slug: 'rule-of-40', title: 'Rule of 40 and Growth Efficiency', eyebrow: 'Finance', titleLead: 'Rule of 40 and', titleAccent: 'Growth Efficiency', fileName: 'Rule_of_40',
  blurb: 'Whether your growth and your cash flow add up to a healthy business, and how efficiently your sales and marketing spend turns into new ARR.',
  defaults, limits, presets,
  groups: [{ title: 'Your SaaS numbers', fields: [
    { key: 'arr', label: 'ARR Today', min: 100000, max: 500000000, step: 100000, prefix: '$', tooltip: 'Annual recurring revenue now.' },
    { key: 'arrPrev', label: 'ARR One Year Ago', min: 100000, max: 500000000, step: 100000, prefix: '$', tooltip: 'Annual recurring revenue twelve months ago.' },
    { key: 'fcfMargin', label: 'Free Cash Flow Margin', min: -150, max: 70, suffix: '%', tooltip: 'Free cash flow divided by revenue. Negative when you burn cash.' },
    { key: 'smSpend', label: 'Sales and Marketing Spend, Last Year', min: 10000, max: 200000000, step: 10000, prefix: '$', tooltip: 'Total sales and marketing spend over the same twelve months.' },
    { key: 'grossMargin', label: 'Gross Margin', min: 10, max: 95, suffix: '%', advanced: true, tooltip: 'Used for the sales and marketing payback.' },
  ], advancedSummary: (i) => `Gross margin ${i.grossMargin}%` }],
  model, verdictFor, kpis, results, chart, scenarios, scenarioNote, sens, sensMetric, bench, planning, how,
};
