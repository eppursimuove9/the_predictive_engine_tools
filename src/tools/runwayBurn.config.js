import { fmtMoney, fmtMoney2, fmtX } from '../shared/format.js';
import { trio, div } from './_math.js';

export const defaults = { cash: 2400000, burn: 150000, newArr: 60000, burnGrowth: 2, arrGrowth: 3 };
export const limits = { cash: [10000, 1000000000], burn: [1000, 50000000], newArr: [0, 50000000], burnGrowth: [-5, 15], arrGrowth: [-5, 15] };
export const presets = [
  { id: 'seed', name: 'Seed stage', note: 'Burning fast', inputs: { cash: 1200000, burn: 90000, newArr: 25000, burnGrowth: 2, arrGrowth: 4 } },
  { id: 'a', name: 'Series A', note: 'Efficient growth', inputs: { cash: 6000000, burn: 350000, newArr: 220000, burnGrowth: 1.5, arrGrowth: 3 } },
  { id: 'lean', name: 'Capital efficient', note: 'Burn multiple under 1', inputs: { cash: 4000000, burn: 120000, newArr: 150000, burnGrowth: 1, arrGrowth: 2 } },
];
const band = (x) => (x === null ? 'n/a' : (x < 1 ? 'amazing' : (x < 1.5 ? 'great' : (x < 2 ? 'good' : (x < 3 ? 'suspect' : 'bad')))));
export function model(i) {
  const series = []; let cash = i.cash;
  for (let t = 0; t <= 36; t++) {
    series.push({ k: t, v: Math.round(cash) });
    cash -= i.burn * (1 + i.burnGrowth / 100) ** t;
  }
  // exact month fraction for the cash-out point
  let c = i.cash; let exact = null;
  for (let t = 0; t < 60; t++) { const b = i.burn * (1 + i.burnGrowth / 100) ** t; if (c - b <= 0) { exact = t + c / b; break; } c -= b; }
  const flat = i.cash / i.burn;
  const burnMultiple = div(i.burn, i.newArr);
  const target18 = i.cash / 18;
  return { runway: exact, flat, burnMultiple, band: band(burnMultiple), cutFor18: exact !== null && exact < 18 ? Math.max(0, (1 - target18 / i.burn) * 100) : 0, series, annualBurn: i.burn * 12 };
}
export function verdictFor(i, m) {
  const rw = m.runway === null ? 'more than five years' : `${m.runway.toFixed(1)} months`;
  const bm = m.burnMultiple === null ? 'You are adding no new ARR, so burn multiple cannot be calculated.' : `Your burn multiple is ${fmtX(m.burnMultiple)}: you spend ${fmtMoney2(m.burnMultiple)} to add $1 of ARR, which investors would call ${m.band}.`;
  const head = `At ${fmtMoney(i.burn)} a month of burn growing ${i.burnGrowth}% a month, your ${fmtMoney(i.cash)} lasts about ${rw}.`;
  const tone = m.runway === null || m.runway >= 18 ? 'good' : (m.runway >= 9 ? 'mixed' : 'bad');
  const act = tone === 'bad' ? ` A fundraise usually takes around six months, so you would need to start now. ` : (tone === 'mixed' ? ' Plan the next raise or a cost cut inside this window. ' : ' ');
  return { tone, headline: head, detail: `${bm}${act}${m.cutFor18 > 0 ? `To reach 18 months you would need to cut burn by about ${m.cutFor18.toFixed(0)}%.` : ''}`.trim() };
}
export const kpis = (i, m) => [
  { label: 'Runway', value: m.runway === null ? '60+ months' : `${m.runway.toFixed(1)} mo`, tone: m.runway === null || m.runway >= 18 ? 'good' : (m.runway >= 9 ? 'mixed' : 'bad'), note: `With burn growing ${i.burnGrowth}% a month.` },
  { label: 'Runway at flat burn', value: `${m.flat.toFixed(1)} mo`, note: 'Cash divided by burn.' },
  { label: 'Burn multiple', value: fmtX(m.burnMultiple), tone: m.burnMultiple === null ? 'bad' : (m.burnMultiple < 1.5 ? 'good' : (m.burnMultiple < 3 ? 'mixed' : 'bad')), note: `Rated ${m.band}.` },
  { label: 'Burn per year', value: fmtMoney(m.annualBurn), note: 'At today\'s monthly burn.' },
];
export const results = [
  { label: 'Cash today', get: (m, i) => i.cash, kind: 'money' },
  { label: 'Net burn per month', get: (m, i) => i.burn, kind: 'money' },
  { label: 'Net new ARR per month', get: (m, i) => i.newArr, kind: 'money' },
  { label: 'Runway with growing burn (months)', get: (m) => m.runway, kind: 'months', scenario: true },
  { label: 'Runway at flat burn (months)', get: (m) => m.flat, kind: 'months', scenario: true },
  { label: 'Burn multiple', get: (m) => m.burnMultiple, kind: 'x', scenario: true },
  { label: 'Burn cut needed for 18 months of runway', get: (m) => m.cutFor18, kind: 'pp0' },
];
export const chart = {
  title: 'Cash balance by month', type: 'area', x: 'k', xKind: 'int', xTitle: 'Month', xFormat: (v) => `M${v}`, yKind: 'money', data: (i, m) => m.series,
  series: [{ key: 'v', name: 'Cash balance' }],
  note: 'Cash left each month if burn keeps growing at the rate you entered and nothing is raised. Where it reaches zero you run out of cash.',
  ref: () => ({ y: 0, label: 'Out of cash' }),
  caption: (i, m) => (m.runway === null ? 'Cash lasts beyond the 36 months shown.' : `Cash reaches zero around month ${Math.ceil(m.runway)}.`),
};
export const scenarios = trio(
  (i) => ({ ...i, burn: i.burn * 1.15, newArr: i.newArr * 0.7, burnGrowth: i.burnGrowth + 1 }),
  (i) => ({ ...i, burn: i.burn * 0.9, newArr: i.newArr * 1.3 }),
);
export const scenarioNote = 'Illustrative cases. Pessimistic: burn +15%, new ARR -30%, burn growth one point faster. Optimistic: burn -10%, new ARR +30%.';
export const sens = [
  { label: 'Monthly burn (±15%)', worse: (i) => ({ ...i, burn: i.burn * 1.15 }), better: (i) => ({ ...i, burn: i.burn * 0.85 }) },
  { label: 'Burn growth (±2 points a month)', worse: (i) => ({ ...i, burnGrowth: Math.min(15, i.burnGrowth + 2) }), better: (i) => ({ ...i, burnGrowth: Math.max(-5, i.burnGrowth - 2) }) },
  { label: 'Cash today (±20%)', worse: (i) => ({ ...i, cash: i.cash * 0.8 }), better: (i) => ({ ...i, cash: i.cash * 1.2 }) },
];
export const sensMetric = { label: 'runway (months)', fn: (m) => m.runway ?? 60, kind: 'months' };
export const bench = (i, m) => [
  { label: 'Burn multiple', value: m.burnMultiple, unit: 'x', range: [0, 2], strength: 'secondary', refText: 'Under 1 amazing, 1 to 1.5 great, 1.5 to 2 good, 2 to 3 suspect, over 3 bad', note: 'Burn multiple is net burn divided by net new ARR over the same period. The scale is the one David Sacks (Craft Ventures) uses; this reading is from a transcript of his talk.', source: 'David Sacks on the Burn Multiple (talk transcript)', url: 'https://lawwu.github.io/transcripts/SjDmtKF4EZA.html' },
  { label: 'Runway', value: m.runway, unit: 'months', range: [18, 60], strength: 'rule', refText: '18 months or more after a raise', note: 'Many investors suggest holding at least 18 months of runway and starting a raise with 9 to 12 left. This is common advice, not a published study.', source: 'Practitioner rule of thumb, no published source' },
];
export const planning = 'The model keeps burn growing at a constant monthly rate and ignores new funding, revenue changes beyond the net burn you enter, and one-off costs. Use net burn after collections, not gross spending.';
export const how = [
  { h: 'Runway', p: 'How many months until cash reaches zero. The tool lets burn grow each month, because costs rarely stay flat while a company is hiring.' },
  { h: 'Burn multiple', p: 'Net burn divided by net new ARR over the same period. It says how many dollars you burn to add one dollar of recurring revenue. Lower is better.' },
  { h: 'Net, not gross', p: 'Use net burn (cash out minus cash in) and net new ARR (new plus expansion minus churn and contraction), both per month.' },
  { h: 'What to do with it', p: 'If runway is short, either cut burn, raise earlier, or both. The cut needed for 18 months shows the size of the problem.' },
];
export default {
  slug: 'runway-burn-multiple', title: 'Cash Runway and Burn Multiple', eyebrow: 'Finance', titleLead: 'Cash Runway and', titleAccent: 'Burn Multiple', fileName: 'Runway_and_Burn_Multiple',
  blurb: 'How many months of cash you have if burn keeps growing, and how efficiently you turn burn into new recurring revenue.',
  defaults, limits, presets,
  groups: [{ title: 'Your cash position', fields: [
    { key: 'cash', label: 'Cash in the Bank', min: 10000, max: 100000000, step: 10000, prefix: '$', tooltip: 'Cash and equivalents you can actually spend today.' },
    { key: 'burn', label: 'Net Burn per Month', min: 1000, max: 5000000, step: 1000, prefix: '$', tooltip: 'Cash out minus cash in, per month.' },
    { key: 'newArr', label: 'Net New ARR per Month', min: 0, max: 5000000, step: 1000, prefix: '$', tooltip: 'New plus expansion ARR, minus churn and downgrades, per month.' },
    { key: 'burnGrowth', label: 'Burn Growth per Month', min: -5, max: 15, step: 0.5, suffix: '%', advanced: true, tooltip: 'How fast monthly burn grows, for example as you hire.' },
    { key: 'arrGrowth', label: 'Net New ARR Growth per Month', min: -5, max: 15, step: 0.5, suffix: '%', advanced: true, tooltip: 'Shown for reference. The runway uses net burn, which already includes revenue.' },
  ], advancedSummary: (i) => `Burn grows ${i.burnGrowth}% a month` }],
  model, verdictFor, kpis, results, chart, scenarios, scenarioNote, sens, sensMetric, bench, planning, how,
};
