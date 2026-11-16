import { fmtMoney, fmtX, fmtMonths } from '../shared/format.js';

export const DEFAULTS = { spend: 90000, newCustomers: 10, arpa: 800, grossMargin: 75, churn: 3, onboarding: 0, lifetimeCap: 60, targetRatio: 3 };
export const LIMITS = { spend: [1000, 5000000], newCustomers: [1, 2000], arpa: [10, 100000], grossMargin: [10, 100], churn: [0, 20], onboarding: [0, 100000], lifetimeCap: [12, 120], targetRatio: [1, 10] };
export const PRESETS = [
  { id: 'smb', name: 'SMB', note: '$150 a month', inputs: { spend: 30000, newCustomers: 60, arpa: 150, grossMargin: 80, churn: 4 } },
  { id: 'mid', name: 'Mid-market', note: '$3,000 a month', inputs: { spend: 400000, newCustomers: 10, arpa: 3000, grossMargin: 75, churn: 1.5 } },
  { id: 'ent', name: 'Enterprise', note: '$12,000 a month', inputs: { spend: 900000, newCustomers: 4, arpa: 12000, grossMargin: 80, churn: 0.8, onboarding: 5000 } },
];

// Pure model. Money is per month unless stated. Churn is the share of customers lost each month.
export function model(i) {
  const cac = i.spend / i.newCustomers + i.onboarding;
  const monthlyGp = i.arpa * (i.grossMargin / 100);
  const c = i.churn / 100;
  const uncapped = c > 0 ? 1 / c : Infinity;
  const lifetime = Math.min(uncapped, i.lifetimeCap);
  const ltv = monthlyGp * lifetime;
  const ltvCac = ltv / cac;
  const paybackStd = cac / monthlyGp;
  // Break-even month, searched up to the lifetime cap so it agrees with LTV.
  let breakeven = null;
  { let cm = 0; let sv = 1; for (let t = 1; t <= i.lifetimeCap; t++) { cm += monthlyGp * sv; sv *= (1 - c); if (cm >= cac) { breakeven = t; break; } } }
  // Cohort view: cumulative gross profit of an average customer, month by month, counting churn.
  // The chart runs long enough to show the break-even point (at least 36 months, in steps of 12).
  const horizon = Math.min(120, Math.max(36, Math.ceil(((breakeven || 0) + 6) / 12) * 12));
  const series = [];
  let cum = 0; let surv = 1;
  for (let t = 0; t <= horizon; t++) {
    if (t > 0) { cum += monthlyGp * surv; surv *= (1 - c); }
    series.push({ month: t, cum: Math.round(cum), cac: Math.round(cac) });
  }
  const maxCac = ltv / i.targetRatio;
  const lifetimeNeeded = (i.targetRatio * cac) / monthlyGp;
  return {
    cac, monthlyGp, lifetime, uncapped, capped: uncapped > i.lifetimeCap, ltv, ltvCac, paybackStd, breakeven, series,
    maxCac, cacHeadroom: maxCac - cac,
    churnNeeded: lifetimeNeeded > i.lifetimeCap ? null : 100 / Math.max(lifetimeNeeded, 1),
    arpaNeeded: (i.targetRatio * cac) / ((i.grossMargin / 100) * lifetime),
    cohortProfit: i.newCustomers * (ltv - cac),
  };
}

export function verdictFor(i, m) {
  const ratio = fmtX(m.ltvCac);
  const head = `It costs about ${fmtMoney(m.cac)} to win a customer, who is worth about ${fmtMoney(m.ltv)} in gross profit over their lifetime. That is ${ratio} what you spend to get them.`;
  let tone; let detail;
  if (m.ltvCac < 1) {
    tone = 'bad';
    detail = `You lose money on every customer you win: each one returns less than it cost. ${m.breakeven ? `Even so, the average customer covers their cost in month ${m.breakeven}.` : 'The average customer never covers their acquisition cost.'} Fix the cost of winning or the churn before adding spend.`;
  } else if (m.ltvCac < i.targetRatio) {
    tone = 'mixed';
    detail = `Every dollar of acquisition spend returns ${m.ltvCac.toFixed(1)} dollars of gross profit, below your ${i.targetRatio}:1 target. The standard payback is ${fmtMonths(m.paybackStd)}. To reach ${i.targetRatio}:1 you could win customers for ${fmtMoney(m.maxCac)} or less.`;
  } else if (m.paybackStd > 18) {
    tone = 'mixed';
    detail = `The return is healthy, but cash comes back slowly: ${fmtMonths(m.paybackStd)} to recover the cost of a customer. That ties up cash, so check that you can fund the wait.`;
  } else {
    tone = 'good';
    detail = `The cost of a customer is recovered in ${fmtMonths(m.paybackStd)}, and you have room to spend up to ${fmtMoney(m.maxCac)} per customer and still hold ${i.targetRatio}:1.`;
  }
  if (m.capped) detail += ` Customer lifetime is capped at ${i.lifetimeCap} months to stay conservative.`;
  return { tone, headline: head, detail };
}

