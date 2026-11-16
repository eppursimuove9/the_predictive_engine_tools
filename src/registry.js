import { lazy } from 'react';

// One entry per tool. To add a tool: create src/tools/YourTool.jsx (default export = the page) and add it here.
export const TOOLS = [
  {
    slug: 'unit-economics',
    title: 'CAC, LTV & Payback',
    area: 'Sales and Marketing',
    icon: 'Calculator',
    blurb: 'How much a customer costs to win, what they are worth, and how many months until they pay you back.',
    load: () => import('./tools/UnitEconomics.jsx'),
  },
  {
    slug: 'pipeline-coverage',
    title: 'Pipeline and Funnel Planner',
    area: 'Sales and RevOps',
    icon: 'Target',
    blurb: 'How many leads, meetings and opportunities you need to hit your revenue target, and whether your pipeline is enough.',
    load: () => import('./tools/PipelineCoverage.jsx'),
  },
  {
    slug: 'sales-capacity',
    title: 'Sales Capacity and Quota Planner',
    area: 'RevOps and Sales Leadership',
    icon: 'Users',
    blurb: 'How many reps you need to hire, and by when, once ramp time and turnover are counted.',
    load: () => import('./tools/SalesCapacity.jsx'),
  },
  {
    slug: 'retention-impact',
    title: 'Retention and NRR Impact',
    area: 'Customer Success and Finance',
    icon: 'TrendingUp',
    blurb: 'What churn is costing you, where revenue is heading, and whether a retention program pays for itself.',
    load: () => import('./tools/RetentionImpact.jsx'),
  },
  {
    slug: 'verification-tax',
    title: 'Code Review ROI: Verification Tax',
    area: 'Engineering and Finance',
    icon: 'PieChart',
    blurb: 'The cost of code that nobody has time to review, and the business case for AI code review.',
    load: () => import('./tools/VerificationTax.jsx'),
  },
];

for (const t of TOOLS) t.Component = lazy(t.load);
export const findTool = (slug) => TOOLS.find((t) => t.slug === slug);
