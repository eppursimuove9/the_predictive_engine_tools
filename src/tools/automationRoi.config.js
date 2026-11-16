import { fmtMoney, fmtPct, fmtMonths, fmtNum } from '../shared/format.js';
import { trio, div } from './_math.js';

export const defaults = { people: 12, hoursWeek: 6, hourCost: 45, automation: 70, realization: 60, errorSavings: 6000, toolCost: 18000, setupCost: 15000, weeks: 46 };
export const limits = { people: [1, 5000], hoursWeek: [0.5, 40], hourCost: [5, 500], automation: [5, 100], realization: [10, 100], errorSavings: [0, 5000000], toolCost: [0, 5000000], setupCost: [0, 5000000], weeks: [30, 52] };
export const presets = [
  { id: 'finance', name: 'Finance ops', note: 'Invoices and reconciliation', inputs: { people: 5, hoursWeek: 15, hourCost: 38, automation: 80, realization: 70, errorSavings: 12000, toolCost: 9000, setupCost: 20000, weeks: 46 } },
  { id: 'salesops', name: 'Sales ops', note: 'CRM updates and quotes', inputs: { people: 40, hoursWeek: 3, hourCost: 55, automation: 50, realization: 40, errorSavings: 0, toolCost: 30000, setupCost: 25000, weeks: 46 } },
  { id: 'cs', name: 'Customer ops', note: 'Reporting and handoffs', inputs: { people: 8, hoursWeek: 8, hourCost: 42, automation: 60, realization: 50, errorSavings: 3000, toolCost: 6000, setupCost: 8000, weeks: 46 } },
];
export function model(i) {
  const hoursSaved = i.people * i.hoursWeek * i.weeks * (i.automation / 100);
  const timeValue = hoursSaved * i.hourCost * (i.realization / 100);
  const value = timeValue + i.errorSavings;
  const net = value - i.toolCost;
  const payback = net > 0 ? (i.setupCost / net) * 12 : (i.setupCost === 0 ? 0 : null);
  const cost3 = i.setupCost + 3 * i.toolCost;
  const net3 = 3 * value - cost3;
  const series = [];
  for (let t = 0; t <= 36; t++) series.push({ k: t, v: Math.round(-i.setupCost + (net / 12) * t) });
  return { hoursSaved, timeValue, value, net, payback, cost3, net3, roi3: div(net3, cost3) === null ? null : (net3 / cost3) * 100, fte: hoursSaved / (i.weeks * 40), series, fullValue: hoursSaved * i.hourCost };
}
export function verdictFor(i, m) {
  const head = `Automation frees about ${fmtNum(m.hoursSaved)} hours a year (${m.fte.toFixed(1)} full-time people). Counting only the share you will really turn into value, that is worth ${fmtMoney(m.value)} a year against ${fmtMoney(i.toolCost)} of running cost.`;
  if (m.net <= 0) return { tone: 'bad', headline: head, detail: `It does not pay back: the yearly value does not cover the running cost. Automate more of the work, or pick a task with more hours, before you buy.` };
  if (m.payback > 12) return { tone: 'mixed', headline: head, detail: `It pays back in ${fmtMonths(m.payback)} and returns ${fmtMoney(m.net3)} over three years. Slow, so check the setup cost and the hours saved are realistic.` };
  return { tone: 'good', headline: head, detail: `The ${fmtMoney(i.setupCost)} setup pays back in ${fmtMonths(m.payback)}, and the three-year net is ${fmtMoney(m.net3)}. The time freed is only worth money if it goes to higher-value work, which is why the model counts ${i.realization}% of it.` };
}
export const kpis = (i, m) => [
  { label: 'Hours saved per year', value: fmtNum(m.hoursSaved), note: `About ${m.fte.toFixed(1)} full-time people.` },
  { label: 'Net value per year', value: fmtMoney(m.net), tone: m.net > 0 ? 'good' : 'bad', note: 'After the running cost of the tool.' },
  { label: 'Payback', value: fmtMonths(m.payback), tone: m.payback === null ? 'bad' : (m.payback <= 12 ? 'good' : 'mixed'), note: 'Setup cost over monthly net value.' },
  { label: '3-year ROI', value: fmtPct(m.roi3), tone: m.net3 > 0 ? 'good' : 'bad', note: `Net ${fmtMoney(m.net3)}.` },
];
export const results = [
  { label: 'Hours saved per year', get: (m) => m.hoursSaved, kind: 'int', scenario: true },
  { label: 'Full-time equivalents freed', get: (m) => m.fte, kind: 'num1' },
  { label: 'Full value of time saved', get: (m) => m.fullValue, kind: 'money' },
  { label: 'Value of time counted (after realization)', get: (m) => m.timeValue, kind: 'money' },
  { label: 'Total yearly value', get: (m) => m.value, kind: 'money', scenario: true },
  { label: 'Net value per year after tool cost', get: (m) => m.net, kind: 'money', scenario: true },
  { label: 'Payback (months)', get: (m) => m.payback, kind: 'months', scenario: true },
  { label: 'Three-year cost (setup plus tool)', get: (m) => m.cost3, kind: 'money' },
  { label: 'Three-year net', get: (m) => m.net3, kind: 'money', scenario: true },
  { label: 'Three-year ROI', get: (m) => m.roi3, kind: 'pp0', scenario: true },
];
export const chart = {
  title: 'Cumulative cash result of the automation', type: 'line', x: 'k', xKind: 'int', xTitle: 'Month', xFormat: (v) => `M${v}`, yKind: 'money', data: (i, m) => m.series,
  series: [{ key: 'v', name: 'Cumulative net' }],
  note: 'Starts below zero by the setup cost and climbs by the net monthly value. Where it crosses zero, the automation has paid for itself.',
  ref: () => ({ y: 0, label: 'Break-even' }),
  caption: (i, m) => (m.payback === null ? 'Within three years the automation never pays back.' : `It crosses break-even in month ${Math.ceil(m.payback)}.`),
};
export const scenarios = trio(
  (i) => ({ ...i, automation: i.automation * 0.7, realization: Math.max(10, i.realization * 0.7), setupCost: i.setupCost * 1.3 }),
  (i) => ({ ...i, automation: Math.min(100, i.automation * 1.15), realization: Math.min(100, i.realization * 1.2) }),
);
export const scenarioNote = 'Illustrative cases. Pessimistic: automation share -30%, realization -30%, setup cost +30%. Optimistic: automation share +15%, realization +20%.';
export const sens = [
  { label: 'Share of the work automated (±20%)', worse: (i) => ({ ...i, automation: i.automation * 0.8 }), better: (i) => ({ ...i, automation: Math.min(100, i.automation * 1.2) }) },
  { label: 'Share of freed time turned into value (±20%)', worse: (i) => ({ ...i, realization: i.realization * 0.8 }), better: (i) => ({ ...i, realization: Math.min(100, i.realization * 1.2) }) },
  { label: 'Hours spent per person (±25%)', worse: (i) => ({ ...i, hoursWeek: i.hoursWeek * 0.75 }), better: (i) => ({ ...i, hoursWeek: i.hoursWeek * 1.25 }) },
  { label: 'Tool cost per year (±30%)', worse: (i) => ({ ...i, toolCost: i.toolCost * 1.3 }), better: (i) => ({ ...i, toolCost: i.toolCost * 0.7 }) },
  { label: 'Setup cost (±30%)', worse: (i) => ({ ...i, setupCost: i.setupCost * 1.3 }), better: (i) => ({ ...i, setupCost: i.setupCost * 0.7 }) },
];
export const sensMetric = { label: 'three-year net (USD)', fn: (m) => m.net3, kind: 'money' };
export const bench = () => [];
export const planning = 'We found no reliable public benchmark for the share of a repetitive task that can be automated, or for how much freed time becomes real value. Measure the hours with a two-week time log, and be conservative on realization: freed time is only worth money when it moves to work that earns or saves more.';
export const how = [
  { h: 'Hours saved', p: 'People doing the task, times the hours each spends a week, times the working weeks in a year, times the share of that work the automation takes over.' },
  { h: 'Realization', p: 'Not every freed hour becomes money. If people just do less overtime or the same work more slowly, the company saves nothing. The realization share is the part you expect to turn into real value, through fewer hires, more output or less overtime.' },
  { h: 'Net value and payback', p: 'Yearly value is the time value plus any error cost you avoid. Subtract the running cost of the tool to get the net. Payback is the setup cost divided by the net value per month.' },
  { h: 'Be honest with the inputs', p: 'The two numbers that move the result most are the share automated and the realization. Ask the people doing the work, and start from a time log.' },
];
export default {
  slug: 'automation-roi', title: 'Process Automation ROI', eyebrow: 'RevOps and Operations', titleLead: 'Process Automation', titleAccent: 'ROI', fileName: 'Process_Automation_ROI',
  blurb: 'Whether automating a repetitive task is worth it: hours saved, what they are really worth, and how long until the tool pays for itself.',
  defaults, limits, presets,
  groups: [{ title: 'The task and the tool', fields: [
    { key: 'people', label: 'People Doing the Task', min: 1, max: 500, tooltip: 'How many people spend time on this repetitive work.' },
    { key: 'hoursWeek', label: 'Hours per Person per Week', min: 0.5, max: 40, step: 0.5, tooltip: 'Time each person spends on it in a normal week.' },
    { key: 'hourCost', label: 'Fully Loaded Cost per Hour', min: 5, max: 300, prefix: '$', tooltip: 'Salary plus taxes and benefits, divided by working hours.' },
    { key: 'automation', label: 'Share of the Work Automated', min: 5, max: 100, suffix: '%', tooltip: 'Part of the task the automation will really take over.' },
    { key: 'toolCost', label: 'Tool Cost per Year', min: 0, max: 500000, step: 500, prefix: '$', tooltip: 'Licenses, usage fees and upkeep, per year.' },
    { key: 'setupCost', label: 'One-time Setup Cost', min: 0, max: 500000, step: 500, prefix: '$', tooltip: 'Implementation, integration and training.' },
    { key: 'realization', label: 'Freed Time Turned into Value', min: 10, max: 100, suffix: '%', advanced: true, tooltip: 'Share of the hours saved that becomes real value: fewer hires, more output or less overtime.' },
    { key: 'errorSavings', label: 'Yearly Savings from Fewer Errors', min: 0, max: 500000, step: 500, prefix: '$', advanced: true, tooltip: 'Rework and mistakes you expect to avoid in a year.' },
    { key: 'weeks', label: 'Working Weeks per Year', min: 30, max: 52, advanced: true, tooltip: 'After holidays and leave.' },
  ], advancedSummary: (i) => `Realization ${i.realization}% · errors ${fmtMoney(i.errorSavings)} · ${i.weeks} weeks` }],
  model, verdictFor, kpis, results, chart, scenarios, scenarioNote, sens, sensMetric, bench, planning, how,
};
