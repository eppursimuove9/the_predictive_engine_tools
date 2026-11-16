import { fmtMoney, fmtPct1 } from '../shared/format.js';
import { trio } from './_math.js';

export const defaults = { customers: 1200, price: 6000, change: 8, margin: 78, volume: -3 };
export const limits = { customers: [1, 1000000], price: [10, 5000000], change: [-60, 100], margin: [5, 100], volume: [-60, 100] };
export const presets = [
  { id: 'inc', name: 'Modest increase', note: '+8% price', inputs: { customers: 1200, price: 6000, change: 8, margin: 78, volume: -3 } },
  { id: 'big', name: 'Big increase', note: '+20% price', inputs: { customers: 400, price: 2400, change: 20, margin: 80, volume: -10 } },
  { id: 'disc', name: 'Discount', note: '-15% price', inputs: { customers: 800, price: 9000, change: -15, margin: 72, volume: 12 } },
];
// Unit cost does not change with price, so the gross profit per customer is price minus that unit cost.
export function model(i) {
  const d = i.change / 100; const m = i.margin / 100; const v = i.volume / 100;
  const unitCost = i.price * (1 - m);
  const gp0 = i.customers * i.price * m;
  const newPrice = i.price * (1 + d);
  const gpUnit1 = newPrice - unitCost;
  const gp1 = i.customers * (1 + v) * gpUnit1;
  // Customer change at which gross profit is exactly unchanged: change = -d / (d + m).
  const denom = d + m;
  const breakEven = denom > 0 ? (-d / denom) * 100 : null;
  const series = [];
  for (const x of [...new Set([-40, -35, -30, -25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 35, 40, i.volume])].sort((a, b) => a - b)) series.push({ k: x, d: Math.round(i.customers * (1 + x / 100) * gpUnit1 - gp0) });
  return { unitCost, gp0, gp1, change: gp1 - gp0, newPrice, gpUnit1, newMargin: newPrice > 0 ? (gpUnit1 / newPrice) * 100 : null, breakEven, rev0: i.customers * i.price, rev1: i.customers * (1 + v) * newPrice, series };
}
export function verdictFor(i, m) {
  const up = i.change >= 0;
  const be = m.breakEven;
  const head = `A ${i.change >= 0 ? '+' : ''}${i.change}% price change takes gross profit from ${fmtMoney(m.gp0)} to ${fmtMoney(m.gp1)} a year, a change of ${m.change >= 0 ? '+' : '-'}${fmtMoney(Math.abs(m.change))}, if customers move by ${i.volume >= 0 ? '+' : ''}${i.volume}%.`;
  if (be === null) return { tone: 'bad', headline: head, detail: 'This price cut is deeper than your gross margin, so every sale loses money. No volume increase can make up for it.' };
  const bkTxt = up ? `You can lose up to ${fmtPct1(Math.abs(be))} of your customers and still break even on gross profit.` : `You need ${fmtPct1(Math.abs(be))} more customers just to break even on gross profit.`;
  if (m.change < 0) return { tone: 'bad', headline: head, detail: `${bkTxt} Your expectation of ${i.volume >= 0 ? '+' : ''}${i.volume}% falls short, so this change loses money.` };
  const cushion = up ? Math.abs(be) - Math.max(0, -i.volume) : (i.volume - Math.abs(be));
  const thin = up ? Math.max(0, -i.volume) > Math.abs(be) * 0.6 : cushion < Math.abs(be) * 0.2;
  return { tone: thin ? 'mixed' : 'good', headline: head, detail: `${bkTxt} ${thin ? 'Your expected change is close to that limit, so the margin for error is thin.' : 'Your expectation leaves a comfortable cushion.'} Revenue and profit can move in different directions, so judge it on gross profit.` };
}
export const kpis = (i, m) => [
  { label: 'Gross profit today', value: fmtMoney(m.gp0), note: 'Per year at current price.' },
  { label: 'Gross profit after', value: fmtMoney(m.gp1), tone: m.change >= 0 ? 'good' : 'bad', note: `${m.change >= 0 ? '+' : '-'}${fmtMoney(Math.abs(m.change))} vs today.` },
  { label: 'Break-even customer change', value: m.breakEven === null ? 'N/A' : `${m.breakEven >= 0 ? '+' : '-'}${fmtPct1(Math.abs(m.breakEven))}`, note: i.change >= 0 ? 'The most you can lose.' : 'The most you must gain.' },
  { label: 'New margin', value: m.newMargin === null ? 'N/A' : fmtPct1(m.newMargin), note: `Was ${i.margin}%.` },
];
export const results = [
  { label: 'Yearly revenue today', get: (m) => m.rev0, kind: 'money' },
  { label: 'Yearly revenue after', get: (m) => m.rev1, kind: 'money', scenario: true },
  { label: 'Yearly gross profit today', get: (m) => m.gp0, kind: 'money' },
  { label: 'Yearly gross profit after', get: (m) => m.gp1, kind: 'money', scenario: true },
  { label: 'Change in gross profit', get: (m) => m.change, kind: 'money', scenario: true },
  { label: 'Break-even change in customers', get: (m) => m.breakEven, kind: 'pp', scenario: true },
  { label: 'New price per customer per year', get: (m) => m.newPrice, kind: 'money' },
  { label: 'Gross margin after', get: (m) => m.newMargin, kind: 'pp' },
];
export const chart = {
  title: 'Change in gross profit by change in customers', type: 'line', x: 'k', xKind: 'pp0', numericX: true, refX: (i) => ({ x: i.volume, label: `Your case ${i.volume > 0 ? '+' : ''}${i.volume}%` }), xTitle: 'Change in customers', xFormat: (v) => `${v > 0 ? '+' : ''}${v}%`, yKind: 'money', data: (i, m) => m.series,
  series: [{ key: 'd', name: 'Change in gross profit' }],
  note: 'Yearly gross profit compared with today, for each possible change in customers after the price change. Where the line crosses zero is the break-even point.',
  ref: () => ({ y: 0, label: 'No change in gross profit' }),
  caption: (i, m) => (m.breakEven === null ? '' : `The line crosses zero at ${m.breakEven >= 0 ? '+' : '-'}${fmtPct1(Math.abs(m.breakEven))} customers.`),
};
export const scenarios = trio(
  (i) => ({ ...i, volume: i.volume - Math.max(2, Math.abs(i.volume) * 0.5) }),
  (i) => ({ ...i, volume: i.volume + Math.max(2, Math.abs(i.volume) * 0.5) }),
);
export const scenarioNote = 'Illustrative cases. The only thing that changes is how customers react: pessimistic is that many fewer customers (or fewer gained) than expected, optimistic is that many more.';
export const sens = [
  { label: 'Customer reaction (±5 points)', worse: (i) => ({ ...i, volume: i.volume - 5 }), better: (i) => ({ ...i, volume: i.volume + 5 }) },
  { label: 'Price change (±3 points)', worse: (i) => ({ ...i, change: i.change - 3 }), better: (i) => ({ ...i, change: i.change + 3 }) },
  { label: 'Gross margin (±5 points)', worse: (i) => ({ ...i, margin: Math.max(5, i.margin - 5) }), better: (i) => ({ ...i, margin: Math.min(100, i.margin + 5) }) },
];
export const sensMetric = { label: 'change in gross profit (USD)', fn: (m) => m.change, kind: 'money' };
export const bench = () => [];
export const planning = 'We found no reliable public benchmark for how many customers leave after a price change. It depends on your market, contract terms and how the change is communicated. The break-even figure is exact; the expected customer change is a judgment, so test it with a pilot or with a segment of customers first.';
export const how = [
  { h: 'The key idea', p: 'When you raise the price, each customer you keep is worth more, and what it costs you to serve them does not change. So you can lose some customers and still earn the same gross profit.' },
  { h: 'Break-even', p: 'The change in customers at which gross profit is exactly the same as today. For an increase it is the most you can lose. For a discount it is the most extra customers you must win.' },
  { h: 'Why margin matters', p: 'The higher your gross margin, the less a price increase can afford to lose, and the less a discount needs to gain. A discount on a thin margin needs a very large volume lift.' },
  { h: 'What it ignores', p: 'Effects beyond year one: long-term churn, brand and the price of competing products. Treat the answer as the minimum test your plan has to pass.' },
];
export default {
  slug: 'price-change-breakeven', title: 'Price Change Break-even', eyebrow: 'Sales and Finance', titleLead: 'Price Change', titleAccent: 'Break-even', fileName: 'Price_Change_Breakeven',
  blurb: 'How many customers you can lose after a price increase, or must win after a discount, before gross profit gets worse.',
  defaults, limits, presets,
  groups: [{ title: 'Your pricing', fields: [
    { key: 'customers', label: 'Customers Today', min: 1, max: 100000, tooltip: 'Paying customers before the price change.' },
    { key: 'price', label: 'Yearly Revenue per Customer', min: 10, max: 500000, step: 10, prefix: '$', tooltip: 'Average revenue one customer pays per year.' },
    { key: 'margin', label: 'Gross Margin', min: 5, max: 100, suffix: '%', tooltip: 'Share of revenue left after the cost of serving the customer.' },
    { key: 'change', label: 'Price Change', min: -60, max: 100, suffix: '%', tooltip: 'Use a positive number for an increase and a negative number for a discount.' },
    { key: 'volume', label: 'Expected Change in Customers', min: -60, max: 100, suffix: '%', tooltip: 'How many customers you expect to lose (negative) or gain (positive) because of the price change.' },
  ] }],
  model, verdictFor, kpis, results, chart, scenarios, scenarioNote, sens, sensMetric, bench, planning, how,
};
