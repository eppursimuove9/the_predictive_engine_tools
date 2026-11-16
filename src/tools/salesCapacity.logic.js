import { fmtMoney, fmtNum } from '../shared/format.js';

export const DEFAULTS = { target: 4500000, quota: 800000, attainment: 70, rampedReps: 6, rampMonths: 6, attrition: 20, startMonth: 3, costPerRep: 220000 };
export const LIMITS = { target: [100000, 500000000], quota: [50000, 10000000], attainment: [20, 120], rampedReps: [0, 500], rampMonths: [0, 18], attrition: [0, 80], startMonth: [1, 9], costPerRep: [30000, 1000000] };
export const PRESETS = [
  { id: 'early', name: 'Early team', note: '3 reps', inputs: { target: 1600000, quota: 600000, attainment: 65, rampedReps: 3, rampMonths: 5, attrition: 15, startMonth: 2, costPerRep: 180000 } },
  { id: 'scale', name: 'Scaling team', note: '6 reps', inputs: {} },
  { id: 'big', name: 'Large team', note: '30 reps', inputs: { target: 28000000, quota: 1100000, attainment: 72, rampedReps: 30, rampMonths: 8, attrition: 18, startMonth: 3, costPerRep: 260000 } },
];

// A rep ramps in linearly: in tenure month a the output is (a - 0.5) / rampMonths of full, until 100%.
export const rampFactor = (age, ramp) => (ramp <= 0 ? 1 : Math.min(1, Math.max(0, (age - 0.5) / ramp)));

export function model(i) {
  const monthlyOut = (i.quota * (i.attainment / 100)) / 12; // bookings one fully ramped rep delivers per month
  const ma = 1 - Math.pow(1 - i.attrition / 100, 1 / 12);
  const survive = (n) => Math.pow(1 - ma, n);
  let existingCap = 0;
  for (let t = 1; t <= 12; t++) existingCap += i.rampedReps * monthlyOut * survive(t - 1);
  const perHire = (s) => {
    let sum = 0;
    for (let t = s; t <= 12; t++) sum += monthlyOut * survive(t - s) * rampFactor(t - s + 1, i.rampMonths);
    return sum;
  };
  const gap = i.target - existingCap;
  const per = perHire(i.startMonth);
  const hires = gap <= 0 ? 0 : (per > 1e-6 ? gap / per : null);
  const hiresUp = hires === null ? null : Math.ceil(hires - 1e-9);
  const naiveReps = i.target / (i.quota * (i.attainment / 100));
  const naiveHires = Math.max(0, naiveReps - i.rampedReps);
  const byStart = [];
  for (let s = 1; s <= 9; s++) { const p = perHire(s); byStart.push({ month: s, hires: gap <= 0 ? 0 : (p > 1e-6 ? Math.ceil(gap / p - 1e-9) : null) }); }
  // Monthly plan with the rounded-up hires, against a straight-line target.
  const plan = []; let cumExisting = 0; let cumNew = 0;
  for (let t = 1; t <= 12; t++) {
    cumExisting += i.rampedReps * monthlyOut * survive(t - 1);
    if (hiresUp && t >= i.startMonth) cumNew += hiresUp * monthlyOut * survive(t - i.startMonth) * rampFactor(t - i.startMonth + 1, i.rampMonths);
    plan.push({ month: t, existing: Math.round(cumExisting), withHires: Math.round(cumExisting + cumNew), pace: Math.round((i.target * t) / 12) });
  }
  const hireCost = (hiresUp || 0) * i.costPerRep * ((13 - i.startMonth) / 12);
  const teamCost = i.rampedReps * i.costPerRep + hireCost;
  const booked = plan[11].withHires;
  return {
    monthlyOut, existingCap, gap, perHire: per, hires, hiresUp, naiveReps, naiveHires, byStart, plan, hireCost, teamCost, booked,
    coveredPct: (existingCap / i.target) * 100, costPerDollar: booked > 0 ? teamCost / booked : null, noGap: gap <= 0,
    existingBookingsPerRep: i.attainment > 0 ? i.quota * (i.attainment / 100) : 0,
  };
}

export function verdictFor(i, m) {
  if (m.noGap) return { tone: 'good', headline: `Your current ${i.rampedReps} reps are expected to book about ${fmtMoney(m.existingCap)} over the next 12 months, which covers the ${fmtMoney(i.target)} target.`, detail: 'You do not need to add reps for this target. Watch turnover: losing reps faster than planned is the main risk.' };
  if (m.hiresUp === null) return { tone: 'bad', headline: `Your current team is expected to book about ${fmtMoney(m.existingCap)}, ${Math.round(m.coveredPct)}% of the ${fmtMoney(i.target)} target.`, detail: 'Reps hired that late would not ramp in time to close the gap this year. Hire earlier, raise productivity, or move the target.' };
  const headline = `Your current ${i.rampedReps} reps are expected to book about ${fmtMoney(m.existingCap)}, ${Math.round(m.coveredPct)}% of the ${fmtMoney(i.target)} target. To close the ${fmtMoney(m.gap)} gap you need about ${m.hiresUp} new ${m.hiresUp === 1 ? 'rep' : 'reps'} starting by month ${i.startMonth}.`;
  const later = m.byStart[Math.min(8, i.startMonth + 2) - 1];
  let detail = `Simple math says ${fmtNum(m.naiveHires, 1)} more reps. Ramp time and turnover raise it to ${m.hiresUp}. The new reps would cost about ${fmtMoney(m.hireCost)} this year.`;
  if (later && later.month > i.startMonth) detail += ` If hiring slips to month ${later.month}, you would need ${later.hires === null ? 'more than the plan can absorb' : later.hires}.`;
  const tone = m.hiresUp > Math.max(2, i.rampedReps) ? 'bad' : 'mixed';
  return { tone, headline, detail };
}

