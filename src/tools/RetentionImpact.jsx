import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Target, BookOpen } from 'lucide-react';
import { ControlSlider, ToolHeader, PresetBar, StartingValuesNote, VerdictCard, KpiGrid, ToolLayout, ControlGroup, AdvancedGroup, Card, CollapsibleSection, ScenarioTable, TornadoChart, BenchmarkList, ExportPanel, HowToRead } from '../shared/ui.jsx';
import { fmtMoney, signedMoney, fmtPct1, cell } from '../shared/format.js';
import { useToolState } from '../shared/toolstate.js';
import { useUnlock } from '../shared/unlock.jsx';
import { tornado } from '../shared/sensitivity.js';
import { downloadPdf, downloadXlsx, sensSection, benchSection } from '../shared/report.js';
import { DEFAULTS, LIMITS, PRESETS, model, verdictFor, SCENARIOS, SENS, BENCH, HOW } from './retentionImpact.logic.js';

export default function RetentionImpact() {
  const { inputs, setter, reset, loadPreset, activePresetId, copyShareLink } = useToolState({ defaults: DEFAULTS, limits: LIMITS, presets: PRESETS });
  const { isUnlocked, openUnlock } = useUnlock();
  const m = useMemo(() => model(inputs), [inputs]);
  const verdict = verdictFor(inputs, m);
  const scen = useMemo(() => SCENARIOS.map((s) => ({ label: s.label, m: model(s.apply(inputs)) })), [inputs]);
  const tor = useMemo(() => tornado(inputs, SENS, (x) => model(x).arr3), [inputs]);
  const showProgram = inputs.programCost > 0 && inputs.programReduction > 0;

  const report = () => ({
    title: 'Retention and NRR Impact', fileName: 'Retention_Impact', verdict: `${verdict.headline} ${verdict.detail}`,
    sections: [
      { heading: 'Assumptions', rows: [
        ['Starting ARR', cell(inputs.arr, 'money')], ['Annual churn', cell(inputs.churn, 'pp')], ['Annual downgrades', cell(inputs.contraction, 'pp')], ['Annual expansion', cell(inputs.expansion, 'pp')],
        ['New revenue added per year', cell(inputs.newArr, 'money')], ['Gross margin', cell(inputs.grossMargin, 'pp')], ['Retention program cost per year', cell(inputs.programCost, 'money')], ['Program churn reduction (points)', inputs.programReduction] ] },
      { heading: 'Results', rows: [
        ['Gross revenue retention (GRR)', cell(m.grr, 'pp')], ['Net revenue retention (NRR)', cell(m.nrr, 'pp')], ['Change in ARR from existing customers per year', cell(m.existingChange, 'money')],
        ['New revenue needed to stand still per year', cell(m.newNeededToStandStill, 'money')], ['ARR in year 3', cell(m.arr3, 'money')], ['Value of 1 churn point after 3 years (ARR)', cell(m.pointArr3, 'money')] ] },
      { heading: 'Retention program (3 years)', rows: [
        ['Extra ARR in year 3', cell(m.incArr3, 'money')], ['Extra gross profit', cell(m.incGp, 'money')], ['Program cost', cell(m.cost3, 'money')], ['Net', cell(m.programNet, 'money')],
        ['ROI', cell(m.programRoi, 'pp0')], ['Churn points needed to break even', cell(m.breakEvenPts, 'num1')] ] },
      { heading: 'ARR by year', head: ['Year', 'Base case', 'With program', 'Existing customers only'], rows: m.series.map((s) => [s.year, cell(s.base, 'money'), cell(s.program, 'money'), cell(s.existing, 'money')]) },
      { heading: 'Scenarios', head: ['Result', ...scen.map((s) => s.label)], rows: [
        ['NRR', ...scen.map((s) => cell(s.m.nrr, 'pp'))], ['GRR', ...scen.map((s) => cell(s.m.grr, 'pp'))], ['ARR in year 3', ...scen.map((s) => cell(s.m.arr3, 'money'))], ['Program net over 3 years', ...scen.map((s) => cell(s.m.programNet, 'money'))] ] },
      sensSection(tor, 'ARR in year 3 (USD)', 'money'),
      benchSection(BENCH(inputs, m)),
    ],
  });

  const controls = (
    <>
      <StartingValuesNote />
      <PresetBar presets={PRESETS} activeId={activePresetId} onLoad={loadPreset} onReset={reset} />
      <ControlGroup title={<><TrendingUp className="w-5 h-5 text-slate-500" /> Your revenue base</>}>
        <ControlSlider label="Starting ARR" value={inputs.arr} min={50000} max={100000000} step={50000} setter={setter('arr')} prefix="$" tooltip="Annual recurring revenue you have today." />
        <ControlSlider label="Annual Churn (lost customers)" value={inputs.churn} min={0} max={50} step={0.5} setter={setter('churn')} suffix="%" tooltip="Share of starting ARR lost to customers who cancel in a year." />
        <ControlSlider label="Annual Downgrades" value={inputs.contraction} min={0} max={30} step={0.5} setter={setter('contraction')} suffix="%" tooltip="Share of starting ARR lost to customers who stay but pay less." />
        <ControlSlider label="Annual Expansion" value={inputs.expansion} min={0} max={60} step={0.5} setter={setter('expansion')} suffix="%" tooltip="Share of starting ARR added by upsell and cross-sell to existing customers." />
        <ControlSlider label="New Revenue Won per Year" value={inputs.newArr} min={0} max={50000000} step={50000} setter={setter('newArr')} prefix="$" tooltip="ARR from new customers you expect to win each year." />
        <AdvancedGroup summary={`Gross margin ${inputs.grossMargin}%`}>
          <ControlSlider label="Gross Margin" value={inputs.grossMargin} min={10} max={100} setter={setter('grossMargin')} suffix="%" tooltip="Used to turn the extra revenue a retention program keeps into gross profit." />
        </AdvancedGroup>
      </ControlGroup>
      <ControlGroup title={<><Target className="w-5 h-5 text-slate-500" /> Test a retention program</>}>
        <ControlSlider label="Program Cost per Year" value={inputs.programCost} min={0} max={2000000} step={10000} setter={setter('programCost')} prefix="$" tooltip="What the program costs each year: people, tools, incentives. Set it to 0 to leave the program out." />
        <ControlSlider label="Churn Points Removed" value={inputs.programReduction} min={0} max={15} step={0.5} setter={setter('programReduction')} suffix=" pts" tooltip="How many points of annual churn you expect it to remove. Be honest here: this is the number a CFO will question." />
      </ControlGroup>
    </>
  );

  const results = (
    <>
      <VerdictCard verdict={verdict} />
      <KpiGrid items={[
        { label: 'Net revenue retention', value: fmtPct1(m.nrr), tone: m.nrr >= 100 ? 'good' : (m.nrr >= 90 ? 'mixed' : 'bad'), note: 'Existing customers, before new logos.' },
        { label: 'Gross retention', value: fmtPct1(m.grr), tone: m.grr >= 90 ? 'good' : (m.grr >= 80 ? 'mixed' : 'bad'), note: 'Revenue kept before upsell.' },
        { label: 'ARR in 3 years', value: fmtMoney(m.arr3), note: `${m.growth3 >= 0 ? '+' : ''}${Math.round(m.growth3)}% from today.` },
        { label: 'Value of 1 churn point', value: fmtMoney(m.pointArr3), note: 'Extra ARR after 3 years.' },
      ]} />
      <Card title="Where your revenue is heading" icon={<TrendingUp className="w-5 h-5 text-slate-700" />} note="ARR over 3 years. The grey line is your existing customers alone, with no new customers. The gap to the red line is what you rely on new sales for.">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={m.series} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" tickFormatter={(v) => (v === 0 ? 'Today' : `Year ${v}`)} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tickFormatter={(v) => fmtMoney(v)} axisLine={false} tickLine={false} width={74} tick={{ fill: '#64748b', fontSize: 12 }} />
              <RechartsTooltip labelFormatter={(v) => (v === 0 ? 'Today' : `Year ${v}`)} formatter={(v, n) => [fmtMoney(v), n]} />
              <Legend />
              <Line type="monotone" dataKey="existing" name="Existing customers only" stroke="#94a3b8" strokeWidth={3} strokeDasharray="5 4" dot={false} />
              <Line type="monotone" dataKey="base" name="With new customers" stroke="#f52e01" strokeWidth={3} dot={{ r: 3 }} />
              {showProgram && <Line type="monotone" dataKey="program" name="With retention program" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      {showProgram && (
        <Card title="Does the retention program pay for itself?" icon={<Target className="w-5 h-5 text-slate-700" />} note={`A program costing ${fmtMoney(inputs.programCost)} a year that removes ${inputs.programReduction} points of churn, over 3 years.`}>
          <KpiGrid items={[
            { label: 'Extra gross profit kept', value: fmtMoney(m.incGp), note: `${fmtMoney(m.incArr3)} more ARR in year 3.` },
            { label: 'Program cost', value: fmtMoney(m.cost3), note: '3 years.' },
            { label: 'Net result', value: signedMoney(m.programNet), tone: m.programNet >= 0 ? 'good' : 'bad', note: m.programRoi === null ? '' : `Return of ${Math.round(m.programRoi)}% on cost.` },
          ]} />
          <p className="mt-3 text-sm text-slate-700">{m.breakEvenPts === null ? 'Even removing all churn would not pay this program back in 3 years.' : <>To pay for itself, the program has to remove at least <strong>{m.breakEvenPts.toFixed(1)} points</strong> of churn. You assumed {inputs.programReduction}.</>}</p>
        </Card>
      )}

      <CollapsibleSection title="Scenarios and sensitivity" icon={<Target className="w-5 h-5 text-slate-700" />} locked={!isUnlocked} onUnlock={openUnlock}>
        <div className="space-y-6">
          <div>
            <p className="text-sm text-slate-600 mb-3">Illustrative cases, not forecasts. Pessimistic: churn +3 points, expansion -3, program works half as well. Optimistic: churn -2 points, expansion +3, program works 25% better.</p>
            <ScenarioTable columns={scen.map((s) => s.label)} rows={[
              { label: 'Net revenue retention', values: scen.map((s) => fmtPct1(s.m.nrr)) },
              { label: 'Gross retention', values: scen.map((s) => fmtPct1(s.m.grr)) },
              { label: 'ARR in year 3', values: scen.map((s) => fmtMoney(s.m.arr3)) },
              ...(showProgram ? [{ label: 'Program net over 3 years', values: scen.map((s) => signedMoney(s.m.programNet)) }] : []),
            ]} />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">What moves ARR in year 3 the most</h4>
            <p className="text-sm text-slate-600 mb-2">Each bar shows how ARR in year 3 changes when that input moves by a fixed, illustrative margin. The margins are not benchmarks.</p>
            <TornadoChart rows={tor} format={(v) => signedMoney(v)} />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Benchmarks and sources" icon={<BookOpen className="w-5 h-5 text-slate-500" />} locked={!isUnlocked} onUnlock={openUnlock}>
        <BenchmarkList items={BENCH(inputs, m)} planning="We could not verify a public median for gross revenue retention, or reliable benchmarks for annual churn, downgrades, expansion or the effect of a retention program. They depend on contract size and market, and program effects are the most uncertain input here, so back them with your own cohort data." />
      </CollapsibleSection>

      <ExportPanel isUnlocked={isUnlocked} onUnlock={openUnlock} onPdf={() => downloadPdf(report())} onXlsx={() => downloadXlsx(report())} onShare={copyShareLink} />
      <HowToRead items={HOW} />
    </>
  );

  return (
    <div className="space-y-8">
      <ToolHeader eyebrow="Customer Success and Finance" title="Retention and" accent="NRR Impact" blurb="See what churn is costing you, where your revenue is heading, and whether a retention program is worth what it costs." />
      <ToolLayout controls={controls} results={results} />
    </div>
  );
}
