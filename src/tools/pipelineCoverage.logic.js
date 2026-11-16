import { fmtMoney, fmtX, fmtNum } from '../shared/format.js';

export const DEFAULTS = { target: 1200000, closedWon: 300000, dealSize: 40000, openPipeline: 2800000, winRate: 22, oppRate: 45, meetingRate: 8, salesCycle: 75, daysLeft: 90, haircut: 0 };
export const LIMITS = { target: [10000, 100000000], closedWon: [0, 100000000], dealSize: [500, 5000000], openPipeline: [0, 500000000], winRate: [3, 80], oppRate: [5, 100], meetingRate: [0.5, 60], salesCycle: [7, 365], daysLeft: [0, 365], haircut: [0, 70] };
export const PRESETS = [
  { id: 'smb', name: 'SMB motion', note: '$8k deals', inputs: { target: 600000, closedWon: 150000, dealSize: 8000, openPipeline: 1200000, winRate: 28, oppRate: 50, meetingRate: 10, salesCycle: 30, daysLeft: 60 } },
  { id: 'mid', name: 'Mid-market', note: '$40k deals', inputs: {} },
  { id: 'ent', name: 'Enterprise', note: '$150k deals', inputs: { target: 4000000, closedWon: 600000, dealSize: 150000, openPipeline: 20000000, winRate: 15, oppRate: 35, meetingRate: 5, salesCycle: 150, daysLeft: 90, haircut: 20 } },
];

export function model(i) {
  const win = i.winRate / 100; const opp = i.oppRate / 100; const meet = i.meetingRate / 100;
  const remaining = Math.max(0, i.target - i.closedWon);
  const realPipeline = i.openPipeline * (1 - i.haircut / 100);
  const coverage = remaining > 0 ? realPipeline / remaining : null;
  const requiredCoverage = 1 / win;
  const expected = realPipeline * win;
  const projected = i.closedWon + expected;
  const attainment = (projected / i.target) * 100;
  const gap = Math.max(0, remaining - expected);
  const extraPipeline = gap / win;
  const funnel = (value) => { // what it takes to produce `value` of closed revenue from scratch
    const deals = value / i.dealSize; const opps = deals / win; const meetings = opps / opp; const leads = meetings / meet;
    return { deals, opps, meetings, leads };
  };
  const timingOk = i.salesCycle <= i.daysLeft;
  return {
    remaining, realPipeline, coverage, requiredCoverage, expected, projected, attainment, gap, extraPipeline,
    fromScratch: funnel(remaining), extra: funnel(extraPipeline), leadToWin: win * opp * meet * 100, timingOk,
    targetMet: remaining === 0,
  };
}

export function verdictFor(i, m) {
  if (m.targetMet) return { tone: 'good', headline: `You have already closed ${fmtMoney(i.closedWon)}, which meets the ${fmtMoney(i.target)} target.`, detail: 'Any pipeline from here is a head start on the next period.' };
  const att = Math.round(m.attainment);
  const have = m.coverage === null ? 'n/a' : fmtX(m.coverage);
  const head = `With ${fmtMoney(m.realPipeline)} of real pipeline against ${fmtMoney(m.remaining)} still to close, you have ${have} coverage and need ${fmtX(m.requiredCoverage)} at a ${i.winRate}% win rate. You are on track for about ${att}% of target.`;
  let tone; let detail;
  if (m.attainment >= 100) {
    tone = 'good';
    detail = `Your pipeline is enough: it is expected to close ${fmtMoney(m.expected)}, more than the ${fmtMoney(m.remaining)} you still need.`;
  } else {
    tone = m.attainment >= 70 ? 'mixed' : 'bad';
    detail = `You are expected to fall about ${fmtMoney(m.gap)} short. Closing that would take roughly ${fmtMoney(m.extraPipeline)} more qualified pipeline: about ${fmtNum(m.extra.opps)} opportunities, ${fmtNum(m.extra.meetings)} meetings and ${fmtNum(m.extra.leads)} leads.`;
    if (!m.timingOk) detail += ` But your sales cycle of ${i.salesCycle} days is longer than the ${i.daysLeft} days left, so new leads will mostly close next period. The levers for this period are speeding up deals already open or accepting the gap.`;
  }
  return { tone, headline: head, detail };
}

