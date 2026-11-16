import { fmtMoney, fmtMoney2, fmtNum } from '../shared/format.js';
import { trio } from './_math.js';

export const defaults = { subs: 20000, sends: 8, ctr: 2.5, clickToSale: 3, orderValue: 120, margin: 70, growth: 800, churn: 2, cost: 2500 };
export const limits = { subs: [100, 5000000], sends: [1, 60], ctr: [0.1, 30], clickToSale: [0.1, 40], orderValue: [1, 100000], margin: [5, 100], growth: [0, 500000], churn: [0, 15], cost: [0, 500000] };
export const presets = [
  { id: 'b2b', name: 'B2B newsletter', note: '4 sends a month', inputs: { subs: 8000, sends: 4, ctr: 3.5, clickToSale: 2, orderValue: 500, margin: 80, growth: 300, churn: 1.5, cost: 1200 } },
  { id: 'ecom', name: 'Ecommerce list', note: '10 sends a month', inputs: { subs: 50000, sends: 10, ctr: 1.8, clickToSale: 2.5, orderValue: 70, margin: 55, growth: 2500, churn: 2.5, cost: 4000 } },
  { id: 'saas', name: 'SaaS nurture', note: 'High contract value', inputs: { subs: 15000, sends: 6, ctr: 2.2, clickToSale: 1.2, orderValue: 1800, margin: 85, growth: 600, churn: 2, cost: 1500 } },
];
export function model(i) {
  const monthlyRev = i.subs * i.sends * (i.ctr / 100) * (i.clickToSale / 100) * i.orderValue;
  const monthlyGp = monthlyRev * (i.margin / 100);
  const profit = monthlyGp - i.cost;
  const perSubMonth = monthlyGp / i.subs;
  const lifetime = i.churn > 0 ? Math.min(60, 100 / i.churn) : 60;
  const subValue = perSubMonth * lifetime;
  // Project the list and the monthly profit for 24 months: each month the list loses churn and gains new subscribers.
  const series = [];
  let list = i.subs;
  for (let t = 0; t <= 24; t++) {
    const gp = list * perSubMonth;
    series.push({ k: t, p: Math.round(gp - i.cost), list: Math.round(list) });
    list = list * (1 - i.churn / 100) + i.growth;
  }
  const lost = i.subs * (i.churn / 100);
  return { monthlyRev, monthlyGp, profit, perSubMonth, lifetime, subValue, yearProfit: profit * 12, lost, netGrowth: i.growth - lost, series, list24: series[24].list, profit24: series[24].p };
}
export function verdictFor(i, m) {
  const head = `Your list earns about ${fmtMoney(m.monthlyRev)} a month in revenue and ${fmtMoney(m.profit)} a month in profit after costs. Each subscriber is worth about ${fmtMoney2(m.subValue)} in gross profit over their time on the list.`;
  if (m.profit < 0) return { tone: 'bad', headline: head, detail: `The list costs more to run than it earns: ${fmtMoney(-m.profit)} a month. Raise the click rate or the conversion of those clicks, or cut the cost, before spending to grow it.` };
  if (m.netGrowth < 0) return { tone: 'mixed', headline: head, detail: `It is profitable, but the list is shrinking: you lose about ${fmtNum(m.lost)} subscribers a month and add ${fmtNum(i.growth)}. In two years it would be about ${fmtNum(m.list24)} subscribers.` };
  return { tone: 'good', headline: head, detail: `It is profitable and growing. You could pay up to about ${fmtMoney2(m.subValue)} to acquire a subscriber and still break even on gross profit, before your own costs.` };
}
export const kpis = (i, m) => [
  { label: 'Revenue per month', value: fmtMoney(m.monthlyRev), note: 'From clicks that become sales.' },
  { label: 'Profit per month', value: fmtMoney(m.profit), tone: m.profit >= 0 ? 'good' : 'bad', note: 'Gross profit minus running cost.' },
  { label: 'Value per subscriber', value: fmtMoney2(m.subValue), note: `Over about ${m.lifetime.toFixed(0)} months.` },
  { label: 'List in 24 months', value: fmtNum(m.list24), tone: m.netGrowth >= 0 ? 'good' : 'mixed', note: `Net ${m.netGrowth >= 0 ? '+' : ''}${fmtNum(m.netGrowth)} a month today.` },
];
export const results = [
  { label: 'Revenue per month', get: (m) => m.monthlyRev, kind: 'money', scenario: true },
  { label: 'Gross profit per month', get: (m) => m.monthlyGp, kind: 'money' },
  { label: 'Profit per month after costs', get: (m) => m.profit, kind: 'money', scenario: true },
  { label: 'Profit per year', get: (m) => m.yearProfit, kind: 'money', scenario: true },
  { label: 'Gross profit per subscriber per month', get: (m) => m.perSubMonth, kind: 'money2' },
  { label: 'Subscriber lifetime (months)', get: (m) => m.lifetime, kind: 'num1' },
  { label: 'Value per subscriber', get: (m) => m.subValue, kind: 'money2', scenario: true },
  { label: 'Subscribers lost per month', get: (m) => m.lost, kind: 'int' },
  { label: 'List size in 24 months', get: (m) => m.list24, kind: 'int', scenario: true },
];
export const chart = {
  title: 'Monthly profit as the list changes', type: 'line', x: 'k', xKind: 'int', xTitle: 'Month', xFormat: (v) => `M${v}`, yKind: 'money', data: (i, m) => m.series,
  series: [{ key: 'p', name: 'Profit per month' }],
  note: 'Each month the list loses the churn share and gains your new subscribers, and profit follows the size of the list.',
  caption: (i, m) => `The list goes from ${fmtNum(i.subs)} to about ${fmtNum(m.list24)} subscribers over 24 months.`,
};
export const scenarios = trio(
  (i) => ({ ...i, ctr: i.ctr * 0.8, clickToSale: i.clickToSale * 0.8, churn: Math.min(15, i.churn * 1.3), growth: i.growth * 0.7 }),
  (i) => ({ ...i, ctr: i.ctr * 1.15, clickToSale: i.clickToSale * 1.15, churn: i.churn * 0.8, growth: i.growth * 1.2 }),
);
export const scenarioNote = 'Illustrative cases. Pessimistic: click rate -20%, click to sale -20%, churn +30%, growth -30%. Optimistic: click rate +15%, click to sale +15%, churn -20%, growth +20%.';
export const sens = [
  { label: 'Click rate (±20%)', worse: (i) => ({ ...i, ctr: i.ctr * 0.8 }), better: (i) => ({ ...i, ctr: i.ctr * 1.2 }) },
  { label: 'Click to sale rate (±20%)', worse: (i) => ({ ...i, clickToSale: i.clickToSale * 0.8 }), better: (i) => ({ ...i, clickToSale: i.clickToSale * 1.2 }) },
  { label: 'Order value (±15%)', worse: (i) => ({ ...i, orderValue: i.orderValue * 0.85 }), better: (i) => ({ ...i, orderValue: i.orderValue * 1.15 }) },
  { label: 'Monthly list churn (±30%)', worse: (i) => ({ ...i, churn: Math.min(15, i.churn * 1.3) }), better: (i) => ({ ...i, churn: i.churn * 0.7 }) },
  { label: 'Emails per month (±25%)', worse: (i) => ({ ...i, sends: Math.max(1, i.sends * 0.75) }), better: (i) => ({ ...i, sends: i.sends * 1.25 }) },
];
export const sensMetric = { label: 'profit after 24 months (USD per month)', fn: (m) => m.profit24, kind: 'money' };
export const bench = (i) => [
  { label: 'Click rate per email', value: i.ctr, unit: '%', range: [1.5, 3.5], strength: 'survey', refText: 'About 2.6% on average across industries', note: 'Mailchimp reports an average click rate of 2.62% across all industries, based on its own platform data as of December 2023. Open rates are less reliable since mail apps began pre-loading emails, so this tool uses clicks.', source: 'Mailchimp, email marketing benchmarks', url: 'https://mailchimp.com/resources/email-marketing-benchmarks/' },
];
export const planning = 'We found no reliable public benchmark for click to sale rate, order value or monthly list churn. They depend on your offer and audience, so use your own tracked data.';
export const how = [
  { h: 'How the list earns', p: 'Subscribers times emails per month times the share that click, times the share of clicks that buy, times the order value. That is the revenue. Gross margin turns it into profit.' },
  { h: 'Value per subscriber', p: 'The gross profit one subscriber brings each month, times how long they stay (one divided by monthly churn, capped at 60 months). It is the most you should pay to add one.' },
  { h: 'List churn', p: 'Share of subscribers who unsubscribe or stop being reachable each month. It is easy to ignore and it quietly decides whether a list grows or shrinks.' },
  { h: 'The projection', p: 'Shows the list and profit month by month. If the list loses more than you add, profit falls even when every other number is healthy.' },
];
export default {
  slug: 'email-list-value', title: 'Email List Value', eyebrow: 'Marketing', titleLead: 'Email List', titleAccent: 'Value', fileName: 'Email_List_Value',
  blurb: 'What your email list earns, what each subscriber is worth, and whether it is growing or quietly shrinking. Helps you decide how much to spend on growth.',
  defaults, limits, presets,
  groups: [{ title: 'Your list', fields: [
    { key: 'subs', label: 'Subscribers', min: 100, max: 500000, step: 100, tooltip: 'Active subscribers who can receive your emails today.' },
    { key: 'sends', label: 'Emails per Month', min: 1, max: 30, tooltip: 'How many emails each subscriber receives in a month.' },
    { key: 'ctr', label: 'Click Rate per Email', min: 0.1, max: 15, step: 0.1, suffix: '%', tooltip: 'Share of subscribers who click in a typical email.' },
    { key: 'clickToSale', label: 'Click to Sale Rate', min: 0.1, max: 30, step: 0.1, suffix: '%', tooltip: 'Share of clicks that end in a purchase.' },
    { key: 'orderValue', label: 'Order Value', min: 1, max: 20000, step: 1, prefix: '$', tooltip: 'Average revenue of one purchase.' },
    { key: 'churn', label: 'Monthly List Churn', min: 0, max: 15, step: 0.1, suffix: '%', tooltip: 'Share of subscribers lost each month to unsubscribes and bounces.' },
    { key: 'growth', label: 'New Subscribers per Month', min: 0, max: 20000, step: 50, advanced: true, tooltip: 'Subscribers you add in a typical month.' },
    { key: 'margin', label: 'Gross Margin', min: 5, max: 100, suffix: '%', advanced: true, tooltip: 'Share of revenue left after the cost of what you sell.' },
    { key: 'cost', label: 'Running Cost per Month', min: 0, max: 100000, step: 100, prefix: '$', advanced: true, tooltip: 'Email platform, writers, design and the time of the team.' },
  ], advancedSummary: (i) => `${fmtNum(i.growth)} new a month · margin ${i.margin}% · cost ${fmtMoney(i.cost)}` }],
  model, verdictFor, kpis, results, chart, scenarios, scenarioNote, sens, sensMetric, bench, planning, how,
};
