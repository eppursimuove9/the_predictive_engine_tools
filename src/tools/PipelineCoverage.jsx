import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Target, BookOpen, TrendingUp } from 'lucide-react';
import { ControlSlider, ToolHeader, PresetBar, StartingValuesNote, VerdictCard, KpiGrid, ToolLayout, ControlGroup, AdvancedGroup, Card, CollapsibleSection, ScenarioTable, TornadoChart, BenchmarkList, ExportPanel, HowToRead } from '../shared/ui.jsx';
import { fmtMoney, fmtX, fmtNum, fmtPct, cell } from '../shared/format.js';
import { useToolState } from '../shared/toolstate.js';
import { useUnlock } from '../shared/unlock.jsx';
import { tornado } from '../shared/sensitivity.js';
import { downloadPdf, downloadXlsx } from '../shared/report.js';
import { DEFAULTS, LIMITS, PRESETS, model, verdictFor, SCENARIOS, SENS, BENCH, HOW } from './pipelineCoverage.logic.js';

export default function PipelineCoverage() {
  const { inputs, setter, reset, loadPreset, activePresetId, copyShareLink } = useToolState({ defaults: DEFAULTS, limits: LIMITS, presets: PRESETS });
  const { isUnlocked, openUnlock } = useUnlock();
  const m = useMemo(() => model(inputs), [inputs]);
  const verdict = verdictFor(inputs, m);
  const scen = useMemo(() => SCENARIOS.map((s) => ({ label: s.label, m: model(s.apply(inputs)) })), [inputs]);
  const tor = useMemo(() => tornado(inputs, SENS, (x) => model(x).attainment), [inputs]);
  const chart = [
    { name: 'Real pipeline you have', value: Math.round(m.realPipeline), color: '#3b82f6' },
    { name: 'Needed at your win rate', value: Math.round(m.remaining * m.requiredCoverage), color: '#0B1120' },
    { name: 'Expected to close', value: Math.round(m.expected), color: '#10b981' },
    { name: 'Still to close', value: Math.round(m.remaining), color: '#ef4444' },
  ];

  const report = () => ({
    title: 'Pipeline and Funnel Planner', fileName: 'Pipeline_Planner', verdict: `${verdict.headline} ${verdict.detail}`,
    sections: [
      { heading: 'Assumptions', rows: [
        ['Revenue target', cell(inputs.target, fmtMoney)], ['Already closed', cell(inputs.closedWon, fmtMoney)], ['Average deal size', cell(inputs.dealSize, fmtMoney)], ['Open qualified pipeline', cell(inputs.openPipeline, fmtMoney)],
        ['Share of pipeline not real', cell(inputs.haircut, (v) => `${v}%`)], ['Win rate', cell(inputs.winRate, (v) => `${v}%`)], ['Meeting to opportunity', cell(inputs.oppRate, (v) => `${v}%`)], ['Lead to meeting', cell(inputs.meetingRate, (v) => `${v}%`)],
        ['Sales cycle (days)', inputs.salesCycle], ['Days left in period', inputs.daysLeft] ] },
      { heading: 'Results', rows: [
        ['Left to close', cell(m.remaining, fmtMoney)], ['Real pipeline', cell(m.realPipeline, fmtMoney)], ['Coverage', m.coverage === null ? 'n/a' : cell(m.coverage, fmtX)], ['Coverage needed', cell(m.requiredCoverage, fmtX)],
        ['Expected to close from pipeline', cell(m.expected, fmtMoney)], ['On track for (% of target)', cell(m.attainment, fmtPct)], ['Expected shortfall', cell(m.gap, fmtMoney)], ['Extra pipeline needed', cell(m.extraPipeline, fmtMoney)] ] },
      { heading: 'Funnel volumes', head: ['Stage', 'From scratch', 'Shortfall only'], rows: [
        ['Leads', cell(m.fromScratch.leads, (v) => fmtNum(v)), cell(m.extra.leads, (v) => fmtNum(v))], ['Meetings', cell(m.fromScratch.meetings, (v) => fmtNum(v)), cell(m.extra.meetings, (v) => fmtNum(v))],
        ['Opportunities', cell(m.fromScratch.opps, (v) => fmtNum(v)), cell(m.extra.opps, (v) => fmtNum(v))], ['Deals', cell(m.fromScratch.deals, (v) => fmtNum(v, 1)), cell(m.extra.deals, (v) => fmtNum(v, 1))] ] },
      { heading: 'Scenarios', head: ['Result', ...scen.map((s) => s.label)], rows: [
        ['On track for (% of target)', ...scen.map((s) => cell(s.m.attainment, fmtPct))], ['Expected to close', ...scen.map((s) => cell(s.m.expected, fmtMoney))],
        ['Coverage', ...scen.map((s) => (s.m.coverage === null ? 'n/a' : cell(s.m.coverage, fmtX)))], ['Extra leads needed', ...scen.map((s) => cell(s.m.extra.leads, (v) => fmtNum(v)))] ] },
    ],
  });

  const controls = (
    <>
      <StartingValuesNote />
      <PresetBar presets={PRESETS} activeId={activePresetId} onLoad={loadPreset} onReset={reset} />
      <ControlGroup title={<><Target className="w-5 h-5 text-slate-500" /> Target and pipeline</>}>
        <ControlSlider label="Revenue Target for the Period" value={inputs.target} min={10000} max={20000000} step={10000} setter={setter('target')} prefix="$" tooltip="New bookings you need to close in the period (a quarter or a year)." />
        <ControlSlider label="Already Closed" value={inputs.closedWon} min={0} max={20000000} step={10000} setter={setter('closedWon')} prefix="$" tooltip="Bookings already closed in this period." />
        <ControlSlider label="Open Qualified Pipeline" value={inputs.openPipeline} min={0} max={50000000} step={50000} setter={setter('openPipeline')} prefix="$" tooltip="Value of open opportunities that are truly qualified and can close in the period." />
        <ControlSlider label="Average Deal Size" value={inputs.dealSize} min={500} max={1000000} step={500} setter={setter('dealSize')} prefix="$" tooltip="Average value of a closed deal." />
      </ControlGroup>
      <ControlGroup title={<><TrendingUp className="w-5 h-5 text-slate-500" /> Your conversion rates</>}>
        <ControlSlider label="Win Rate" value={inputs.winRate} min={3} max={80} setter={setter('winRate')} suffix="%" tooltip="Share of qualified opportunities that end up won." />
        <ControlSlider label="Meeting to Opportunity" value={inputs.oppRate} min={5} max={100} setter={setter('oppRate')} suffix="%" tooltip="Share of first meetings that become a qualified opportunity." />
        <ControlSlider label="Lead to Meeting" value={inputs.meetingRate} min={0.5} max={40} step={0.5} setter={setter('meetingRate')} suffix="%" tooltip="Share of leads that book a first meeting." />
        <AdvancedGroup summary={`${inputs.haircut}% of pipeline not real · cycle ${inputs.salesCycle} days · ${inputs.daysLeft} days left`}>
          <ControlSlider label="Share of Pipeline That Is Not Real" value={inputs.haircut} min={0} max={70} step={5} setter={setter('haircut')} suffix="%" tooltip="Stale or unqualified deals still sitting in the CRM. They are removed before the math." />
          <ControlSlider label="Sales Cycle" value={inputs.salesCycle} min={7} max={365} step={1} setter={setter('salesCycle')} suffix=" d" tooltip="Typical days from first meeting to closed deal." />
          <ControlSlider label="Days Left in the Period" value={inputs.daysLeft} min={0} max={365} step={1} setter={setter('daysLeft')} suffix=" d" tooltip="Days until the period ends. Used to check whether new pipeline can still close in time." />
        </AdvancedGroup>
      </ControlGroup>
    </>
  );

  const results = (
    <>
      <VerdictCard verdict={verdict} />
      <KpiGrid items={[
        { label: 'Pipeline coverage', value: m.coverage === null ? 'Met' : fmtX(m.coverage), tone: m.coverage === null || m.coverage >= m.requiredCoverage ? 'good' : (m.attainment >= 70 ? 'mixed' : 'bad'), note: `You need ${fmtX(m.requiredCoverage)} at a ${inputs.winRate}% win rate.` },
        { label: 'On track for', value: fmtPct(m.attainment), tone: m.attainment >= 100 ? 'good' : (m.attainment >= 70 ? 'mixed' : 'bad'), note: 'Share of target, expected value.' },
        { label: 'Expected shortfall', value: fmtMoney(m.gap), tone: m.gap === 0 ? 'good' : 'bad', note: m.gap === 0 ? 'No gap expected.' : `${fmtMoney(m.extraPipeline)} more pipeline closes it.` },
      ]} />
      <Card title="Pipeline you have against pipeline you need" icon={<Target className="w-5 h-5 text-slate-700" />} note="The blue bar is your real pipeline. If it is shorter than the dark bar, you do not have enough at your current win rate.">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} layout="vertical" margin={{ top: 8, right: 70, left: 8, bottom: 8 }} barCategoryGap="28%">
              <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v) => fmtMoney(v)} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={170} axisLine={false} tickLine={false} tick={{ fill: '#0B1120', fontWeight: 700, fontSize: 12 }} />
              <RechartsTooltip formatter={(v) => [fmtMoney(v), 'Value']} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
              <Bar dataKey="value" radius={6} barSize={30}>
                {chart.map((c) => <Cell key={c.name} fill={c.color} />)}
                <LabelList dataKey="value" position="right" formatter={(v) => fmtMoney(v)} style={{ fill: '#0B1120', fontWeight: 700, fontSize: 12 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="What it takes to close" icon={<TrendingUp className="w-5 h-5 text-slate-700" />} note="Worked backwards from deals to leads with your own conversion rates. The shortfall column is only what you are missing on top of the pipeline you already have.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-600"><th className="py-2 pr-3 font-bold">Stage</th><th className="py-2 px-3 font-bold text-right">From scratch</th><th className="py-2 px-3 font-bold text-right">Shortfall only</th></tr></thead>
            <tbody>
              {[['Leads', 'leads', 0], ['Meetings', 'meetings', 0], ['Qualified opportunities', 'opps', 0], ['Deals won', 'deals', 1]].map(([label, key, d]) => (
                <tr key={key} className="border-t border-slate-100"><td className="py-2 pr-3 text-slate-700">{label}</td><td className="py-2 px-3 text-right font-bold tabular-nums">{fmtNum(m.fromScratch[key], d)}</td><td className="py-2 px-3 text-right font-bold tabular-nums">{fmtNum(m.extra[key], d)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-slate-700">One lead in {fmtNum(100 / m.leadToWin, 0)} becomes a won deal ({m.leadToWin.toFixed(1)}% overall).{!m.timingOk && m.gap > 0 && <> <strong>Timing:</strong> your sales cycle ({inputs.salesCycle} days) is longer than the time left ({inputs.daysLeft} days), so extra leads now will mostly close next period.</>}</p>
      </Card>

      <CollapsibleSection title="Scenarios and sensitivity" icon={<Target className="w-5 h-5 text-slate-700" />} locked={!isUnlocked} onUnlock={openUnlock}>
        <div className="space-y-6">
          <div>
            <p className="text-sm text-slate-600 mb-3">Illustrative cases, not forecasts. Pessimistic: win rate -20%, 15 more points of pipeline not real, lead and meeting conversion down 10 to 15%. Optimistic: win rate +15%, 10 fewer points not real, conversion up 10%.</p>
            <ScenarioTable columns={scen.map((s) => s.label)} rows={[
              { label: 'On track for', values: scen.map((s) => fmtPct(s.m.attainment)) },
              { label: 'Expected to close', values: scen.map((s) => fmtMoney(s.m.expected)) },
              { label: 'Coverage', values: scen.map((s) => (s.m.coverage === null ? 'Met' : fmtX(s.m.coverage))) },
              { label: 'Extra leads needed', values: scen.map((s) => fmtNum(s.m.extra.leads)) },
            ]} />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">What moves the result the most</h4>
            <p className="text-sm text-slate-600 mb-2">Each bar shows how the share of target you are on track for changes when that input moves by a fixed, illustrative margin. The margins are not benchmarks.</p>
            <TornadoChart rows={tor} format={(v) => `${v > 0 ? '+' : ''}${Math.round(v)} pts`} />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Benchmarks and sources" icon={<BookOpen className="w-5 h-5 text-slate-500" />} locked={!isUnlocked} onUnlock={openUnlock}>
        <BenchmarkList items={BENCH(inputs, m)} planning="We found no reliable public benchmark for lead to meeting or meeting to opportunity conversion, deal size or sales cycle. They vary a lot by deal size and sales motion, so use your own CRM data." />
      </CollapsibleSection>

      <ExportPanel isUnlocked={isUnlocked} onUnlock={openUnlock} onPdf={() => downloadPdf(report())} onXlsx={() => downloadXlsx(report())} onShare={copyShareLink} />
      <HowToRead items={HOW} />
    </>
  );

  return (
    <div className="space-y-8">
      <ToolHeader eyebrow="Sales and RevOps" title="Pipeline and" accent="Funnel Planner" blurb="Check whether your pipeline is enough to hit the number, and work out how many leads, meetings and opportunities you need if it is not." />
      <ToolLayout controls={controls} results={results} />
    </div>
  );
}