export const SCENARIOS = [
  { label: 'Pessimistic', apply: (i) => ({ ...i, winRate: i.winRate * 0.8, haircut: Math.min(70, i.haircut + 15), meetingRate: i.meetingRate * 0.85, oppRate: i.oppRate * 0.9 }) },
  { label: 'Base case', apply: (i) => i },
  { label: 'Optimistic', apply: (i) => ({ ...i, winRate: Math.min(80, i.winRate * 1.15), haircut: Math.max(0, i.haircut - 10), meetingRate: i.meetingRate * 1.1, oppRate: Math.min(100, i.oppRate * 1.1) }) },
];
export const SENS = [
  { label: 'Win rate (±20%)', worse: (i) => ({ ...i, winRate: i.winRate * 0.8 }), better: (i) => ({ ...i, winRate: Math.min(80, i.winRate * 1.2) }) },
  { label: 'Open pipeline size (±20%)', worse: (i) => ({ ...i, openPipeline: i.openPipeline * 0.8 }), better: (i) => ({ ...i, openPipeline: i.openPipeline * 1.2 }) },
  { label: 'Share of pipeline not real (±10 pts)', worse: (i) => ({ ...i, haircut: Math.min(70, i.haircut + 10) }), better: (i) => ({ ...i, haircut: Math.max(0, i.haircut - 10) }) },
  { label: 'Revenue target (±10%)', worse: (i) => ({ ...i, target: i.target * 1.1 }), better: (i) => ({ ...i, target: i.target * 0.9 }) },
  { label: 'Already closed (±20%)', worse: (i) => ({ ...i, closedWon: i.closedWon * 0.8 }), better: (i) => ({ ...i, closedWon: Math.min(i.target, i.closedWon * 1.2) }) },
];

export const BENCH = (i, m) => [
  { label: 'Pipeline coverage', value: m.coverage, unit: 'x', range: [3, 5], strength: 'secondary',
    note: 'Three times what is left is the common rule of thumb, and it assumes a win rate of about 33%. At the median win rate of about 20%, you need nearer 5x. The same source reports that raw CRM pipeline overstates qualified pipeline by 30 to 40% (not independently verified), which is what the "not real" setting is for.',
    source: 'SaaS Hero, pipeline coverage ratio guide (secondary, cites HubSpot and Ebsta)', url: 'https://www.saashero.net/strategy/pipeline-coverage-ratio-saas-companies/' },
  { label: 'Win rate, qualified opportunity to closed', value: i.winRate, unit: '%', range: [19, 33], strength: 'secondary',
    note: 'Median B2B win rate reported at 19% to 21% in 2024 and 2025 by HubSpot and Ebsta, through the secondary source. Enterprise tends lower and SMB higher.',
    source: 'SaaS Hero, pipeline coverage ratio guide (secondary)', url: 'https://www.saashero.net/strategy/pipeline-coverage-ratio-saas-companies/' },
];

export const HOW = [
  { h: 'Coverage', p: 'Real pipeline divided by what is left to close. A 4x coverage means you have four dollars of qualified pipeline for each dollar you still need. How much you need depends on your win rate: at a 25% win rate you need about 4x, at 20% about 5x.' },
  { h: 'Real pipeline', p: 'The pipeline in your CRM often includes deals that are stale or not truly qualified. The "not real" setting removes that share before any math, so the answer is not built on optimism.' },
  { h: 'On track for', p: 'What you have already closed plus what your pipeline should close at your win rate, as a share of target. It is an expected value, not a promise: individual quarters vary a lot.' },
  { h: 'What it takes', p: 'Works backwards from deals to opportunities, meetings and leads using your own conversion rates. The first set is everything you would need from scratch. The shortfall set is only what is missing on top of the pipeline you already have.' },
  { h: 'Timing', p: 'New pipeline only helps this period if it can close in time. If your sales cycle is longer than the days left, extra leads now will land in the next period.' },
];

