import { lazy } from 'react';

// Categories, in the order they appear in the menu and on the home page.
export const CATEGORIES = [
  { slug: 'gtm', name: 'GTM and Sales', blurb: 'Unit economics, pipeline, sales velocity and pricing.' },
  { slug: 'marketing', name: 'Marketing', blurb: 'Campaign returns, test planning and the value of your list.' },
  { slug: 'revops', name: 'RevOps and Operations', blurb: 'Sales capacity, pay plans, turnover, automation and your tech stack.' },
  { slug: 'customer', name: 'Customer Success', blurb: 'Retention, support costs and coverage.' },
  { slug: 'finance', name: 'Finance', blurb: 'Runway, SaaS efficiency, investment cases and build vs buy.' },
  { slug: 'engineering', name: 'Engineering', blurb: 'Code review, technical debt and downtime.' },
];
export const findCategory = (slug) => CATEGORIES.find((c) => c.slug === slug);

// The runner (and its chart library) loads only when a tool is opened, so the home page stays light.
const cfg = (name) => () => Promise.all([import(`./tools/${name}.config.js`), import('./shared/ToolRunner.jsx')]).then(([m, r]) => ({ default: r.makeTool(m.default) }));

// One entry per tool. To add a tool config-driven: create src/tools/<name>.config.js (see any of them) and add it here.
export const TOOLS = [
  // GTM and Sales
  { slug: 'unit-economics', title: 'CAC, LTV and Payback', category: 'gtm', icon: 'Calculator', blurb: 'What a customer costs to win, what they are worth, and how long until they pay you back.', load: () => import('./tools/UnitEconomics.jsx') },
  { slug: 'pipeline-coverage', title: 'Pipeline and Funnel Planner', category: 'gtm', icon: 'Target', blurb: 'The leads, meetings and opportunities you need to hit your target, and whether your pipeline is enough.', load: () => import('./tools/PipelineCoverage.jsx') },
  { slug: 'sales-velocity', title: 'Sales Velocity', category: 'gtm', icon: 'Gauge', blurb: 'How fast your pipeline turns into revenue, and which of the four levers moves it most.', load: cfg('salesVelocity') },
  { slug: 'price-change-breakeven', title: 'Price Change Break-even', category: 'gtm', icon: 'Percent', blurb: 'How many customers you can lose after a price increase, or must win after a discount.', load: cfg('priceChange') },
  // Marketing
  { slug: 'campaign-roi', title: 'Campaign ROI and ROAS', category: 'marketing', icon: 'Megaphone', blurb: 'Whether a campaign pays for itself, how fast, and how much room you have before it stops.', load: cfg('campaignRoi') },
  { slug: 'ab-test-planner', title: 'A/B Test Planner', category: 'marketing', icon: 'FlaskConical', blurb: 'The visitors and weeks a test needs, and what a win would be worth.', load: cfg('abTest') },
  { slug: 'email-list-value', title: 'Email List Value', category: 'marketing', icon: 'Mail', blurb: 'What your list earns, what each subscriber is worth, and whether it is growing or shrinking.', load: cfg('emailListValue') },
  // RevOps and Operations
  { slug: 'sales-capacity', title: 'Sales Capacity and Quota Planner', category: 'revops', icon: 'Users', blurb: 'How many reps to hire, and by when, once ramp time and turnover are counted.', load: () => import('./tools/SalesCapacity.jsx') },
  { slug: 'comp-plan', title: 'Sales Comp Plan Cost', category: 'revops', icon: 'BadgeDollarSign', blurb: 'What your pay plan costs per dollar of bookings at the attainment your reps reach.', load: cfg('compPlan') },
  { slug: 'sales-turnover', title: 'Sales Rep Turnover Cost', category: 'revops', icon: 'UserMinus', blurb: 'The real cost when a rep leaves: the empty seat, the ramp and the hiring.', load: cfg('salesTurnover') },
  { slug: 'automation-roi', title: 'Process Automation ROI', category: 'revops', icon: 'Cog', blurb: 'Hours saved by automating a repetitive task, what they are worth, and the payback.', load: cfg('automationRoi') },
  { slug: 'tech-stack-waste', title: 'GTM Tech Stack Waste', category: 'revops', icon: 'Layers', blurb: 'How much of your sales and marketing software goes unused, and what a clean-up saves.', load: cfg('techStack') },
  // Customer Success
  { slug: 'retention-impact', title: 'Retention and NRR Impact', category: 'customer', icon: 'TrendingUp', blurb: 'What churn costs you, where revenue is heading, and whether a retention program pays.', load: () => import('./tools/RetentionImpact.jsx') },
  { slug: 'support-deflection-roi', title: 'Support Deflection ROI', category: 'customer', icon: 'Headphones', blurb: 'What it is worth to solve questions before they become tickets, and the payback.', load: cfg('supportDeflection') },
  { slug: 'cs-capacity', title: 'Customer Success Capacity', category: 'customer', icon: 'HeartHandshake', blurb: 'How many managers your accounts need and the retained revenue that justifies them.', load: cfg('csCapacity') },
  // Finance
  { slug: 'runway-burn-multiple', title: 'Cash Runway and Burn Multiple', category: 'finance', icon: 'Wallet', blurb: 'Months of cash if burn keeps growing, and how efficiently burn turns into new ARR.', load: cfg('runwayBurn') },
  { slug: 'rule-of-40', title: 'Rule of 40 and Growth Efficiency', category: 'finance', icon: 'Activity', blurb: 'Whether growth and cash flow add up to a healthy business, and your magic number.', load: cfg('ruleOf40') },
  { slug: 'investment-case', title: 'Investment Case: NPV, IRR and Payback', category: 'finance', icon: 'Landmark', blurb: 'The financial case for any project: NPV, IRR and payback with scenarios.', load: cfg('investmentCase') },
  { slug: 'build-vs-buy', title: 'Build vs Buy: Total Cost', category: 'finance', icon: 'GitCompare', blurb: 'The total cost of building it yourself versus buying it, including the value of waiting.', load: cfg('buildVsBuy') },
  // Engineering
  { slug: 'verification-tax', title: 'Code Review ROI: Verification Tax', category: 'engineering', icon: 'PieChart', blurb: 'The cost of code nobody has time to review, and the business case for AI code review.', load: () => import('./tools/VerificationTax.jsx') },
  { slug: 'tech-debt-cost', title: 'Technical Debt Cost', category: 'engineering', icon: 'Wrench', blurb: 'What technical debt costs each year in lost engineering time, and whether a clean-up pays.', load: cfg('techDebt') },
  { slug: 'downtime-cost', title: 'Downtime Cost and Reliability ROI', category: 'engineering', icon: 'Siren', blurb: 'What outages cost you each year and whether investing in reliability pays for itself.', load: cfg('downtime') },
];

for (const t of TOOLS) t.Component = lazy(t.load);
export const findTool = (slug) => TOOLS.find((t) => t.slug === slug);
export const toolsIn = (cat) => TOOLS.filter((t) => t.category === cat);
