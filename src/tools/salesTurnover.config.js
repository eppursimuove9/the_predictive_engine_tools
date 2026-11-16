import { fmtMoney, fmtPct1 } from '../shared/format.js';
import { trio } from './_math.js';

export const defaults = { reps: 20, turnover: 30, quota: 900000, attainment: 75, rampMonths: 5, recruitCost: 25000, vacancyMonths: 2, baseSalary: 110000, grossMargin: 75 };
export const limits = { reps: [1, 1000], turnover: [0, 100], quota: [50000, 20000000], attainment: [10, 200], rampMonths: [0, 18], recruitCost: [0, 500000], vacancyMonths: [0, 12], baseSalary: [0, 600000], grossMargin: [10, 100] };
export const presets = [
  { id: 'smb', name: 'SMB team', note: 'Short ramp', inputs: { reps: 15, turnover: 35, quota: 600000, attainment: 70, rampMonths: 3, recruitCost: 12000, vacancyMonths: 1.5, baseSalary: 70000, grossMargin: 78 } },
  { id: 'mid', name: 'Mid-market team', note: '5-month ramp', inputs: { reps: 25, turnover: 28, quota: 1000000, attainment: 75, rampMonths: 5, recruitCost: 30000, vacancyMonths: 2, baseSalary: 120000, grossMargin: 75 } },
  { id: 'ent', name: 'Enterprise team', note: '8-month ramp', inputs: { reps: 12, turnover: 22, quota: 2000000, attainment: 70, rampMonths: 8, recruitCost: 60000, vacancyMonths: 3, baseSalary: 160000, grossMargin: 80 } },
];

