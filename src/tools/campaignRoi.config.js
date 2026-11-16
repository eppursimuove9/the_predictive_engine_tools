import { fmtMoney, fmtMoney2, fmtX, fmtPct, fmtMonths, fmtNum } from '../shared/format.js';
import { trio, div } from './_math.js';

export const defaults = { spend: 40000, fixedCost: 10000, leads: 300, conv: 2, acv: 9000, years: 1, margin: 75 };
export const limits = { spend: [0, 5000000], fixedCost: [0, 2000000], leads: [1, 100000], conv: [0.1, 50], acv: [100, 2000000], years: [1, 5], margin: [10, 100] };
export const presets = [
  { id: 'paid', name: 'Paid social', note: 'Many leads, low close', inputs: { spend: 20000, fixedCost: 3000, leads: 800, conv: 1, acv: 3000, years: 2, margin: 80 } },
  { id: 'event', name: 'Event or webinar', note: 'Fewer, warmer leads', inputs: { spend: 30000, fixedCost: 8000, leads: 150, conv: 8, acv: 18000, years: 1, margin: 75 } },
  { id: 'content', name: 'Content and SEO', note: 'Slow, compounding', inputs: { spend: 8000, fixedCost: 12000, leads: 600, conv: 1.5, acv: 6000, years: 2, margin: 80 } },
];
export function model(i) {
  const cost = i.spend + i.fixedCost;
  const customers = i.leads * (i.conv / 100);
  const revenue = customers * i.acv * i.years;
  const gp = revenue * (i.margin / 100);
  const monthlyGp = (customers * i.acv * (i.margin / 100)) / 12;
  // Gross profit builds month by month for the horizon, then stops (no value counted beyond it).
  const series = [];
  const horizon = Math.max(24, Math.ceil(i.years * 12) + 6);
  for (let t = 0; t <= horizon; t++) series.push({ k: t, cum: Math.round(monthlyGp * Math.min(t, i.years * 12)), });
  let payback = null;
  for (let t = 1; t <= i.years * 12; t++) { if (monthlyGp * t >= cost) { payback = cost > 0 ? cost / monthlyGp : 0; break; } }
  return {
    cost, customers, revenue, gp, roas: div(revenue, cost), romi: cost > 0 ? ((gp - cost) / cost) * 100 : null,
    cpl: div(cost, i.leads), cac: div(cost, customers), payback, series, monthlyGp,
    breakEvenConv: div(cost, i.leads * i.acv * i.years * (i.margin / 100)) === null ? null : (cost / (i.leads * i.acv * i.years * (i.margin / 100))) * 100,
    net: gp - cost,
  };
}
export function verdictFor(i, m) {
  const head = `The campaign costs ${fmtMoney(m.cost)} and should win about ${fmtNum(m.customers, 1)} customers. That is ${fmtMoney(m.cac)} each, and ${fmtMoney(m.gp)} of gross profit over ${i.years} year${i.years > 1 ? 's' : ''}.`;
  if (m.net < 0) return { tone: 'bad', headline: head, detail: `It does not pay for itself: you lose about ${fmtMoney(-m.net)}. You would need a conversion rate of ${m.breakEvenConv === null ? 'n/a' : `${m.breakEvenConv.toFixed(1)}%`} to break even, versus ${i.conv}% today.` };
  if (m.payback === null || m.payback > 12) return { tone: 'mixed', headline: head, detail: `It pays back, with a net gain of ${fmtMoney(m.net)}, but slowly: ${fmtMonths(m.payback)} of gross profit to recover the cost. Check you can fund the wait.` };
  return { tone: 'good', headline: head, detail: `It pays back in about ${fmtMonths(m.payback)} and returns ${fmtMoney(m.net)} after its cost. Conversion could fall to ${m.breakEvenConv.toFixed(1)}% before it stops paying for itself.` };
}
export const kpis = (i, m) => [
  { label: 'Return on ad spend', value: fmtX(m.roas), tone: m.net >= 0 ? 'good' : 'bad', note: 'Revenue over total cost.' },
  { label: 'Return on investment', value: fmtPct(m.romi), tone: m.net >= 0 ? 'good' : 'bad', note: 'Gross profit after cost, over cost.' },
  { label: 'Cost per customer', value: fmtMoney(m.cac), note: `Cost per lead ${fmtMoney2(m.cpl)}.` },
  { label: 'Payback', value: fmtMonths(m.payback), tone: m.payback === null ? 'bad' : (m.payback <= 12 ? 'good' : 'mixed'), note: 'Months of gross profit to recover cost.' },
];
export const results = [
  { label: 'Total campaign cost', get: (m) => m.cost, kind: 'money' },
  { label: 'Customers won', get: (m) => m.customers, kind: 'num1', scenario: true },
  { label: 'Revenue over the horizon', get: (m) => m.revenue, kind: 'money', scenario: true },
  { label: 'Gross profit over the horizon', get: (m) => m.gp, kind: 'money', scenario: true },
  { label: 'Net after cost', get: (m) => m.net, kind: 'money', scenario: true },
  { label: 'Return on ad spend (ROAS)', get: (m) => m.roas, kind: 'x', scenario: true },
  { label: 'Return on investment (ROMI)', get: (m) => m.romi, kind: 'pp0', scenario: true },
  { label: 'Cost per lead', get: (m) => m.cpl, kind: 'money2' },
  { label: 'Cost per customer', get: (m) => m.cac, kind: 'money', scenario: true },
  { label: 'Payback (months)', get: (m) => m.payback, kind: 'months' },
  { label: 'Break-even conversion rate', get: (m) => m.breakEvenConv, kind: 'pp' },
];
export const chart = {
  title: 'When the campaign pays you back', type: 'line', x: 'k', xKind: 'int', xTitle: 'Month', xFormat: (v) => `M${v}`, yKind: 'money', data: (i, m) => m.series,
  series: [{ key: 'cum', name: 'Gross profit so far' }],
  note: 'The line is the gross profit the customers have brought in so far. Where it crosses the dashed line, the campaign has paid for itself. It stops growing after the horizon you chose.',
  ref: (i, m) => ({ y: Math.round(m.cost), label: `Cost: ${fmtMoney(m.cost)}` }),
  caption: (i, m) => (m.payback === null ? `Within ${i.years} year${i.years > 1 ? 's' : ''} the gross profit does not cover the cost.` : `The cost is recovered in month ${Math.ceil(m.payback)}.`),
};
export const scenarios = trio(
  (i) => ({ ...i, leads: i.leads * 0.8, conv: i.conv * 0.8, spend: i.spend * 1.1 }),
  (i) => ({ ...i, leads: i.leads * 1.15, conv: i.conv * 1.2 }),
);
export const scenarioNote = 'Illustrative cases. Pessimistic: leads -20%, conversion -20%, spend +10%. Optimistic: leads +15%, conversion +20%.';
export const sens = [
  { label: 'Leads generated (±20%)', worse: (i) => ({ ...i, leads: i.leads * 0.8 }), better: (i) => ({ ...i, leads: i.leads * 1.2 }) },
  { label: 'Lead to customer rate (±25%)', worse: (i) => ({ ...i, conv: i.conv * 0.75 }), better: (i) => ({ ...i, conv: i.conv * 1.25 }) },
  { label: 'Revenue per customer (±15%)', worse: (i) => ({ ...i, acv: i.acv * 0.85 }), better: (i) => ({ ...i, acv: i.acv * 1.15 }) },
  { label: 'Media spend (±20%)', worse: (i) => ({ ...i, spend: i.spend * 1.2 }), better: (i) => ({ ...i, spend: i.spend * 0.8 }) },
  { label: 'Gross margin (±5 points)', worse: (i) => ({ ...i, margin: Math.max(10, i.margin - 5) }), better: (i) => ({ ...i, margin: Math.min(100, i.margin + 5) }) },
];
export const sensMetric = { label: 'net after cost (USD)', fn: (m) => m.net, kind: 'money' };
export const bench = () => [];
export const planning = 'We found no reliable public benchmark for lead to customer rate, cost per lead or return on ad spend that fits every channel and market. They vary too much by channel, deal size and sales motion, so use your own campaign history.';
export const how = [
  { h: 'Total cost', p: 'Media or event spend, plus the fixed costs of running the campaign: agency, creative, tools and the time of the team.' },
  { h: 'Customers and value', p: 'Leads times the share that become customers. Each customer is worth their yearly revenue times the years you choose to count. Counting more years makes a campaign look better, so pick a number you trust.' },
  { h: 'ROAS and ROMI', p: 'ROAS is revenue over cost. ROMI uses gross profit after cost, so it is the stricter and more honest measure: revenue you spend delivering the service is not yours to keep.' },
  { h: 'Break-even conversion', p: 'The lowest lead to customer rate at which the campaign still covers its cost. If it is close to your real rate, the campaign is fragile.' },
];
export default {
  slug: 'campaign-roi', title: 'Campaign ROI and ROAS', eyebrow: 'Marketing', titleLead: 'Campaign', titleAccent: 'ROI and ROAS', fileName: 'Campaign_ROI',
  blurb: 'Whether a campaign pays for itself, how fast, and how much room you have before it stops. Built for the conversation with your CFO.',
  defaults, limits, presets,
  groups: [{ title: 'Your campaign', fields: [
    { key: 'spend', label: 'Media or Event Spend', min: 0, max: 500000, step: 1000, prefix: '$', tooltip: 'What you pay for ads, sponsorships or the event itself.' },
    { key: 'fixedCost', label: 'Other Campaign Costs', min: 0, max: 200000, step: 1000, prefix: '$', tooltip: 'Agency, creative, tools and the time of the team.' },
    { key: 'leads', label: 'Leads Generated', min: 1, max: 20000, tooltip: 'Qualified leads the campaign brings in.' },
    { key: 'conv', label: 'Lead to Customer Rate', min: 0.1, max: 30, step: 0.1, suffix: '%', tooltip: 'Share of those leads that become paying customers.' },
    { key: 'acv', label: 'Yearly Revenue per Customer', min: 100, max: 200000, step: 100, prefix: '$', tooltip: 'Average revenue one customer pays in a year.' },
    { key: 'margin', label: 'Gross Margin', min: 10, max: 100, suffix: '%', advanced: true, tooltip: 'Share of revenue left after the cost of delivering the product or service.' },
    { key: 'years', label: 'Years of Revenue Counted', min: 1, max: 5, suffix: ' yr', advanced: true, tooltip: 'How long a customer keeps paying you. Fewer years is more conservative.' },
  ], advancedSummary: (i) => `Margin ${i.margin}% · ${i.years} year${i.years > 1 ? 's' : ''} counted` }],
  model, verdictFor, kpis, results, chart, scenarios, scenarioNote, sens, sensMetric, bench, planning, how,
};
