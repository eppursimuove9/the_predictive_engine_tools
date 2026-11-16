import { fmtMoney, fmtMonths, fmtNum } from '../shared/format.js';
import { trio } from './_math.js';

export const defaults = { revHour: 20000, incidents: 8, hours: 2.5, impact: 60, response: 10000, mttrCut: 30, incidentCut: 25, invest: 80000 };
export const limits = { revHour: [100, 50000000], incidents: [0, 500], hours: [0.1, 100], impact: [5, 100], response: [0, 5000000], mttrCut: [0, 90], incidentCut: [0, 90], invest: [0, 50000000] };
export const presets = [
  { id: 'saas', name: 'B2B SaaS', note: 'Contractual credits', inputs: { revHour: 20000, incidents: 8, hours: 2.5, impact: 60, response: 10000, mttrCut: 30, incidentCut: 25, invest: 80000 } },
  { id: 'ecom', name: 'Ecommerce', note: 'Lost sales, no credits', inputs: { revHour: 45000, incidents: 5, hours: 1.5, impact: 90, response: 8000, mttrCut: 40, incidentCut: 30, invest: 150000 } },
  { id: 'internal', name: 'Internal platform', note: 'Lower revenue at stake', inputs: { revHour: 6000, incidents: 12, hours: 4, impact: 40, response: 5000, mttrCut: 25, incidentCut: 20, invest: 60000 } },
];
const cost = (i, incidents, hours) => incidents * (i.revHour * hours * (i.impact / 100) + i.response);
export function model(i) {
  const perIncident = i.revHour * i.hours * (i.impact / 100) + i.response;
  const annual = cost(i, i.incidents, i.hours);
  const incAfter = i.incidents * (1 - i.incidentCut / 100);
  const hoursAfter = i.hours * (1 - i.mttrCut / 100);
  const after = cost(i, incAfter, hoursAfter);
  const saving = annual - after;
  const net = saving - i.invest;
  return {
    perIncident, annual, after, saving, net, incAfter, hoursAfter, payback: net > 0 ? (i.invest / saving) * 12 : null,
    roi: i.invest > 0 ? (net / i.invest) * 100 : null, perHour: i.revHour * (i.impact / 100) + (i.hours > 0 ? i.response / i.hours : 0), downtimeHours: i.incidents * i.hours,
    bars: [{ k: 'Today', v: Math.round(annual) }, { k: 'After the program', v: Math.round(after) }, { k: 'After, plus program cost', v: Math.round(after + i.invest) }],
  };
}
export function verdictFor(i, m) {
  const head = `Each outage costs about ${fmtMoney(m.perIncident)}. With ${i.incidents} a year of ${i.hours} hours each, that is ${fmtMoney(m.annual)} a year.`;
  if (m.net <= 0) return { tone: 'bad', headline: head, detail: `A ${fmtMoney(i.invest)} reliability program that cuts incidents by ${i.incidentCut}% and recovery time by ${i.mttrCut}% saves ${fmtMoney(m.saving)} a year, which is less than it costs. It only pays if the cost of an outage is higher than assumed, or the program is cheaper or more effective.` };
  return { tone: m.net > m.saving * 0.4 ? 'good' : 'mixed', headline: head, detail: `A ${fmtMoney(i.invest)} yearly reliability program that cuts incidents by ${i.incidentCut}% and recovery time by ${i.mttrCut}% saves ${fmtMoney(m.saving)} a year, a net gain of ${fmtMoney(m.net)}. These costs are only the direct ones: lost customers and reputation are not counted.` };
}
export const kpis = (i, m) => [
  { label: 'Cost per outage', value: fmtMoney(m.perIncident), note: `${i.hours} hours at ${i.impact}% impact.` },
  { label: 'Outage cost per year', value: fmtMoney(m.annual), note: `${fmtNum(m.downtimeHours, 1)} hours of downtime.` },
  { label: 'Saving from the program', value: fmtMoney(m.saving), tone: 'good', note: 'Before the program cost.' },
  { label: 'Net per year', value: fmtMoney(m.net), tone: m.net > 0 ? 'good' : 'bad', note: `Payback ${fmtMonths(m.payback)}.` },
];
export const results = [
  { label: 'Cost per outage', get: (m) => m.perIncident, kind: 'money' },
  { label: 'Downtime hours per year', get: (m) => m.downtimeHours, kind: 'num1' },
  { label: 'Outage cost per year today', get: (m) => m.annual, kind: 'money', scenario: true },
  { label: 'Outage cost per year after the program', get: (m) => m.after, kind: 'money', scenario: true },
  { label: 'Saving per year', get: (m) => m.saving, kind: 'money', scenario: true },
  { label: 'Net per year after the program cost', get: (m) => m.net, kind: 'money', scenario: true },
  { label: 'Payback (months)', get: (m) => m.payback, kind: 'months' },
  { label: 'Return on the program cost', get: (m) => m.roi, kind: 'pp0' },
];
export const chart = {
  title: 'Yearly cost of outages', type: 'bar', x: 'k', xKind: 'text', xTitle: 'Case', yKind: 'money', data: (i, m) => m.bars, series: [{ key: 'v', name: 'Yearly cost' }],
  note: 'Outage cost today, after the reliability program, and after the program including what it costs. The program pays when the last bar is below the first.',
  caption: (i, m) => `Incidents fall from ${i.incidents} to ${m.incAfter.toFixed(1)} a year, and each lasts ${m.hoursAfter.toFixed(1)} hours instead of ${i.hours}.`,
};
export const scenarios = trio(
  (i) => ({ ...i, mttrCut: i.mttrCut * 0.5, incidentCut: i.incidentCut * 0.5, invest: i.invest * 1.2 }),
  (i) => ({ ...i, mttrCut: Math.min(90, i.mttrCut * 1.3), incidentCut: Math.min(90, i.incidentCut * 1.3) }),
);
export const scenarioNote = 'Illustrative cases. Pessimistic: the program delivers half the improvement and costs 20% more. Optimistic: 30% more improvement.';
export const sens = [
  { label: 'Revenue per hour (±25%)', worse: (i) => ({ ...i, revHour: i.revHour * 0.75 }), better: (i) => ({ ...i, revHour: i.revHour * 1.25 }) },
  { label: 'Incidents per year (±25%)', worse: (i) => ({ ...i, incidents: i.incidents * 0.75 }), better: (i) => ({ ...i, incidents: i.incidents * 1.25 }) },
  { label: 'Hours per incident (±25%)', worse: (i) => ({ ...i, hours: i.hours * 0.75 }), better: (i) => ({ ...i, hours: i.hours * 1.25 }) },
  { label: 'Share of incidents prevented (±15 points)', worse: (i) => ({ ...i, incidentCut: Math.max(0, i.incidentCut - 15) }), better: (i) => ({ ...i, incidentCut: Math.min(90, i.incidentCut + 15) }) },
  { label: 'Program cost (±30%)', worse: (i) => ({ ...i, invest: i.invest * 1.3 }), better: (i) => ({ ...i, invest: i.invest * 0.7 }) },
];
export const sensMetric = { label: 'net per year (USD)', fn: (m) => m.net, kind: 'money' };
export const bench = (i) => [
  { label: 'Revenue flowing through the system per hour', value: i.revHour, unit: '$/h', range: [0, 0], strength: 'survey', noStatus: true, refText: 'Most mid-size and large enterprises put an hour of downtime above $300,000', note: 'ITIC hourly cost of downtime surveys report that most mid-size and large enterprises put an hour of downtime above $300,000. Small companies sit far below. Use your own revenue and contract terms.', source: 'ITIC, Hourly Cost of Downtime survey 2024', url: 'https://itic-corp.com/itic-2024-hourly-cost-of-downtime-part-2/' },
];
export const planning = 'We found no reliable public benchmark for the share of incidents a reliability program prevents or for how much it shortens recovery. Use your own incident history from the last 12 months, and test the pessimistic scenario.';
export const how = [
  { h: 'Cost of one outage', p: 'Revenue per hour, times the hours of the outage, times the share of that revenue actually lost, plus what it costs to respond: engineers, support and any credits you owe customers.' },
  { h: 'Impact share', p: 'During a partial outage not all revenue is lost: some customers retry later. A full outage is 100%. Be honest here, it is the number people most often overstate.' },
  { h: 'The program', p: 'A reliability investment that prevents some incidents and shortens the rest. It saves the difference between what outages cost today and after, and has to be worth more than it costs.' },
  { h: 'What is missing', p: 'Customers who leave after a bad outage, lost trust, and engineers pulled off other work. These are real but hard to price, so they are left out and the result is conservative.' },
];
export default {
  slug: 'downtime-cost', title: 'Downtime Cost and Reliability ROI', eyebrow: 'Engineering', titleLead: 'Downtime Cost and', titleAccent: 'Reliability ROI', fileName: 'Downtime_Cost',
  blurb: 'What outages cost you each year and whether investing in reliability pays for itself. Gives engineering a number the finance team understands.',
  defaults, limits, presets,
  groups: [{ title: 'Your outages', fields: [
    { key: 'revHour', label: 'Revenue per Hour', min: 100, max: 1000000, step: 100, prefix: '$', tooltip: 'Revenue that flows through the system in a normal hour.' },
    { key: 'incidents', label: 'Outages per Year', min: 0, max: 100, tooltip: 'Incidents that affect customers in a year.' },
    { key: 'hours', label: 'Hours per Outage', min: 0.1, max: 48, step: 0.1, suffix: ' h', tooltip: 'Average time from the start of an outage to recovery.' },
    { key: 'impact', label: 'Revenue Lost During an Outage', min: 5, max: 100, suffix: '%', tooltip: 'Share of the hourly revenue you really lose. 100% is a full outage.' },
    { key: 'response', label: 'Response Cost per Outage', min: 0, max: 500000, step: 500, prefix: '$', tooltip: 'Engineers, support time and customer credits per outage.' },
    { key: 'invest', label: 'Reliability Program Cost per Year', min: 0, max: 5000000, step: 5000, prefix: '$', advanced: true, tooltip: 'Tooling, headcount and time invested in making the system more reliable.' },
    { key: 'incidentCut', label: 'Outages Prevented', min: 0, max: 90, suffix: '%', advanced: true, tooltip: 'Share of outages the program prevents.' },
    { key: 'mttrCut', label: 'Faster Recovery', min: 0, max: 90, suffix: '%', advanced: true, tooltip: 'Reduction in the time to recover from the outages that still happen.' },
  ], advancedSummary: (i) => `Program ${fmtMoney(i.invest)} · prevents ${i.incidentCut}% · ${i.mttrCut}% faster` }],
  model, verdictFor, kpis, results, chart, scenarios, scenarioNote, sens, sensMetric, bench, planning, how,
};
