import { fmtMoney, fmtMoney2, fmtPct1, fmtNum } from '../shared/format.js';
import { trio, npv, irr } from './_math.js';

export const defaults = { investment: 250000, benefit: 120000, growth: 5, runCost: 20000, years: 5, rate: 10, salvage: 0 };
export const limits = { investment: [1000, 1000000000], benefit: [0, 1000000000], growth: [-20, 30], runCost: [0, 1000000000], years: [1, 10], rate: [0, 40], salvage: [0, 100] };
export const presets = [
  { id: 'soft', name: 'Software rollout', note: '5-year horizon', inputs: { investment: 250000, benefit: 120000, growth: 5, runCost: 20000, years: 5, rate: 10, salvage: 0 } },
  { id: 'equip', name: 'Equipment', note: '8 years, resale value', inputs: { investment: 800000, benefit: 260000, growth: 0, runCost: 40000, years: 8, rate: 9, salvage: 15 } },
  { id: 'weak', name: 'Weak case', note: 'Does not pay back', inputs: { investment: 500000, benefit: 90000, growth: 2, runCost: 30000, years: 5, rate: 10, salvage: 0 } },
];
export function model(i) {
  const flows = [-i.investment];
  for (let t = 1; t <= i.years; t++) {
    let f = i.benefit * (1 + i.growth / 100) ** (t - 1) - i.runCost;
    if (t === i.years) f += i.investment * (i.salvage / 100);
    flows.push(f);
  }
  const r = i.rate / 100;
  const value = npv(r, flows);
  const rate = irr(flows);
  let payback = null; let dpayback = null;
  const series = [{ k: 0, c: Math.round(flows[0]), d: Math.round(flows[0]) }];
  let cum = flows[0]; let dcum = flows[0];
  for (let t = 1; t <= i.years; t++) {
    const prev = cum; const dprev = dcum;
    cum += flows[t]; dcum += flows[t] / (1 + r) ** t;
    if (payback === null && prev < 0 && cum >= 0) payback = t - 1 + (-prev) / flows[t];
    if (dpayback === null && dprev < 0 && dcum >= 0) dpayback = t - 1 + (-dprev) / (flows[t] / (1 + r) ** t);
    series.push({ k: t, c: Math.round(cum), d: Math.round(dcum) });
  }
  const inflowPv = flows.slice(1).reduce((s, f, k) => s + f / (1 + r) ** (k + 1), 0);
  return { flows, npv: value, irr: rate, payback, dpayback, totalNet: cum, roi: (cum / i.investment) * 100, pi: inflowPv / i.investment, series, inflowPv };
}
export function verdictFor(i, m) {
  const irrTxt = m.irr === null ? 'no meaningful internal rate of return' : `an internal rate of return of ${fmtPct1(m.irr * 100)}`;
  const head = `Over ${i.years} years the project has a net present value of ${fmtMoney(m.npv)} at a ${i.rate}% discount rate, and ${irrTxt}.`;
  if (m.npv <= 0) return { tone: 'bad', headline: head, detail: `It destroys value at your required return: the cash it brings back, in today's money, is less than the ${fmtMoney(i.investment)} you put in. ${m.payback === null ? `It does not pay back within ${i.years} years.` : ''}`.trim() };
  const pay = m.payback === null ? '' : ` It pays back in ${m.payback.toFixed(1)} years (${m.dpayback === null ? 'not within the horizon once discounted' : `${m.dpayback.toFixed(1)} years once discounted`}).`;
  return { tone: m.irr !== null && m.irr * 100 > i.rate + 5 ? 'good' : 'mixed', headline: head, detail: `It creates value above your required return.${pay} Profitability index ${m.pi.toFixed(2)}: each dollar invested returns ${fmtMoney2(m.pi)} in today's money.` };
}
export const kpis = (i, m) => [
  { label: 'Net present value', value: fmtMoney(m.npv), tone: m.npv > 0 ? 'good' : 'bad', note: `At a ${i.rate}% discount rate.` },
  { label: 'Internal rate of return', value: m.irr === null ? 'N/A' : fmtPct1(m.irr * 100), tone: m.irr === null ? 'bad' : (m.irr * 100 > i.rate ? 'good' : 'bad'), note: `Versus ${i.rate}% required.` },
  { label: 'Payback', value: m.payback === null ? 'Never' : `${m.payback.toFixed(1)} yrs`, tone: m.payback === null ? 'bad' : 'good', note: 'Simple, not discounted.' },
  { label: 'Total net cash', value: fmtMoney(m.totalNet), tone: m.totalNet > 0 ? 'good' : 'bad', note: `ROI ${fmtNum(m.roi)}% over ${i.years} years.` },
];
export const results = [
  { label: 'Initial investment', get: (m, i) => i.investment, kind: 'money' },
  { label: 'Net present value', get: (m) => m.npv, kind: 'money', scenario: true },
  { label: 'Internal rate of return', get: (m) => (m.irr === null ? null : m.irr * 100), kind: 'pp', scenario: true },
  { label: 'Payback (years, simple)', get: (m) => m.payback, kind: 'num1', scenario: true },
  { label: 'Payback (years, discounted)', get: (m) => m.dpayback, kind: 'num1' },
  { label: 'Total net cash over the horizon', get: (m) => m.totalNet, kind: 'money', scenario: true },
  { label: 'Return on investment', get: (m) => m.roi, kind: 'pp0' },
  { label: 'Profitability index', get: (m) => m.pi, kind: 'num2' },
];
export const chart = {
  title: 'Cumulative cash flow by year', type: 'line', x: 'k', xKind: 'int', xTitle: 'Year', xFormat: (v) => `Y${v}`, yKind: 'money', data: (i, m) => m.series,
  series: [{ key: 'c', name: 'Cumulative cash flow' }, { key: 'd', name: 'Cumulative, discounted' }],
  note: 'The project starts below zero by the investment. Where each line crosses zero is the payback, simple and discounted at your required return.',
  ref: () => ({ y: 0, label: 'Break-even' }),
  caption: (i, m) => (m.payback === null ? 'The investment is not recovered within the horizon.' : `The simple payback is in year ${Math.ceil(m.payback)}.`),
};
export const scenarios = trio(
  (i) => ({ ...i, benefit: i.benefit * 0.8, investment: i.investment * 1.15, rate: Math.min(40, i.rate + 2) }),
  (i) => ({ ...i, benefit: i.benefit * 1.15, investment: i.investment * 0.95 }),
);
export const scenarioNote = 'Illustrative cases. Pessimistic: benefits -20%, investment +15%, discount rate +2 points. Optimistic: benefits +15%, investment -5%.';
export const sens = [
  { label: 'Yearly benefit (±20%)', worse: (i) => ({ ...i, benefit: i.benefit * 0.8 }), better: (i) => ({ ...i, benefit: i.benefit * 1.2 }) },
  { label: 'Initial investment (±15%)', worse: (i) => ({ ...i, investment: i.investment * 1.15 }), better: (i) => ({ ...i, investment: i.investment * 0.85 }) },
  { label: 'Discount rate (±3 points)', worse: (i) => ({ ...i, rate: Math.min(40, i.rate + 3) }), better: (i) => ({ ...i, rate: Math.max(0, i.rate - 3) }) },
  { label: 'Running cost (±25%)', worse: (i) => ({ ...i, runCost: i.runCost * 1.25 }), better: (i) => ({ ...i, runCost: i.runCost * 0.75 }) },
  { label: 'Benefit growth (±3 points)', worse: (i) => ({ ...i, growth: i.growth - 3 }), better: (i) => ({ ...i, growth: i.growth + 3 }) },
];
export const sensMetric = { label: 'net present value (USD)', fn: (m) => m.npv, kind: 'money' };
export const bench = (i, m) => [
  { label: 'Internal rate of return versus required return', value: m.irr === null ? null : m.irr * 100, unit: '%', range: [i.rate, 1000], strength: 'rule', refText: `Above your ${i.rate}% required return`, note: 'The standard capital budgeting rule: accept a project when its net present value is positive, which is when its internal rate of return exceeds your required return. Your required return should be your cost of capital plus a margin for risk.', source: 'Standard capital budgeting rule (finance textbooks)' },
];
export const planning = 'The result is only as good as the benefit estimate. Benefits should be net, after tax and incremental to what happens without the project. Use a discount rate that reflects the risk of this project, not only your cost of capital.';
export const how = [
  { h: 'Net present value', p: 'Every future cash flow is shrunk by the discount rate, because money later is worth less than money today. The NPV is the sum of those, minus the investment. Above zero, the project beats your required return.' },
  { h: 'Internal rate of return', p: 'The discount rate at which the NPV would be exactly zero. It is the yearly return the project earns on the money invested. Compare it with your required return.' },
  { h: 'Payback', p: 'How long until the cash back covers the investment. The simple version ignores the time value of money; the discounted version does not, so it is always longer.' },
  { h: 'Salvage', p: 'The share of the investment you can recover at the end, for example by selling equipment. It is added to the last year.' },
];
export default {
  slug: 'investment-case', title: 'Investment Case: NPV, IRR and Payback', eyebrow: 'Finance', titleLead: 'Investment Case:', titleAccent: 'NPV, IRR and Payback', fileName: 'Investment_Case',
  blurb: 'The financial case for any project or purchase: net present value, internal rate of return and payback, with scenarios for the board.',
  defaults, limits, presets,
  groups: [{ title: 'Your investment', fields: [
    { key: 'investment', label: 'Initial Investment', min: 1000, max: 20000000, step: 1000, prefix: '$', tooltip: 'Everything you spend up front, in year 0.' },
    { key: 'benefit', label: 'Yearly Benefit in Year 1', min: 0, max: 20000000, step: 1000, prefix: '$', tooltip: 'Extra profit or savings the project brings in its first year, before the running cost.' },
    { key: 'runCost', label: 'Running Cost per Year', min: 0, max: 5000000, step: 1000, prefix: '$', tooltip: 'Ongoing cost of keeping the project going, each year.' },
    { key: 'years', label: 'Years Counted', min: 1, max: 10, suffix: ' yr', tooltip: 'How long the project produces benefits. Fewer years is more conservative.' },
    { key: 'rate', label: 'Discount Rate', min: 0, max: 40, step: 0.5, suffix: '%', tooltip: 'The return you require. Your cost of capital plus a margin for risk.' },
    { key: 'growth', label: 'Benefit Growth per Year', min: -20, max: 30, step: 0.5, suffix: '%', advanced: true, tooltip: 'How the yearly benefit changes from one year to the next.' },
    { key: 'salvage', label: 'Resale Value at the End', min: 0, max: 100, suffix: '%', advanced: true, tooltip: 'Share of the investment you recover at the end, for example by selling equipment.' },
  ], advancedSummary: (i) => `Growth ${i.growth}% · resale ${i.salvage}%` }],
  model, verdictFor, kpis, results, chart, scenarios, scenarioNote, sens, sensMetric, bench, planning, how,
};