export const SCENARIOS = [
  { label: 'Pessimistic', apply: (i) => ({ ...i, spend: i.spend * 1.2, churn: Math.min(20, i.churn * 1.3), arpa: i.arpa * 0.9 }) },
  { label: 'Base case', apply: (i) => i },
  { label: 'Optimistic', apply: (i) => ({ ...i, spend: i.spend * 0.9, churn: i.churn * 0.8, arpa: i.arpa * 1.1 }) },
];
export const SENS = [
  { label: 'Cost to win a customer (±20%)', worse: (i) => ({ ...i, spend: i.spend * 1.2 }), better: (i) => ({ ...i, spend: i.spend * 0.8 }) },
  { label: 'Monthly churn (±25%)', worse: (i) => ({ ...i, churn: Math.min(20, i.churn * 1.25) }), better: (i) => ({ ...i, churn: i.churn * 0.75 }) },
  { label: 'Revenue per customer (±15%)', worse: (i) => ({ ...i, arpa: i.arpa * 0.85 }), better: (i) => ({ ...i, arpa: i.arpa * 1.15 }) },
  { label: 'Gross margin (±5 points)', worse: (i) => ({ ...i, grossMargin: Math.max(10, i.grossMargin - 5) }), better: (i) => ({ ...i, grossMargin: Math.min(100, i.grossMargin + 5) }) },
  { label: 'Onboarding cost (±50%)', worse: (i) => ({ ...i, onboarding: i.onboarding * 1.5 }), better: (i) => ({ ...i, onboarding: i.onboarding * 0.5 }) },
];

export const BENCH = (i, m) => [
  { label: 'LTV to CAC ratio', value: m.ltvCac, unit: 'x', range: [3, 5], strength: 'secondary',
    note: 'A ratio of about 3:1 or more is the usual minimum. One secondary summary reports medians of about 3.6:1 for mid-market and 4.5:1 for enterprise, citing unnamed sources. A ratio far above range can mean you under-invest in growth.',
    source: 'Phoenix Strategy Group, SaaS unit economics benchmarks', url: 'https://www.phoenixstrategy.group/blog/unit-economics-benchmarks-for-saas-growth' },
  { label: 'CAC payback (standard definition)', value: m.paybackStd, unit: 'months', range: [0, 18], strength: 'secondary',
    note: 'Under 12 months is a common SMB target. The same summary reports about 17 months for mid-market and 22 for enterprise, and contradicts itself on enterprise (it also says 18). Treat these as rough.',
    source: 'Phoenix Strategy Group, SaaS unit economics benchmarks', url: 'https://www.phoenixstrategy.group/blog/unit-economics-benchmarks-for-saas-growth' },
];

export const HOW = [
  { h: 'Cost to win a customer (CAC)', p: 'Everything you spend on sales and marketing in a month, divided by the new customers it brought in, plus any one-time cost to onboard them. Include salaries, commissions, ads and tools, or the number will look better than it is.' },
  { h: 'Lifetime value (LTV)', p: 'The gross profit an average customer brings before they leave. It uses gross margin, not revenue, because revenue you spend delivering the service is not yours to keep. Lifetime is one divided by monthly churn, capped so a very low churn does not produce an unrealistic value.' },
  { h: 'LTV to CAC', p: 'How many dollars of lifetime gross profit you get back for each dollar spent winning a customer. Around 3 to 1 is the usual minimum. Far higher can mean you could grow faster by spending more.' },
  { h: 'Payback', p: 'The standard CAC payback is the cost of a customer divided by the gross profit they bring each month. The chart is stricter: it follows an average customer including the ones who leave, and shows when their total gross profit finally covers the cost. That second point is always later.' },
  { h: 'What it would take', p: 'Three ways to reach your target ratio, each changing only one thing: a lower cost to win a customer, lower churn, or more revenue per customer. Pick the one you can realistically move.' },
];

