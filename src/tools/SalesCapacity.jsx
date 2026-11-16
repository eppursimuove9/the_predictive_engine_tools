import { useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Users, Target, BookOpen, TrendingUp } from 'lucide-react';
import { ControlSlider, ToolHeader, PresetBar, StartingValuesNote, VerdictCard, KpiGrid, ToolLayout, ControlGroup, AdvancedGroup, Card, CollapsibleSection, ScenarioTable, TornadoChart, BenchmarkList, ExportPanel, HowToRead } from '../shared/ui.jsx';
import { fmtMoney, fmtNum, fmtPct, cell } from '../shared/format.js';
import { useToolState } from '../shared/toolstate.js';
import { useUnlock } from '../shared/unlock.jsx';
import { tornado } from '../shared/sensitivity.js';
import { downloadPdf, downloadXlsx } from '../shared/report.js';
import { DEFAULTS, LIMITS, PRESETS, model, verdictFor, SCENARIOS, hiresOf, SENS, BENCH, HOW } from './salesCapacity.logic.js';

export default function SalesCapacity() {
  const { inputs, setter, reset, loadPreset, activePresetId, copyShareLink } = useToolState({ defaults: DEFAULTS, limits: LIMITS, presets: PRESETS });
  const { isUnlocked, openUnlock } = useUnlock();
  const m = useMemo(() => model(inputs), [inputs]);
  const verdict = verdictFor(inputs, m);
  const scen = useMemo(() => SCENARIOS.map((s) => ({ label: s.label, m: model(s.apply(inputs)) })), [inputs]);
  const tor = useMemo(() => tornado(inputs, SENS, hiresOf, { higherIsBetter: false }), [inputs]);

  const report = () => ({
    title: 'Sales Capacity and Quota Planner', fileName: 'Sales_Capacity', verdict: `${verdict.headline} ${verdict.detail}`,
    sections: [
      { heading: 'Assumptions', rows: [
        ['Bookings target (12 months)', cell(inputs.target, fmtMoney)], ['Quota per ramped rep', cell(inputs.quota, fmtMoney)], ['Average quota attainment', cell(inputs.attainment, (v) => `${v}%`)], ['Ramped reps today', inputs.rampedReps],
        ['Ramp time (months)', inputs.rampMonths], ['Annual rep turnover', cell(inputs.attrition, (v) => `${v}%`)], ['New reps start in month', inputs.startMonth], ['Cost per rep per year', cell(inputs.costPerRep, fmtMoney)] ] },
      { heading: 'Results', rows: [
        ['Expected bookings from current team', cell(m.existingCap, fmtMoney)], ['Share of target covered', cell(m.coveredPct, fmtPct)], ['Gap to target', cell(Math.max(0, m.gap), fmtMoney)],
        ['Reps needed, simple math', cell(m.naiveHires, (v) => fmtNum(v, 1))], ['Hires needed, with ramp and turnover', m.hiresUp === null ? 'Not reachable' : m.hiresUp], ['Cost of new hires this year', cell(m.hireCost, fmtMoney)], ['Bookings with the plan', cell(m.booked, fmtMoney)] ] },
      { heading: 'Hires needed by start month', head: ['Start month', 'Hires needed'], rows: m.byStart.map((b) => [b.month, b.hires === null ? 'Not reachable' : b.hires]) },
      { heading: 'Scenarios', head: ['Result', ...scen.map((s) => s.label)], rows: [
        ['Hires needed', ...scen.map((s) => (s.m.hiresUp === null ? 'Not reachable' : s.m.hiresUp))], ['Bookings from current team', ...scen.map((s) => cell(s.m.existingCap, fmtMoney))], ['Cost of new hires', ...scen.map((s) => cell(s.m.hireCost, fmtMoney))] ] },
    ],
  });

  const controls = (
    <>
      <StartingValuesNote />
      <PresetBar presets={PRESETS} activeId={activePresetId} onLoad={loadPreset} onReset={reset} />
      <ControlGroup title={<><Users className="w-5 h-5 text-slate-500" /> Target and current team</>}>
        <ControlSlider label="Bookings Target (next 12 months)" value={inputs.target} min={100000} max={100000000} step={100000} setter={setter('target')} prefix="$" tooltip="New bookings or new ARR you need over the next 12 months." />
        <ControlSlider label="Quota per Ramped Rep (per year)" value={inputs.quota} min={50000} max={5000000} step={10000} setter={setter('quota')} prefix="$" tooltip="Annual quota of one fully ramped quota-carrying rep." />
        <ControlSlider label="Average Quota Attainment" value={inputs.attainment} min={20} max={120} step={1} setter={setter('attainment')} suffix="%" tooltip="Share of quota that ramped reps actually deliver on average, across the team (not the share of reps who hit quota)." />
        <ControlSlider label="Ramped Reps Today" value={inputs.rampedReps} min={0} max={200} setter={setter('rampedReps')} tooltip="Reps who are already fully productive. Count reps still ramping separately, or leave them out to stay conservative." />
        <AdvancedGroup summary={`Ramp ${inputs.rampMonths} mo · turnover ${inputs.attrition}% · hires start month ${inputs.startMonth} · ${fmtMoney(inputs.costPerRep)} per rep`}>
          <ControlSlider label="Ramp Time for a New Rep" value={inputs.rampMonths} min={0} max={18} setter={setter('rampMonths')} suffix=" mo" tooltip="Months until a new rep reaches full productivity. Output grows in a straight line until then." />
          <ControlSlider label="Annual Rep Turnover" value={inputs.attrition} min={0} max={60} setter={setter('attrition')} suffix="%" tooltip="Share of reps who leave in a year. Leavers are not replaced in this plan." />
          <ControlSlider label="Month New Reps Start" value={inputs.startMonth} min={1} max={9} setter={setter('startMonth')} tooltip="Counting from today: 1 is next month. Include the time it takes to recruit and onboard." />
          <ControlSlider label="Cost per Rep per Year" value={inputs.costPerRep} min={30000} max={600000} step={5000} setter={setter('costPerRep')} prefix="$" tooltip="Fully loaded: salary at target pay, benefits, tools, management share." />
        </AdvancedGroup>
      </ControlGroup>
    </>
  );

  const results = (
    <>
      <VerdictCard verdict={verdict} />
      <KpiGrid items={[
        { label: 'Current team delivers', value: fmtMoney(m.existingCap), tone: m.noGap ? 'good' : (m.coveredPct >= 70 ? 'mixed' : 'bad'), note: `${Math.round(m.coveredPct)}% of target, after turnover.` },
        { label: 'Hires needed', value: m.hiresUp === null ? 'Not reachable' : String(m.hiresUp), tone: m.noGap ? 'good' : (m.hiresUp === null ? 'bad' : 'mixed'), note: `Starting month ${inputs.startMonth}. Simple math says ${fmtNum(m.naiveHires, 1)}.` },
        { label: 'Cost of new hires', value: fmtMoney(m.hireCost), note: 'This year, for the months they are employed.' },
        { label: 'Cost per $1 booked', value: m.costPerDollar === null ? 'N/A' : `$${m.costPerDollar.toFixed(2)}`, note: 'Whole team cost over bookings with the plan.' },
      ]} />
      <Card title="The cost of hiring late" icon={<Users className="w-5 h-5 text-slate-700" />} note="How many reps you need if they start in each month. The later they start, the less time they have to ramp, so the number climbs fast.">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={m.byStart.map((b) => ({ name: `Month ${b.month}`, hires: b.hires === null ? 0 : b.hires, na: b.hires === null, month: b.month }))} margin={{ top: 20, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={36} tick={{ fill: '#64748b', fontSize: 12 }} />
              <RechartsTooltip formatter={(v, n, p) => [p.payload.na ? 'Not reachable' : `${v} hires`, 'Needed']} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
              <Bar dataKey="hires" radius={6}>{m.byStart.map((b) => <Cell key={b.month} fill={b.month === inputs.startMonth ? '#f52e01' : '#94a3b8'} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-sm text-slate-600">The orange bar is your plan. A missing bar means the gap cannot be closed that late.</p>
      </Card>
      <Card title="Bookings through the year" icon={<TrendingUp className="w-5 h-5 text-slate-700" />} note="Cumulative bookings of the current team, with and without the new hires, against a straight line to the target.">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={m.plan} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tickFormatter={(v) => `M${v}`} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tickFormatter={(v) => fmtMoney(v)} axisLine={false} tickLine={false} width={70} tick={{ fill: '#64748b', fontSize: 12 }} />
              <RechartsTooltip labelFormatter={(v) => `Month ${v}`} formatter={(v, n) => [fmtMoney(v), n]} />
              <Legend />
              <Line type="monotone" dataKey="pace" name="Straight line to target" stroke="#0B1120" strokeWidth={2} strokeDasharray="5 4" dot={false} />
              <Line type="monotone" dataKey="existing" name="Current team only" stroke="#94a3b8" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="withHires" name="With new hires" stroke="#f52e01" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <CollapsibleSection title="Scenarios and sensitivity" icon={<Target className="w-5 h-5 text-slate-700" />} locked={!isUnlocked} onUnlock={openUnlock}>
        <div className="space-y-6">
          <div>
            <p className="text-sm text-slate-600 mb-3">Illustrative cases, not forecasts. Pessimistic: attainment -10 points, ramp +2 months, turnover +10 points, hires start a month later. Optimistic: attainment +10, ramp -1 month, turnover -5, hires start a month earlier.</p>
            <ScenarioTable columns={scen.map((s) => s.label)} rows={[
              { label: 'Hires needed', values: scen.map((s) => (s.m.hiresUp === null ? 'Not reachable' : String(s.m.hiresUp))) },
              { label: 'Bookings from current team', values: scen.map((s) => fmtMoney(s.m.existingCap)) },
              { label: 'Cost of new hires', values: scen.map((s) => fmtMoney(s.m.hireCost)) },
            ]} />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">What moves the number of hires the most</h4>
            <p className="text-sm text-slate-600 mb-2">Each bar shows how the hires needed change when that input moves by a fixed, illustrative margin. The margins are not benchmarks. Check the longest bars first.</p>
            <TornadoChart rows={tor} format={(v) => `${Math.abs(v).toFixed(1)} ${v >= 0 ? 'fewer' : 'more'}`} belowLabel="If worse (more hires)" aboveLabel="If better (fewer hires)" />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Benchmarks and sources" icon={<BookOpen className="w-5 h-5 text-slate-500" />} locked={!isUnlocked} onUnlock={openUnlock}>
        <BenchmarkList items={BENCH(inputs)} planning="We found no reliable public benchmark for account executive ramp time, quota per rep, average attainment or cost per rep. They depend on segment, deal size and pay structure, so use your own history." />
      </CollapsibleSection>

      <ExportPanel isUnlocked={isUnlocked} onUnlock={openUnlock} onPdf={() => downloadPdf(report())} onXlsx={() => downloadXlsx(report())} onShare={copyShareLink} />
      <HowToRead items={HOW} />
    </>
  );

  return (
    <div className="space-y-8">
      <ToolHeader eyebrow="RevOps and Sales Leadership" title="Sales Capacity and" accent="Quota Planner" blurb="Work out how many reps you need to hit the number, and when they have to start, once ramp time and turnover are counted." />
      <ToolLayout controls={controls} results={results} />
    </div>
  );
}