export function model(i) {
  const monthlyBookings = (i.quota * (i.attainment / 100)) / 12;
  const gm = i.grossMargin / 100;
  const vacancyLoss = monthlyBookings * i.vacancyMonths * gm;
  // During ramp the new rep goes from 0 to full productivity in a straight line, so on average they deliver half.
  const rampLoss = monthlyBookings * i.rampMonths * 0.5 * gm;
  const salarySaved = (i.baseSalary / 12) * i.vacancyMonths;
  const perDeparture = vacancyLoss + rampLoss + i.recruitCost - salarySaved;
  const departures = i.reps * (i.turnover / 100);
  const annual = departures * perDeparture;
  const lostBookings = monthlyBookings * (i.vacancyMonths + i.rampMonths * 0.5);
  const teamBookings = i.reps * i.quota * (i.attainment / 100);
  return {
    vacancyLoss, rampLoss, salarySaved, perDeparture, departures, annual, lostBookings, teamBookings,
    annualLostBookings: lostBookings * departures, pctOfBookings: teamBookings > 0 ? (annual / teamBookings) * 100 : null,
    fivePoints: i.reps * 0.05 * perDeparture,
    breakdown: [
      { k: 'Gross profit lost while seat is empty', v: Math.round(vacancyLoss) },
      { k: 'Gross profit lost while new rep ramps', v: Math.round(rampLoss) },
      { k: 'Recruiting and onboarding', v: Math.round(i.recruitCost) },
      { k: 'Salary saved while empty', v: -Math.round(salarySaved) },
    ],
  };
}
export function verdictFor(i, m) {
  const head = `Every rep who leaves costs you about ${fmtMoney(m.perDeparture)}. At ${i.turnover}% turnover that is about ${m.departures.toFixed(1)} departures and ${fmtMoney(m.annual)} a year.`;
  const pct = m.pctOfBookings;
  const tone = pct === null ? 'mixed' : (pct >= 8 ? 'bad' : (pct >= 3 ? 'mixed' : 'good'));
  const share = pct === null ? '' : ` That is ${fmtPct1(pct)} of the bookings your team brings in.`;
  return { tone, headline: head, detail: `${share} Cutting turnover by 5 points would save about ${fmtMoney(m.fivePoints)} a year. Most of the cost is not the recruiter fee: it is the revenue the empty seat and the ramp period do not produce.`.trim() };
}
export const kpis = (i, m) => [
  { label: 'Cost per departure', value: fmtMoney(m.perDeparture), note: 'Lost profit and hiring, net of salary saved.' },
  { label: 'Departures per year', value: m.departures.toFixed(1), note: `${i.turnover}% of ${i.reps} reps.` },
  { label: 'Cost per year', value: fmtMoney(m.annual), tone: m.pctOfBookings === null ? 'neutral' : (m.pctOfBookings >= 8 ? 'bad' : (m.pctOfBookings >= 3 ? 'mixed' : 'good')), note: m.pctOfBookings === null ? '' : `${fmtPct1(m.pctOfBookings)} of team bookings.` },
  { label: 'Bookings lost per year', value: fmtMoney(m.annualLostBookings), note: 'Revenue not closed because of the gap and ramp.' },
];
export const results = [
  { label: 'Gross profit lost while the seat is empty', get: (m) => m.vacancyLoss, kind: 'money' },
  { label: 'Gross profit lost during ramp', get: (m) => m.rampLoss, kind: 'money' },
  { label: 'Salary saved while the seat is empty', get: (m) => m.salarySaved, kind: 'money' },
  { label: 'Cost per departure', get: (m) => m.perDeparture, kind: 'money', scenario: true },
  { label: 'Departures per year', get: (m) => m.departures, kind: 'num1', scenario: true },
  { label: 'Cost per year', get: (m) => m.annual, kind: 'money', scenario: true },
  { label: 'Bookings lost per year', get: (m) => m.annualLostBookings, kind: 'money', scenario: true },
  { label: 'Cost as share of team bookings', get: (m) => m.pctOfBookings, kind: 'pp' },
  { label: 'Saving from 5 fewer points of turnover', get: (m) => m.fivePoints, kind: 'money' },
];
export const chart = {
  title: 'Where the cost of one departure comes from', type: 'bar', x: 'k', xKind: 'text', xTitle: 'Cost item', yKind: 'money', data: (i, m) => m.breakdown,
  series: [{ key: 'v', name: 'Cost per departure' }],
  note: 'The bar below zero is salary you do not pay while the seat is empty, which offsets part of the loss.',
  caption: (i, m) => `Net cost per departure: ${fmtMoney(m.perDeparture)}. Revenue effects are ${Math.round(((m.vacancyLoss + m.rampLoss) / Math.max(1, m.vacancyLoss + m.rampLoss + i.recruitCost - m.salarySaved)) * 100)}% of it.`,
};
export const scenarios = trio(
  (i) => ({ ...i, turnover: Math.min(100, i.turnover * 1.25), vacancyMonths: i.vacancyMonths + 1, rampMonths: i.rampMonths + 1 }),
  (i) => ({ ...i, turnover: i.turnover * 0.75, vacancyMonths: Math.max(0, i.vacancyMonths - 1), rampMonths: Math.max(0, i.rampMonths - 1) }),
);
export const scenarioNote = 'Illustrative cases. Pessimistic: turnover +25%, seat empty one month longer, ramp one month longer. Optimistic: turnover -25%, one month shorter on both.';
export const sens = [
  { label: 'Annual turnover (±25%)', worse: (i) => ({ ...i, turnover: Math.min(100, i.turnover * 1.25) }), better: (i) => ({ ...i, turnover: i.turnover * 0.75 }) },
  { label: 'Time the seat stays empty (±1 month)', worse: (i) => ({ ...i, vacancyMonths: i.vacancyMonths + 1 }), better: (i) => ({ ...i, vacancyMonths: Math.max(0, i.vacancyMonths - 1) }) },
  { label: 'Ramp time (±2 months)', worse: (i) => ({ ...i, rampMonths: i.rampMonths + 2 }), better: (i) => ({ ...i, rampMonths: Math.max(0, i.rampMonths - 2) }) },
  { label: 'Quota attainment (±10 points)', worse: (i) => ({ ...i, attainment: Math.min(200, i.attainment + 10) }), better: (i) => ({ ...i, attainment: Math.max(10, i.attainment - 10) }) },
  { label: 'Recruiting cost (±30%)', worse: (i) => ({ ...i, recruitCost: i.recruitCost * 1.3 }), better: (i) => ({ ...i, recruitCost: i.recruitCost * 0.7 }) },
];
export const sensMetric = { label: 'cost per year (USD)', fn: (m) => m.annual, kind: 'money', higherIsBetter: false };
export const bench = () => [];
export const planning = 'We could not verify a reliable public benchmark for sales rep turnover, vacancy time or recruiting cost. Published figures vary widely by segment and come mostly from vendors, so use your own HR and CRM history. Note that in the sensitivity chart a better-performing team makes a departure more expensive, because more bookings are lost.';
export const how = [
  { h: 'What a departure costs', p: 'The revenue a rep would have brought while their seat is empty, plus the revenue the replacement does not bring while they ramp, plus recruiting and onboarding, minus the salary you do not pay while the seat is empty.' },
  { h: 'Why gross profit', p: 'Lost bookings are valued at your gross margin, because revenue you spend delivering is not profit you lose. It counts first-year contract value only, so it is a conservative figure.' },
  { h: 'The ramp', p: 'A new rep is assumed to go from zero to full productivity in a straight line over the ramp time, so on average they deliver half of a ramped rep during it.' },
  { h: 'Use your own numbers', p: 'Take the turnover rate from the last 12 months, the real days to fill a seat from your recruiting data, and your actual ramp time.' },
];
export default {
  slug: 'sales-turnover', title: 'Sales Rep Turnover Cost', eyebrow: 'RevOps and Sales Leadership', titleLead: 'Sales Rep', titleAccent: 'Turnover Cost', fileName: 'Sales_Turnover_Cost',
  blurb: 'What it really costs when a sales rep leaves: the empty seat, the ramp of the replacement and the hiring. Useful for a retention business case.',
  defaults, limits, presets,
  groups: [{ title: 'Your team and turnover', fields: [
    { key: 'reps', label: 'Quota-carrying Reps', min: 1, max: 200, tooltip: 'Number of reps on the team today.' },
    { key: 'turnover', label: 'Annual Rep Turnover', min: 0, max: 100, suffix: '%', tooltip: 'Share of reps who leave in a year, voluntary and not.' },
    { key: 'quota', label: 'Annual Quota per Rep', min: 50000, max: 5000000, step: 10000, prefix: '$', tooltip: 'Bookings a ramped rep is expected to close in a year.' },
    { key: 'attainment', label: 'Average Quota Attainment', min: 10, max: 200, suffix: '%', tooltip: 'Average share of quota reps actually reach.' },
    { key: 'rampMonths', label: 'Ramp Time of a New Rep', min: 0, max: 18, suffix: ' mo', tooltip: 'Months until a new hire is fully productive.' },
    { key: 'vacancyMonths', label: 'Months the Seat Stays Empty', min: 0, max: 12, step: 0.5, suffix: ' mo', tooltip: 'Time from a rep leaving to the replacement starting.' },
    { key: 'recruitCost', label: 'Recruiting and Onboarding Cost', min: 0, max: 200000, step: 1000, prefix: '$', advanced: true, tooltip: 'Recruiter fees, job ads, interview time and onboarding per hire.' },
    { key: 'baseSalary', label: 'Base Salary per Rep', min: 0, max: 400000, step: 5000, prefix: '$', advanced: true, tooltip: 'Salary you do not pay while the seat is empty.' },
    { key: 'grossMargin', label: 'Gross Margin', min: 10, max: 100, suffix: '%', advanced: true, tooltip: 'Lost bookings are valued at this margin.' },
  ], advancedSummary: (i) => `Recruiting ${fmtMoney(i.recruitCost)} · base ${fmtMoney(i.baseSalary)} · margin ${i.grossMargin}%` }],
  model, verdictFor, kpis, results, chart, scenarios, scenarioNote, sens, sensMetric, bench, planning, how,
};
