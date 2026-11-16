import { fmtMoney, fmtPct1 } from '../shared/format.js';
import { trio } from './_math.js';

export const defaults = { buildCost: 400000, buildMonths: 9, maintPct: 20, license: 90000, impl: 30000, buyMonths: 2, licenseGrowth: 7, years: 5, monthlyValue: 15000 };
export const limits = { buildCost: [1000, 100000000], buildMonths: [1, 60], maintPct: [0, 60], license: [0, 50000000], impl: [0, 50000000], buyMonths: [0, 24], licenseGrowth: [0, 25], years: [1, 10], monthlyValue: [0, 10000000] };
export const presets = [
  { id: 'tool', name: 'Internal tool', note: 'Small build', inputs: { buildCost: 120000, buildMonths: 4, maintPct: 15, license: 36000, impl: 5000, buyMonths: 1, licenseGrowth: 5, years: 5, monthlyValue: 4000 } },
  { id: 'core', name: 'Core capability', note: 'Strategic, large', inputs: { buildCost: 900000, buildMonths: 14, maintPct: 18, license: 300000, impl: 80000, buyMonths: 4, licenseGrowth: 8, years: 7, monthlyValue: 40000 } },
  { id: 'platform', name: 'Commodity platform', note: 'Buying is easy', inputs: { buildCost: 1200000, buildMonths: 12, maintPct: 22, license: 250000, impl: 60000, buyMonths: 3, licenseGrowth: 6, years: 5, monthlyValue: 50000 } },
];
// Cost of building = upfront build cost + yearly maintenance, plus the value you forgo while waiting for it to go live.
// Cost of buying = implementation + yearly licenses (growing), plus the value you forgo while implementing.
export function model(i) {
  const buildDelay = i.buildMonths * i.monthlyValue;
  const buyDelay = i.buyMonths * i.monthlyValue;
  const maint = i.buildCost * (i.maintPct / 100);
  const series = [{ k: 0, build: Math.round(i.buildCost + buildDelay), buy: Math.round(i.impl + buyDelay) }];
  let b = i.buildCost + buildDelay; let y = i.impl + buyDelay; let crossover = null;
  for (let t = 1; t <= i.years; t++) {
    b += maint;
    y += i.license * (1 + i.licenseGrowth / 100) ** (t - 1);
    series.push({ k: t, build: Math.round(b), buy: Math.round(y) });
    if (crossover === null && b < y) crossover = t;
  }
  const diff = y - b; // positive: building is cheaper
  const licenseTotal = y - i.impl - buyDelay;
  return {
    buildTotal: b, buyTotal: y, diff, cheaper: diff > 0 ? 'build' : 'buy', pct: (Math.abs(diff) / Math.max(1, Math.min(b, y))) * 100, crossover,
    buildDelay, buyDelay, maintTotal: maint * i.years, licenseTotal, series, buildCash: b - buildDelay, buyCash: y - buyDelay,
  };
}
export function verdictFor(i, m) {
  const winner = m.cheaper === 'build' ? 'building' : 'buying';
  const head = `Over ${i.years} years, ${winner} is cheaper by about ${fmtMoney(Math.abs(m.diff))} (${fmtPct1(m.pct)}). Building costs ${fmtMoney(m.buildTotal)} and buying costs ${fmtMoney(m.buyTotal)}, including the value you forgo while waiting.`;
  const close = m.pct < 15;
  const x = m.crossover === null ? 'Buying stays cheaper for the whole period.' : `Building becomes the cheaper path from year ${m.crossover}.`;
  return { tone: close ? 'mixed' : 'good', headline: head, detail: `${x} ${close ? 'The difference is small, so the decision should rest on things this model leaves out: strategic control, risk, lock-in, support and the cost of the team you would need.' : 'The gap is large enough that cost should weigh heavily, though it still leaves out strategic control, risk and lock-in.'}` };
}
export const kpis = (i, m) => [
  { label: 'Cost of building', value: fmtMoney(m.buildTotal), note: `Over ${i.years} years, with delay.` },
  { label: 'Cost of buying', value: fmtMoney(m.buyTotal), note: `Over ${i.years} years, with delay.` },
  { label: m.cheaper === 'build' ? 'Building saves' : 'Buying saves', value: fmtMoney(Math.abs(m.diff)), tone: 'good', note: `${fmtPct1(m.pct)} less.` },
  { label: 'Building cheaper from', value: m.crossover === null ? 'Never' : `Year ${m.crossover}`, note: 'Where the two lines cross.' },
];
export const results = [
  { label: 'Build: upfront cost', get: (m, i) => i.buildCost, kind: 'money' },
  { label: 'Build: maintenance over the period', get: (m) => m.maintTotal, kind: 'money' },
  { label: 'Build: value forgone while building', get: (m) => m.buildDelay, kind: 'money' },
  { label: 'Total cost of building', get: (m) => m.buildTotal, kind: 'money', scenario: true },
  { label: 'Buy: implementation', get: (m, i) => i.impl, kind: 'money' },
  { label: 'Buy: licenses over the period', get: (m) => m.licenseTotal, kind: 'money' },
  { label: 'Buy: value forgone while implementing', get: (m) => m.buyDelay, kind: 'money' },
  { label: 'Total cost of buying', get: (m) => m.buyTotal, kind: 'money', scenario: true },
  { label: 'Difference (positive means building is cheaper)', get: (m) => m.diff, kind: 'money', scenario: true },
];
export const chart = {
  title: 'Cumulative cost: build versus buy', type: 'line', x: 'k', xKind: 'int', xTitle: 'Year', xFormat: (v) => `Y${v}`, yKind: 'money', data: (i, m) => m.series,
  series: [{ key: 'build', name: 'Build' }, { key: 'buy', name: 'Buy' }],
  note: 'Total cost to date for each path. Year 0 includes the upfront cost and the value you forgo while waiting for it to go live. The cheaper path is the lower line at the end.',
  caption: (i, m) => (m.crossover === null ? 'The lines never cross: buying is cheaper for the whole period.' : `The lines cross in year ${m.crossover}.`),
};
export const scenarios = trio(
  (i) => ({ ...i, buildCost: i.buildCost * 1.4, buildMonths: i.buildMonths * 1.4, maintPct: Math.min(60, i.maintPct * 1.25) }),
  (i) => ({ ...i, buildCost: i.buildCost * 0.85, license: i.license * 1.15 }),
);
export const scenarioNote = 'Illustrative cases. Pessimistic for building: cost +40%, time +40%, maintenance +25% (software projects often overrun). Optimistic for building: cost -15% and licenses 15% dearer.';
export const sens = [
  { label: 'Build cost (±30%)', worse: (i) => ({ ...i, buildCost: i.buildCost * 1.3 }), better: (i) => ({ ...i, buildCost: i.buildCost * 0.7 }) },
  { label: 'Maintenance rate (±5 points)', worse: (i) => ({ ...i, maintPct: Math.min(60, i.maintPct + 5) }), better: (i) => ({ ...i, maintPct: Math.max(0, i.maintPct - 5) }) },
  { label: 'License cost (±20%)', worse: (i) => ({ ...i, license: i.license * 0.8 }), better: (i) => ({ ...i, license: i.license * 1.2 }) },
  { label: 'Time to build (±40%)', worse: (i) => ({ ...i, buildMonths: i.buildMonths * 1.4 }), better: (i) => ({ ...i, buildMonths: Math.max(1, i.buildMonths * 0.6) }) },
  { label: 'Years compared (±2)', worse: (i) => ({ ...i, years: Math.max(1, i.years - 2) }), better: (i) => ({ ...i, years: Math.min(10, i.years + 2) }) },
];
export const sensMetric = { label: 'advantage of building over buying (USD)', fn: (m) => m.diff, kind: 'money' };
export const bench = (i) => [
  { label: 'Yearly maintenance as a share of build cost', value: i.maintPct, unit: '%', range: [15, 25], strength: 'rule', note: 'Software maintenance is often quoted at roughly 15% to 25% of the original build cost each year. This is a common rule of thumb, not a published study.', source: 'Practitioner rule of thumb, no published source' },
];
export const planning = 'The model is a cost comparison. It does not capture strategic differentiation, switching and lock-in risk, security, support quality or the opportunity cost of your engineers. Build estimates tend to be optimistic, so test the pessimistic scenario.';
export const how = [
  { h: 'Cost of building', p: 'The upfront engineering cost, plus maintenance each year as a share of that cost, plus the value you forgo for every month you wait for it to go live.' },
  { h: 'Cost of buying', p: 'Implementation, plus the license each year (growing at the rate you enter), plus the value you forgo while you implement it. Buying is usually live much sooner.' },
  { h: 'Value of having it live', p: 'The benefit the capability brings each month once it is running. Waiting longer costs you that benefit, so a slower build is more expensive than it looks.' },
  { h: 'Beyond the numbers', p: 'Build when it differentiates you or no product fits. Buy when it is a commodity. The numbers only tell you what the choice costs.' },
];
export default {
  slug: 'build-vs-buy', title: 'Build vs Buy: Total Cost', eyebrow: 'Finance and Engineering', titleLead: 'Build vs Buy:', titleAccent: 'Total Cost', fileName: 'Build_vs_Buy',
  blurb: 'Compare the total cost of building something yourself with buying it, including maintenance, license growth and the value lost while you wait.',
  defaults, limits, presets,
  groups: [
    { title: 'If you build', fields: [
      { key: 'buildCost', label: 'Build Cost', min: 1000, max: 10000000, step: 5000, prefix: '$', tooltip: 'Engineering and other upfront cost of building it.' },
      { key: 'buildMonths', label: 'Months to Build', min: 1, max: 48, suffix: ' mo', tooltip: 'Time until it is live and useful.' },
      { key: 'maintPct', label: 'Yearly Maintenance', min: 0, max: 60, suffix: '%', advanced: true, tooltip: 'Yearly upkeep as a share of the build cost.' },
    ], advancedSummary: (i) => `Maintenance ${i.maintPct}% a year` },
    { title: 'If you buy', fields: [
      { key: 'license', label: 'License per Year', min: 0, max: 2000000, step: 1000, prefix: '$', tooltip: 'Yearly subscription or license price in the first year.' },
      { key: 'impl', label: 'Implementation Cost', min: 0, max: 1000000, step: 1000, prefix: '$', tooltip: 'One-time cost to set it up and integrate it.' },
      { key: 'buyMonths', label: 'Months to Implement', min: 0, max: 24, suffix: ' mo', tooltip: 'Time until it is live and useful.' },
      { key: 'licenseGrowth', label: 'License Price Growth per Year', min: 0, max: 25, step: 0.5, suffix: '%', advanced: true, tooltip: 'Yearly price increase from the vendor.' },
    ], advancedSummary: (i) => `Price grows ${i.licenseGrowth}% a year` },
    { title: 'Comparison', fields: [
      { key: 'years', label: 'Years Compared', min: 1, max: 10, suffix: ' yr', tooltip: 'The period over which you compare the total cost.' },
      { key: 'monthlyValue', label: 'Value of Having It Live, per Month', min: 0, max: 500000, step: 500, prefix: '$', tooltip: 'Benefit you get each month once it is running. Waiting for it costs you this.' },
    ] },
  ],
  model, verdictFor, kpis, results, chart, scenarios, scenarioNote, sens, sensMetric, bench, planning, how,
};
