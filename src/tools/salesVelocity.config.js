import { fmtMoney, fmtPct1, fmtNum } from '../shared/format.js';
import { trio } from './_math.js';

export const defaults = { opps: 80, winRate: 22, acv: 24000, cycle: 60, reps: 8, targetQuarter: 700000 };
export const limits = { opps: [1, 5000], winRate: [1, 90], acv: [500, 5000000], cycle: [5, 720], reps: [1, 500], targetQuarter: [10000, 200000000] };
export const presets = [
  { id: 'smb', name: 'SMB', note: '30-day cycle', inputs: { opps: 150, winRate: 25, acv: 6000, cycle: 30, reps: 6, targetQuarter: 600000 } },
  { id: 'mid', name: 'Mid-market', note: '75-day cycle', inputs: { opps: 100, winRate: 20, acv: 30000, cycle: 75, reps: 10, targetQuarter: 900000 } },
  { id: 'ent', name: 'Enterprise', note: '150-day cycle', inputs: { opps: 40, winRate: 18, acv: 150000, cycle: 150, reps: 12, targetQuarter: 1200000 } },
];

export function model(i) {
  const perDay = (i.opps * (i.winRate / 100) * i.acv) / i.cycle;
  const q = perDay * 90;
  const f = q > 0 ? i.targetQuarter / q : null;
  const winCapped = Math.min(1.2, 100 / i.winRate);
  const levers = [
    { k: 'Today', v: q },
    { k: '+20% opps', v: q * 1.2 },
    { k: '+20% win rate', v: q * winCapped },
    { k: '+20% deal size', v: q * 1.2 },
    { k: '-20% cycle', v: q / 0.8 },
  ];
  const winNeeded = f === null ? null : i.winRate * f;
  return {
    perDay, q, perRepQ: q / i.reps, attain: (q / i.targetQuarter) * 100, gap: i.targetQuarter - q, levers,
    oppsNeeded: f === null ? null : i.opps * f, winNeeded: winNeeded !== null && winNeeded <= 100 ? winNeeded : null,
    acvNeeded: f === null ? null : i.acv * f, cycleNeeded: f === null ? null : i.cycle / f,
  };
}

export function verdictFor(i, m) {
  const head = `Your pipeline is producing about ${fmtMoney(m.perDay)} of revenue a day, or ${fmtMoney(m.q)} a quarter. That is ${Math.round(m.attain)}% of your ${fmtMoney(i.targetQuarter)} target.`;
  if (m.attain >= 100) return { tone: 'good', headline: head, detail: `You are ahead of target by ${fmtMoney(-m.gap)} a quarter. Protect it: the cycle length is the lever most likely to slip, because a 20% longer cycle takes about 17% off revenue.` };
  const tone = m.attain >= 80 ? 'mixed' : 'bad';
  const win = m.winNeeded === null ? 'a win rate above 100%, so win rate alone cannot close the gap' : `a win rate of ${fmtPct1(m.winNeeded)}`;
  return { tone, headline: head, detail: `To close the ${fmtMoney(m.gap)} gap by changing one thing, you would need ${fmtNum(m.oppsNeeded, 0)} open opportunities, ${win}, deals of ${fmtMoney(m.acvNeeded)}, or a ${fmtNum(m.cycleNeeded, 0)}-day cycle. A 20% shorter cycle adds 25%, more than any other 20% change.` };
}

