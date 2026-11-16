import { fmtMoney, fmtMoney2, fmtMonths, fmtNum } from '../shared/format.js';
import { trio, div } from './_math.js';

export const defaults = { tickets: 6000, ticketCost: 9, deflection: 25, toolMonthly: 4500, setupCost: 20000, growth: 1, perAgent: 450 };
export const limits = { tickets: [50, 1000000], ticketCost: [0.5, 500], deflection: [1, 90], toolMonthly: [0, 500000], setupCost: [0, 5000000], growth: [-5, 10], perAgent: [50, 2000] };
export const presets = [
  { id: 'b2b', name: 'B2B SaaS', note: 'High cost per ticket', inputs: { tickets: 2500, ticketCost: 18, deflection: 20, toolMonthly: 3000, setupCost: 15000, growth: 1.5, perAgent: 350 } },
  { id: 'ecom', name: 'Ecommerce', note: 'High volume, simple', inputs: { tickets: 20000, ticketCost: 5.5, deflection: 35, toolMonthly: 9000, setupCost: 40000, growth: 0.8, perAgent: 700 } },
  { id: 'ent', name: 'Enterprise software', note: 'Complex tickets', inputs: { tickets: 9000, ticketCost: 25, deflection: 15, toolMonthly: 14000, setupCost: 90000, growth: 1, perAgent: 250 } },
];
export function model(i) {
  const g = i.growth / 100;
  let cum = -i.setupCost; let payback = null; let y1 = 0;
  const series = [{ k: 0, v: Math.round(cum) }];
  for (let t = 1; t <= 36; t++) {
    const tickets = i.tickets * (1 + g) ** t;
    const saved = tickets * (i.deflection / 100) * i.ticketCost - i.toolMonthly;
    const prev = cum;
    cum += saved;
    if (t <= 12) y1 += saved;
    if (payback === null && prev < 0 && cum >= 0) payback = t - 1 + (-prev) / saved;
    series.push({ k: t, v: Math.round(cum) });
  }
  const net36 = cum;
  if (i.setupCost === 0 && series[1].v >= 0) payback = 0;
  const deflMonth = i.tickets * (i.deflection / 100);
  return {
    deflMonth, grossMonth: deflMonth * i.ticketCost, netMonth: deflMonth * i.ticketCost - i.toolMonthly, y1, net36, payback, series,
    costPerDeflected: div(i.toolMonthly, deflMonth), fte: deflMonth / i.perAgent, roi36: div(net36, i.setupCost + 36 * i.toolMonthly) === null ? null : (net36 / (i.setupCost + 36 * i.toolMonthly)) * 100,
  };
}
export function verdictFor(i, m) {
  const head = `If ${i.deflection}% of tickets are solved before they reach an agent, you avoid about ${fmtNum(m.deflMonth)} tickets a month, worth ${fmtMoney(m.grossMonth)}. After ${fmtMoney(i.toolMonthly)} a month for the tool, the net is ${fmtMoney(m.netMonth)} a month.`;
  if (m.net36 <= 0) return { tone: 'bad', headline: head, detail: `Over three years it does not pay for itself (net ${fmtMoney(m.net36)}). It would need a higher deflection rate, a cheaper tool, or a higher cost per ticket.` };
  if (m.payback === null || m.payback > 12) return { tone: 'mixed', headline: head, detail: `It pays back in ${fmtMonths(m.payback)} and nets ${fmtMoney(m.net36)} over three years, so the return is real but slow. Be sure the deflection rate is realistic.` };
  return { tone: 'good', headline: head, detail: `It pays back in ${fmtMonths(m.payback)} and nets ${fmtMoney(m.net36)} over three years. That frees the equivalent of ${m.fte.toFixed(1)} agents. A deflected ticket is only a saving if the customer was really helped, so watch satisfaction and re-contact rates.` };
}
export const kpis = (i, m) => [
  { label: 'Tickets avoided per month', value: fmtNum(m.deflMonth), note: `${i.deflection}% of ${fmtNum(i.tickets)}.` },
  { label: 'Net saving per month', value: fmtMoney(m.netMonth), tone: m.netMonth > 0 ? 'good' : 'bad', note: 'After the tool cost.' },
  { label: 'Payback', value: fmtMonths(m.payback), tone: m.payback === null ? 'bad' : (m.payback <= 12 ? 'good' : 'mixed'), note: 'Setup cost recovered.' },
  { label: '3-year net', value: fmtMoney(m.net36), tone: m.net36 > 0 ? 'good' : 'bad', note: 'After setup and tool cost.' },
];
export const results = [
  { label: 'Tickets avoided per month', get: (m) => m.deflMonth, kind: 'int', scenario: true },
  { label: 'Gross saving per month', get: (m) => m.grossMonth, kind: 'money' },
  { label: 'Net saving per month after tool cost', get: (m) => m.netMonth, kind: 'money', scenario: true },
  { label: 'Net saving in year 1', get: (m) => m.y1, kind: 'money', scenario: true },
  { label: 'Payback (months)', get: (m) => m.payback, kind: 'months', scenario: true },
  { label: 'Three-year net after setup', get: (m) => m.net36, kind: 'money', scenario: true },
  { label: 'Three-year ROI', get: (m) => m.roi36, kind: 'pp0' },
  { label: 'Tool cost per avoided ticket', get: (m) => m.costPerDeflected, kind: 'money2' },
  { label: 'Agent capacity freed (FTE)', get: (m) => m.fte, kind: 'num1' },
];
export const chart = {
  title: 'Cumulative net result', type: 'line', x: 'k', xKind: 'int', xTitle: 'Month', xFormat: (v) => `M${v}`, yKind: 'money', data: (i, m) => m.series,
  series: [{ key: 'v', name: 'Cumulative net' }],
  note: 'Starts below zero by the setup cost, then adds the net saving each month as ticket volume grows. Where it crosses zero, the tool has paid for itself.',
  ref: () => ({ y: 0, label: 'Break-even' }),
  caption: (i, m) => (m.payback === null ? 'It does not break even within three years.' : `It breaks even in month ${Math.ceil(m.payback)}.`),
};
export const scenarios = trio(
  (i) => ({ ...i, deflection: Math.max(1, i.deflection * 0.6), setupCost: i.setupCost * 1.3 }),
  (i) => ({ ...i, deflection: Math.min(90, i.deflection * 1.3) }),
);
export const scenarioNote = 'Illustrative cases. Pessimistic: deflection 40% lower and setup 30% higher. Optimistic: deflection 30% higher.';
export const sens = [
  { label: 'Deflection rate (±30%)', worse: (i) => ({ ...i, deflection: i.deflection * 0.7 }), better: (i) => ({ ...i, deflection: Math.min(90, i.deflection * 1.3) }) },
  { label: 'Cost per ticket (±20%)', worse: (i) => ({ ...i, ticketCost: i.ticketCost * 0.8 }), better: (i) => ({ ...i, ticketCost: i.ticketCost * 1.2 }) },
  { label: 'Ticket volume (±20%)', worse: (i) => ({ ...i, tickets: i.tickets * 0.8 }), better: (i) => ({ ...i, tickets: i.tickets * 1.2 }) },
  { label: 'Tool cost per month (±30%)', worse: (i) => ({ ...i, toolMonthly: i.toolMonthly * 1.3 }), better: (i) => ({ ...i, toolMonthly: i.toolMonthly * 0.7 }) },
  { label: 'Setup cost (±30%)', worse: (i) => ({ ...i, setupCost: i.setupCost * 1.3 }), better: (i) => ({ ...i, setupCost: i.setupCost * 0.7 }) },
];
export const sensMetric = { label: 'three-year net (USD)', fn: (m) => m.net36, kind: 'money' };
export const bench = () => [];
export const planning = 'We could not verify a reliable public benchmark for support cost per ticket or realistic deflection rates. Published figures vary widely and come mostly from vendors. Use your own fully loaded cost per ticket (support payroll and tools over tickets handled) and start with a conservative deflection rate that you can measure.';
export const how = [
  { h: 'Deflection', p: 'The share of questions customers solve on their own, through help articles or an assistant, so they never become a ticket an agent has to handle.' },
  { h: 'Cost per ticket', p: 'Everything it costs to run support in a month (people, tools, management), divided by the tickets handled. Use the fully loaded figure, not just agent pay.' },
  { h: 'Net saving', p: 'Avoided tickets times the cost per ticket, minus the monthly cost of the tool. Ticket volume is assumed to grow at the rate you enter.' },
  { h: 'A caution', p: 'A deflected ticket is a saving only if the customer was really helped. If they come back, or leave, the saving is an illusion. Track satisfaction and re-contact alongside deflection.' },
];
export default {
  slug: 'support-deflection-roi', title: 'Support Deflection ROI', eyebrow: 'Customer Experience', titleLead: 'Support Deflection', titleAccent: 'ROI', fileName: 'Support_Deflection_ROI',
  blurb: 'What it is worth to solve support questions before they become tickets, and how long a self-service or AI tool takes to pay for itself.',
  defaults, limits, presets,
  groups: [{ title: 'Your support operation', fields: [
    { key: 'tickets', label: 'Tickets per Month', min: 50, max: 100000, step: 50, tooltip: 'Support tickets your team handles in a normal month.' },
    { key: 'ticketCost', label: 'Fully Loaded Cost per Ticket', min: 0.5, max: 200, step: 0.5, prefix: '$', tooltip: 'Total support cost in a month divided by tickets handled.' },
    { key: 'deflection', label: 'Tickets Solved Before an Agent', min: 1, max: 90, suffix: '%', tooltip: 'Share of tickets the tool prevents. Start conservative.' },
    { key: 'toolMonthly', label: 'Tool Cost per Month', min: 0, max: 100000, step: 100, prefix: '$', tooltip: 'Licenses and usage fees of the self-service or AI tool.' },
    { key: 'setupCost', label: 'One-time Setup Cost', min: 0, max: 500000, step: 1000, prefix: '$', tooltip: 'Implementation, content writing and training.' },
    { key: 'growth', label: 'Monthly Ticket Growth', min: -5, max: 10, step: 0.1, suffix: '%', advanced: true, tooltip: 'How fast ticket volume grows each month.' },
    { key: 'perAgent', label: 'Tickets per Agent per Month', min: 50, max: 2000, step: 10, advanced: true, tooltip: 'Used only to show the agent capacity freed.' },
  ], advancedSummary: (i) => `Growth ${i.growth}% a month · ${i.perAgent} tickets per agent` }],
  model, verdictFor, kpis, results, chart, scenarios, scenarioNote, sens, sensMetric, bench, planning, how,
};