export const SCENARIOS = [
  { label: 'Pessimistic', apply: (i) => ({ ...i, attainment: Math.max(20, i.attainment - 10), rampMonths: Math.min(18, i.rampMonths + 2), attrition: Math.min(80, i.attrition + 10), startMonth: Math.min(9, i.startMonth + 1) }) },
  { label: 'Base case', apply: (i) => i },
  { label: 'Optimistic', apply: (i) => ({ ...i, attainment: Math.min(120, i.attainment + 10), rampMonths: Math.max(0, i.rampMonths - 1), attrition: Math.max(0, i.attrition - 5), startMonth: Math.max(1, i.startMonth - 1) }) },
];
export const hiresOf = (x) => { const m = model(x); return m.hires === null ? 60 : m.hires; };
export const SENS = [
  { label: 'Quota attainment (±10 pts)', worse: (i) => ({ ...i, attainment: Math.max(20, i.attainment - 10) }), better: (i) => ({ ...i, attainment: Math.min(120, i.attainment + 10) }) },
  { label: 'Quota per rep (±15%)', worse: (i) => ({ ...i, quota: i.quota * 0.85 }), better: (i) => ({ ...i, quota: i.quota * 1.15 }) },
  { label: 'Ramp time (±2 months)', worse: (i) => ({ ...i, rampMonths: Math.min(18, i.rampMonths + 2) }), better: (i) => ({ ...i, rampMonths: Math.max(0, i.rampMonths - 2) }) },
  { label: 'Rep turnover (±10 pts)', worse: (i) => ({ ...i, attrition: Math.min(80, i.attrition + 10) }), better: (i) => ({ ...i, attrition: Math.max(0, i.attrition - 10) }) },
  { label: 'Hiring start month (±2)', worse: (i) => ({ ...i, startMonth: Math.min(9, i.startMonth + 2) }), better: (i) => ({ ...i, startMonth: Math.max(1, i.startMonth - 2) }) },
  { label: 'Revenue target (±10%)', worse: (i) => ({ ...i, target: i.target * 1.1 }), better: (i) => ({ ...i, target: i.target * 0.9 }) },
];

export const BENCH = (i) => [
  { label: 'Ramp time (reference is for SDRs, not account executives)', value: i.rampMonths, unit: 'months', range: [3, 3], refText: 'about 3 months on average for SDRs', strength: 'survey', noStatus: true,
    note: 'The 2025 SDR report found an average ramp of 3.0 months, the lowest since 2010. Account executives ramp longer in most segments, but we found no reliable public figure, so treat this as a floor.',
    source: 'The Bridge Group, SDR tenure and ramp time (2025)', url: 'https://bridgegroupinc.com/research/sdr-tenure-and-ramp-time' },
  { label: 'Annual rep turnover (reference is for SDRs, not account executives)', value: i.attrition, unit: '%', range: [21, 57], refText: 'median 40%, middle half of companies 21% to 57%, for SDRs', strength: 'survey', noStatus: true,
    note: 'Bridge Group reports median SDR turnover of 40% in 2024, of which 13 points involuntary, 11 voluntary and 16 promotions. Quota-carrying reps usually turn over less, so use it only as a ceiling.',
    source: 'The Bridge Group, 2025 SDR models and metrics report', url: 'https://www.bridgegroupinc.com/research/2025-sdr-models-metrics-report-the-bridge-group' },
];

export const HOW = [
  { h: 'What the current team delivers', p: 'Each ramped rep is expected to book their quota times the share of it they typically reach. Turnover lowers that through the year, because reps who leave stop booking. Leavers are not replaced in this plan, which keeps the answer simple and conservative.' },
  { h: 'Hires needed', p: 'The gap between the target and what the current team delivers, divided by what one new rep delivers in the rest of the year. A new rep delivers less than a ramped one because they start slow and some leave, which is why the real number is higher than simple division.' },
  { h: 'Why timing matters', p: 'A rep who starts later has fewer months to ramp and book. The chart shows how many hires you need if they start in each month. The curve gets steep fast, so a slow hiring process can cost more than a higher target.' },
  { h: 'The plan chart', p: 'Month by month, the cumulative bookings of the current team, plus the hires, against a straight line to the target. The line only looks exact if reps arrive on time and ramp as assumed.' },
  { h: 'Cost per dollar booked', p: 'The yearly cost of the current team plus the new hires, divided by the bookings the plan delivers. A rising number as you hire is the cost of ramping.' },
];