export const kpis = (i, m) => [
  { label: 'Revenue per day', value: fmtMoney(m.perDay), note: 'Pipeline value turned into revenue each day.' },
  { label: 'Revenue per quarter', value: fmtMoney(m.q), note: 'Over 90 days at this speed.' },
  { label: 'Vs quarterly target', value: `${Math.round(m.attain)}%`, tone: m.attain >= 100 ? 'good' : (m.attain >= 80 ? 'mixed' : 'bad'), note: `Target ${fmtMoney(i.targetQuarter)}.` },
  { label: 'Per rep per quarter', value: fmtMoney(m.perRepQ), note: `Across ${i.reps} reps.` },
];
export const results = [
  { label: 'Sales velocity per day', get: (m) => m.perDay, kind: 'money', scenario: true },
  { label: 'Revenue per quarter (90 days)', get: (m) => m.q, kind: 'money', scenario: true },
  { label: 'Share of quarterly target', get: (m) => m.attain, kind: 'pp0', scenario: true },
  { label: 'Revenue per rep per quarter', get: (m) => m.perRepQ, kind: 'money' },
  { label: 'Gap to target per quarter', get: (m) => m.gap, kind: 'money', scenario: true },
  { label: 'Open opportunities needed (alone)', get: (m) => m.oppsNeeded, kind: 'int' },
  { label: 'Win rate needed (alone)', get: (m) => m.winNeeded, kind: 'pp' },
  { label: 'Deal size needed (alone)', get: (m) => m.acvNeeded, kind: 'money' },
  { label: 'Sales cycle needed (days, alone)', get: (m) => m.cycleNeeded, kind: 'int' },
];
export const chart = {
  title: 'What each lever is worth', type: 'bar', x: 'k', xKind: 'text', xTitle: 'Lever', yKind: 'money', data: (i, m) => m.levers.map((l) => ({ k: l.k, v: Math.round(l.v) })),
  series: [{ key: 'v', name: 'Revenue per quarter' }],
  note: 'Revenue per quarter if you improve one thing by 20% and leave the rest as it is.',
  ref: (i) => ({ y: i.targetQuarter, label: `Target ${fmtMoney(i.targetQuarter)}` }),
  caption: () => 'A shorter cycle is worth more than any other equal change, because speed multiplies everything else.',
};
export const scenarios = trio(
  (i) => ({ ...i, opps: i.opps * 0.85, winRate: i.winRate * 0.9, cycle: i.cycle * 1.15 }),
  (i) => ({ ...i, opps: i.opps * 1.1, winRate: Math.min(90, i.winRate * 1.1), cycle: i.cycle * 0.9 }),
);
export const scenarioNote = 'Illustrative cases, not forecasts. Pessimistic: opportunities -15%, win rate -10%, cycle +15%. Optimistic: opportunities +10%, win rate +10%, cycle -10%.';
export const sens = [
  { label: 'Open opportunities (±20%)', worse: (i) => ({ ...i, opps: i.opps * 0.8 }), better: (i) => ({ ...i, opps: i.opps * 1.2 }) },
  { label: 'Win rate (±3 points)', worse: (i) => ({ ...i, winRate: Math.max(1, i.winRate - 3) }), better: (i) => ({ ...i, winRate: Math.min(90, i.winRate + 3) }) },
  { label: 'Deal size (±15%)', worse: (i) => ({ ...i, acv: i.acv * 0.85 }), better: (i) => ({ ...i, acv: i.acv * 1.15 }) },
  { label: 'Sales cycle (±20%)', worse: (i) => ({ ...i, cycle: i.cycle * 1.2 }), better: (i) => ({ ...i, cycle: i.cycle * 0.8 }) },
];
export const sensMetric = { label: 'revenue per quarter (USD)', fn: (m) => m.q, kind: 'money' };
export const bench = (i) => [
  { label: 'Win rate', value: i.winRate, unit: '%', range: [15, 30], strength: 'rule', note: 'Practitioners often quote 15% to 30% for qualified B2B opportunities. This is a common heuristic, not a published study, and it varies a lot by segment and how strictly you qualify.', source: 'Practitioner rule of thumb, no published source' },
];
export const planning = 'We found no reliable public benchmark for sales cycle length or deal size that fits every market. Use your own closed-won history from the last four quarters.';
export const how = [
  { h: 'Sales velocity', p: 'How fast your pipeline turns into revenue. It is the number of qualified opportunities, times your win rate, times the average deal size, divided by the days it takes to close one.' },
  { h: 'Why the cycle matters most', p: 'The other three numbers add or subtract. The cycle divides. Cutting it by 20% raises velocity by 25%, so speed is worth more than an equal change in any other lever.' },
  { h: 'The target line', p: 'The dashed line is your quarterly target. Bars above it are levers that would close the gap on their own. Use it to pick the change you can realistically make.' },
  { h: 'Use your own data', p: 'Count only opportunities that are really qualified, use your closed-won rate over at least a full year, and the median days from opportunity created to closed-won.' },
];

export default {
  slug: 'sales-velocity', title: 'Sales Velocity', eyebrow: 'Sales and RevOps', titleLead: 'Sales', titleAccent: 'Velocity', fileName: 'Sales_Velocity',
  blurb: 'How fast your pipeline turns into revenue, and which of the four levers moves it most. A quick way to decide where to focus.',
  defaults, limits, presets,
  groups: [{ title: 'Your pipeline numbers', fields: [
    { key: 'opps', label: 'Open Qualified Opportunities', min: 1, max: 1000, tooltip: 'Opportunities in your pipeline that a rep has really qualified.' },
    { key: 'winRate', label: 'Win Rate', min: 1, max: 90, suffix: '%', tooltip: 'Share of qualified opportunities that end up closed-won.' },
    { key: 'acv', label: 'Average Deal Size', min: 500, max: 500000, step: 500, prefix: '$', tooltip: 'Average first-year contract value of a closed-won deal.' },
    { key: 'cycle', label: 'Sales Cycle', min: 5, max: 365, suffix: ' days', tooltip: 'Median days from opportunity created to closed-won.' },
    { key: 'reps', label: 'Quota-carrying Reps', min: 1, max: 200, advanced: true, tooltip: 'Used only to show revenue per rep.' },
    { key: 'targetQuarter', label: 'Quarterly Revenue Target', min: 10000, max: 20000000, step: 10000, prefix: '$', advanced: true, tooltip: 'The bookings target for a 90-day quarter.' },
  ], advancedSummary: (i) => `${i.reps} reps · target ${fmtMoney(i.targetQuarter)} a quarter` }],
  model, verdictFor, kpis, results, chart, scenarios, scenarioNote, sens, sensMetric, bench, planning, how,
};
