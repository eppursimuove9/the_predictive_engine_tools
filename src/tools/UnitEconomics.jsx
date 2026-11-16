import { useMemo } from 'react';
import { LineChart, Line, ReferenceLine, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Target, BookOpen } from 'lucide-react';
import { ControlSlider, ToolHeader, PresetBar, StartingValuesNote, VerdictCard, KpiGrid, ToolLayout, ControlGroup, AdvancedGroup, Card, CollapsibleSection, ScenarioTable, TornadoChart, BenchmarkList, ExportPanel, HowToRead } from '../shared/ui.jsx';
import { fmtMoney, fmtX, fmtMonths, fmtPct1, cell } from '../shared/format.js';
import { useToolState } from '../shared/toolstate.js';
import { useUnlock } from '../shared/unlock.jsx';
import { tornado } from '../shared/sensitivity.js';
import { downloadPdf, downloadXlsx, sensSection, benchSection } from '../shared/report.js';
import { DEFAULTS, LIMITS, PRESETS, model, verdictFor, SCENARIOS, SENS, BENCH, HOW } from './unitEconomics.logic.js';

export default function UnitEconomics() {
  const { inputs, setter, reset, loadPreset, activePresetId, copyShareLink } = useToolState({ defaults: DEFAULTS, limits: LIMITS, presets: PRESETS });
  const { isUnlocked, openUnlock } = useUnlock();
  const m = useMemo(() => model(inputs), [inputs]);
  const verdict = verdictFor(inputs, m);
  const scen = useMemo(() => SCENARIOS.map((s) => ({ label: s.label, m: model(s.apply(inputs)) })), [inputs]);
  const tor = useMemo(() => tornado(inputs, SENS, (x) => model(x).ltvCac), [inputs]);

  const report = () => ({
    title: 'CAC, LTV and Payback', fileName: 'Unit_Economics', verdict: `${verdict.headline} ${verdict.detail}`,
    sections: [
      { heading: 'Assumptions', rows: [
        ['Monthly sales and marketing spend', cell(inputs.spend, 'money')], ['New customers per month', inputs.newCustomers], ['Revenue per customer per month', cell(inputs.arpa, 'money')],
        ['Gross margin', cell(inputs.grossMargin, 'pp')], ['Monthly churn', cell(inputs.churn, 'pp')], ['Onboarding cost per customer', cell(inputs.onboarding, 'money')],
        ['Lifetime cap (months)', inputs.lifetimeCap], ['Target LTV to CAC (x to 1)', cell(inputs.targetRatio, 'num1')] ] },
      { heading: 'Results', rows: [
        ['Cost to win a customer (CAC)', cell(m.cac, 'money')], ['Gross profit per customer per month', cell(m.monthlyGp, 'money')], ['Customer lifetime (months)', cell(m.lifetime, 'num1')],
        ['Lifetime value (LTV)', cell(m.ltv, 'money')], ['LTV to CAC', cell(m.ltvCac, 'x')], ['CAC payback, standard (months)', cell(m.paybackStd, 'num1')],
        ['Cohort break-even (month)', m.breakeven ?? 'Not within lifetime cap'], ['Highest CAC that still meets target', cell(m.maxCac, 'money')] ] },
      { heading: 'Scenarios', head: ['Result', ...scen.map((s) => s.label)], rows: [
        ['CAC', ...scen.map((s) => cell(s.m.cac, 'money'))], ['LTV', ...scen.map((s) => cell(s.m.ltv, 'money'))],
        ['LTV to CAC', ...scen.map((s) => cell(s.m.ltvCac, 'x'))], ['Payback (months)', ...scen.map((s) => cell(s.m.paybackStd, 'num1'))] ] },
      { heading: 'Cohort gross profit per customer (cumulative)', head: ['Month', 'Gross profit', 'CAC'], rows: m.series.filter((p) => p.month % 6 === 0).map((p) => [p.month, cell(p.cum, 'money'), cell(p.cac, 'money')]) },
      sensSection(tor, 'LTV to CAC (x)', 'x'),
      benchSection(BENCH(inputs, m)),
    ],
  });

  const controls = (
    <>
      <StartingValuesNote />
      <PresetBar presets={PRESETS} activeId={activePresetId} onLoad={loadPreset} onReset={reset} />
      <ControlGroup title={<><TrendingUp className="w-5 h-5 text-slate-500" /> Your acquisition numbers</>}>
        <ControlSlider label="Monthly Sales and Marketing Spend" value={inputs.spend} min={1000} max={2000000} step={1000} setter={setter('spend')} prefix="$" tooltip="Everything you spend to win customers in a month: salaries, commissions, ads, events and tools." />
        <ControlSlider label="New Customers per Month" value={inputs.newCustomers} min={1} max={500} setter={setter('newCustomers')} tooltip="Customers that signed in a typical month." />
        <ControlSlider label="Revenue per Customer per Month" value={inputs.arpa} min={10} max={50000} step={10} setter={setter('arpa')} prefix="$" tooltip="Average monthly revenue of one customer." />
        <ControlSlider label="Gross Margin" value={inputs.grossMargin} min={10} max={100} setter={setter('grossMargin')} suffix="%" tooltip="Revenue left after the cost of delivering the service (hosting, support, onboarding staff)." />
        <ControlSlider label="Monthly Customer Churn" value={inputs.churn} min={0} max={20} step={0.1} setter={setter('churn')} suffix="%" tooltip="Share of customers that cancel each month." />
        <AdvancedGroup summary={`Onboarding ${fmtMoney(inputs.onboarding)} · lifetime cap ${inputs.lifetimeCap} mo · target ${inputs.targetRatio}:1`}>
          <ControlSlider label="One-time Onboarding Cost per Customer" value={inputs.onboarding} min={0} max={50000} step={100} setter={setter('onboarding')} prefix="$" tooltip="Cost to get a new customer live that is not in your sales and marketing spend. Added to the cost to win a customer." />
          <ControlSlider label="Customer Lifetime Cap" value={inputs.lifetimeCap} min={12} max={120} step={6} setter={setter('lifetimeCap')} suffix=" mo" tooltip="Longest lifetime counted, so a very low churn does not produce an unrealistic value." />
          <ControlSlider label="Target LTV to CAC" value={inputs.targetRatio} min={1} max={10} step={0.5} setter={setter('targetRatio')} suffix=":1" tooltip="The ratio you want to reach. Around 3 to 1 is the usual minimum." />
        </AdvancedGroup>
      </ControlGroup>
    </>
  );

  const results = (
    <>
      <VerdictCard verdict={verdict} />
      <KpiGrid items={[
        { label: 'Cost to win a customer', value: fmtMoney(m.cac), note: 'Spend per new customer, plus onboarding.' },
        { label: 'Lifetime value', value: fmtMoney(m.ltv), note: `Gross profit over ${m.lifetime.toFixed(0)} months${m.capped ? ' (capped)' : ''}.` },
        { label: 'LTV to CAC', value: fmtX(m.ltvCac), tone: m.ltvCac >= inputs.targetRatio ? 'good' : (m.ltvCac >= 1 ? 'mixed' : 'bad'), note: `Target ${inputs.targetRatio}:1.` },
        { label: 'CAC payback', value: fmtMonths(m.paybackStd), tone: m.paybackStd <= 12 ? 'good' : (m.paybackStd <= 24 ? 'mixed' : 'bad'), note: 'Months of gross profit to recover the cost.' },
      ]} />
      <Card title="When a customer pays you back" icon={<TrendingUp className="w-5 h-5 text-slate-700" />}
        note="The line is the total gross profit an average customer has brought you so far, counting those who leave. Where it crosses the dashed line, the customer has paid for themselves.">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={m.series} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" ticks={Array.from({ length: Math.floor((m.series.length - 1) / 12) + 1 }, (_, n) => n * 12)} tickFormatter={(v) => `M${v}`} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tickFormatter={(v) => fmtMoney(v)} axisLine={false} tickLine={false} width={70} tick={{ fill: '#64748b', fontSize: 12 }} />
              <RechartsTooltip labelFormatter={(v) => `Month ${v}`} formatter={(v) => [fmtMoney(v), 'Gross profit so far']} />
              <ReferenceLine y={Math.round(m.cac)} stroke="#0B1120" strokeWidth={2} strokeDasharray="5 4" label={{ position: 'insideTopRight', value: `Cost to win: ${fmtMoney(m.cac)}`, fill: '#0B1120', fontWeight: 700, fontSize: 12 }} />
              <Line type="monotone" dataKey="cum" stroke="#f52e01" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-sm text-slate-700">
          {m.breakeven ? <>An average customer, counting churn, covers their cost in <strong>month {m.breakeven}</strong>. The standard payback ignores churn and says <strong>{fmtMonths(m.paybackStd)}</strong>.</> : <>An average customer, counting churn, <strong>does not cover their cost</strong> within {inputs.lifetimeCap} months.</>}
          {' '}Each month of new customers creates <strong>{fmtMoney(m.cohortProfit)}</strong> of lifetime gross profit after the cost of winning them.
        </p>
      </Card>

      <CollapsibleSection title="What it would take, scenarios and sensitivity" icon={<Target className="w-5 h-5 text-slate-700" />} locked={!isUnlocked} onUnlock={openUnlock}>
        <div className="space-y-6">
          <div>
            <h4 className="font-bold text-slate-900">To reach {inputs.targetRatio}:1, change one thing</h4>
            <ul className="mt-2 text-sm text-slate-700 space-y-1">
              <li>Win customers for <strong>{fmtMoney(m.maxCac)}</strong> or less (today {fmtMoney(m.cac)}).</li>
              <li>{m.churnNeeded === null ? 'Churn alone cannot get you there within the lifetime cap.' : <>Cut monthly churn to <strong>{fmtPct1(m.churnNeeded)}</strong> (today {fmtPct1(inputs.churn)}).</>}</li>
              <li>Raise revenue per customer to <strong>{fmtMoney(m.arpaNeeded)}</strong> a month (today {fmtMoney(inputs.arpa)}).</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-1">Scenarios</h4>
            <p className="text-sm text-slate-600 mb-3">Illustrative cases, not forecasts. Pessimistic: spend +20%, churn +30%, revenue per customer -10%. Optimistic: spend -10%, churn -20%, revenue per customer +10%.</p>
            <ScenarioTable columns={scen.map((s) => s.label)} rows={[
              { label: 'Cost to win a customer', values: scen.map((s) => fmtMoney(s.m.cac)) },
              { label: 'Lifetime value', values: scen.map((s) => fmtMoney(s.m.ltv)) },
              { label: 'LTV to CAC', values: scen.map((s) => fmtX(s.m.ltvCac)) },
              { label: 'CAC payback', values: scen.map((s) => fmtMonths(s.m.paybackStd)) },
            ]} />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">What moves LTV to CAC the most</h4>
            <p className="text-sm text-slate-600 mb-2">Each bar shows how the ratio changes when that input moves by a fixed, illustrative margin. The margins are not benchmarks. Check the longest bars first.</p>
            <TornadoChart rows={tor} format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}x`} />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Benchmarks and sources" icon={<BookOpen className="w-5 h-5 text-slate-500" />} locked={!isUnlocked} onUnlock={openUnlock}>
        <BenchmarkList items={BENCH(inputs, m)} planning="We found no reliable public benchmark for gross margin, monthly churn or revenue per customer that fits every market. They depend too much on your segment and price point, so use your own data." />
      </CollapsibleSection>

      <ExportPanel isUnlocked={isUnlocked} onUnlock={openUnlock} onPdf={() => downloadPdf(report())} onXlsx={() => downloadXlsx(report())} onShare={copyShareLink} />
      <HowToRead items={HOW} />
    </>
  );

  return (
    <div className="space-y-8">
      <ToolHeader eyebrow="Sales and Marketing" title="CAC, LTV and" accent="Payback" blurb="Find out what it costs to win a customer, what that customer is worth, and how long they take to pay you back. A fast check on whether your growth spend makes sense." />
      <ToolLayout controls={controls} results={results} />
    </div>
  );
}
