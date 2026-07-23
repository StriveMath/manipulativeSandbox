import { useMemo, useState } from 'react'

const colors = {
  page: '#F8F6F0',
  row: '#1E5F74',
  rowTint: '#E4F3F7',
  col: '#7B3F9E',
  colTint: '#F3EEFA',
  totals: '#5B2A86',
  association: '#8A2540',
  associationTint: '#FBE9ED',
  noAssociation: '#27500A',
  noAssociationTint: '#EAF3DE',
  border: '#E0DDD6',
  ink: '#1A1A2E',
}

const scenarios = [
  {
    name: 'Pets & Sport',
    rowLabel: 'Pet ownership',
    colLabel: 'Sport',
    rows: ['Owns a pet', 'No pet'],
    cols: ['Plays a sport', 'No sport'],
    counts: [[4, 1], [1, 4]],
    avatar: 'P',
  },
  {
    name: 'Homework & Grades',
    rowLabel: 'Homework',
    colLabel: 'Grade',
    rows: ['Does homework', 'Skips homework'],
    cols: ['Good grade', 'Poor grade'],
    counts: [[5, 1], [1, 3]],
    avatar: 'H',
  },
  {
    name: 'Breakfast & Focus',
    rowLabel: 'Breakfast',
    colLabel: 'Focus',
    rows: ['Eats breakfast', 'Skips breakfast'],
    cols: ['Focused in class', 'Not focused'],
    counts: [[3, 2], [3, 2]],
    avatar: 'B',
  },
  {
    name: 'Music & Study',
    rowLabel: 'Study sound',
    colLabel: 'Time',
    rows: ['Studies with music', 'Studies in silence'],
    cols: ['Finishes on time', 'Runs late'],
    counts: [[2, 3], [4, 1]],
    avatar: 'M',
  },
]

function percent(part, whole) {
  if (!whole) return 0
  return Math.round((part / whole) * 100)
}

function emptyCounts() {
  return [[0, 0], [0, 0]]
}

function buildRespondents(scenario) {
  const people = []
  scenario.counts.forEach((row, rowIndex) => {
    row.forEach((count, colIndex) => {
      for (let i = 0; i < count; i += 1) {
        people.push({
          rowIndex,
          colIndex,
          rowTrait: scenario.rows[rowIndex],
          colTrait: scenario.cols[colIndex],
        })
      }
    })
  })
  return people.sort((a, b) => (a.rowIndex * 3 + b.colIndex) - (b.rowIndex * 2 + a.colIndex))
}

function total(matrix) {
  return matrix.flat().reduce((sum, value) => sum + value, 0)
}

function rowTotal(matrix, rowIndex) {
  return matrix[rowIndex][0] + matrix[rowIndex][1]
}

function colTotal(matrix, colIndex) {
  return matrix[0][colIndex] + matrix[1][colIndex]
}

function resetSurvey(index) {
  return {
    scenarioIndex: index,
    counts: emptyCounts(),
    currentIndex: 0,
    feedback: 'Find where their row and column meet.',
    phase: 'build',
    showPercents: false,
    showHints: true,
  }
}

function CellButton({ children, highlighted, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[54px] rounded-lg border bg-white p-1.5 text-center transition hover:-translate-y-0.5 hover:shadow-md"
      style={{
        borderColor: highlighted ? colors.row : colors.border,
        background: highlighted ? colors.rowTint : '#ffffff',
      }}
    >
      {children}
    </button>
  )
}

function TraitPill({ children, color, tint }) {
  return (
    <span className="inline-flex rounded-full px-2.5 py-1 text-[13px] font-black leading-tight" style={{ color, background: tint }}>
      {children}
    </span>
  )
}

function AnalysisBar({ label, part, whole, pct, delay }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-[11px] font-black text-neutral-600">
        <span>{label}</span>
        <span>{pct}% ({part}/{whole})</span>
      </div>
      <div className="h-7 overflow-hidden rounded-full border bg-white" style={{ borderColor: colors.border }}>
        <div
          className="flex h-full items-center justify-end rounded-full px-2 text-xs font-black text-white transition-[width] duration-700"
          style={{
            width: `${pct}%`,
            minWidth: pct > 0 ? 32 : 0,
            background: colors.row,
            transitionDelay: `${delay}ms`,
          }}
        >
          {pct}%
        </div>
      </div>
    </div>
  )
}

export default function TwoWayTables() {
  const [state, setState] = useState(() => resetSurvey(0))
  const scenario = scenarios[state.scenarioIndex]
  const respondents = useMemo(() => buildRespondents(scenario), [scenario])
  const current = respondents[state.currentIndex]
  const placed = total(state.counts)
  const left = respondents.length - placed
  const complete = placed === respondents.length
  const firstRowTotal = rowTotal(state.counts, 0)
  const secondRowTotal = rowTotal(state.counts, 1)
  const firstPct = percent(state.counts[0][0], firstRowTotal)
  const secondPct = percent(state.counts[1][0], secondRowTotal)
  const gap = Math.abs(firstPct - secondPct)
  const hasAssociation = gap >= 15

  const pickCell = (rowIndex, colIndex) => {
    if (!current || state.phase !== 'build') return
    if (current.rowIndex !== rowIndex || current.colIndex !== colIndex) {
      setState((old) => ({
        ...old,
        feedback: `${current.rowTrait} and ${current.colTrait} belongs in the ${scenario.rows[current.rowIndex]} row and ${scenario.cols[current.colIndex]} column.`,
      }))
      return
    }
    setState((old) => {
      const nextCounts = old.counts.map((row) => [...row])
      nextCounts[rowIndex][colIndex] += 1
      const nextPlaced = total(nextCounts)
      return {
        ...old,
        counts: nextCounts,
        currentIndex: old.currentIndex + 1,
        feedback: nextPlaced === respondents.length ? 'All 10 people are sorted. Now compare row percentages.' : 'Correct. Pick the next cell.',
        phase: nextPlaced === respondents.length ? 'analyse' : 'build',
      }
    })
  }

  const newSurvey = () => {
    setState((old) => resetSurvey((old.scenarioIndex + 1) % scenarios.length))
  }

  const hint = state.phase === 'build'
    ? 'Find where their row and column meet - that is their cell.'
    : 'Do not compare raw counts. Compare the percentage within each row. Far apart = associated. Close = no link.'

  return (
    <div className="flex h-[500px] w-[800px] flex-col gap-1.5 overflow-hidden p-2 font-['Inter']" style={{ background: colors.page, color: colors.ink }}>
      <style>{`
        @keyframes personIn {
          from { transform: translateY(8px) scale(0.98); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>

      <section className="flex shrink-0 items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-black leading-tight">Two-Way Tables</h1>
          <p className="text-xs font-bold text-neutral-600">{scenario.name} · {placed}/10 sorted · {left} left</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setState((old) => ({ ...old, showHints: !old.showHints }))}
            className="rounded-full border px-3 py-1.5 text-xs font-black shadow-sm"
            style={{ borderColor: colors.row, color: state.showHints ? '#ffffff' : colors.row, background: state.showHints ? colors.row : '#ffffff' }}
          >
            {state.showHints ? 'Hints on' : 'Hints off'}
          </button>
          <button type="button" onClick={newSurvey} className="rounded-full border bg-white px-4 py-1.5 text-xs font-black shadow-sm" style={{ borderColor: colors.border, color: colors.totals }}>
            New survey
          </button>
        </div>
      </section>

      <section className="grid min-h-0 flex-1 grid-cols-[198px_1fr] gap-2">
        <div className="flex min-h-0 flex-col gap-1.5">
          <div className="rounded-xl border bg-white p-2.5 shadow-sm" style={{ borderColor: colors.border }}>
            <p className="mb-1.5 text-[11px] font-black uppercase tracking-wide text-neutral-500">Current respondent</p>
            {current && state.phase === 'build' ? (
              <div key={state.currentIndex} className="space-y-2" style={{ animation: 'personIn 180ms ease-out' }}>
                <div className="flex items-center gap-2">
                  <span className="grid h-11 w-11 place-items-center rounded-full text-xl font-black" style={{ color: colors.row, background: colors.rowTint }}>{scenario.avatar}</span>
                  <span className="text-sm font-black">Person {state.currentIndex + 1}</span>
                </div>
                <TraitPill color={colors.row} tint={colors.rowTint}>{current.rowTrait}</TraitPill>
                <TraitPill color={colors.col} tint={colors.colTint}>{current.colTrait}</TraitPill>
              </div>
            ) : (
              <div className="rounded-xl p-3 text-center text-sm font-black" style={{ color: colors.noAssociation, background: colors.noAssociationTint }}>
                Table complete
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-white p-2.5 text-[13px] font-bold leading-snug text-neutral-700" style={{ borderColor: colors.border }}>
            {state.feedback}
          </div>

          {state.showHints && (
            <div className="mt-auto rounded-xl border bg-white p-2.5 text-xs font-bold leading-snug text-neutral-600" style={{ borderColor: colors.border }}>
              {hint}
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-col gap-1.5">
          <div className="overflow-x-auto rounded-xl border bg-white p-1.5 shadow-sm" style={{ borderColor: colors.border }}>
            <div className="min-w-[470px]">
              <div className="grid grid-cols-[108px_1fr_1fr_66px] gap-1">
                <div className="rounded-lg p-1.5 text-center text-[11px] font-black uppercase tracking-wide" style={{ color: colors.row, background: colors.rowTint }}>
                  {scenario.rowLabel}
                </div>
                {scenario.cols.map((col) => (
                  <div key={col} className="rounded-lg p-1.5 text-center text-[11px] font-black" style={{ color: colors.col, background: colors.colTint }}>
                    {col}
                  </div>
                ))}
                <div className="rounded-lg p-1.5 text-center text-[11px] font-black" style={{ color: colors.totals, background: colors.colTint }}>
                  Total
                </div>

                {scenario.rows.map((row, rowIndex) => (
                  <div key={row} className="contents">
                    <div className="rounded-lg p-1.5 text-[13px] font-black" style={{ color: colors.row, background: colors.rowTint }}>
                      {row}
                    </div>
                    {scenario.cols.map((col, colIndex) => {
                      const rowSum = rowTotal(state.counts, rowIndex)
                      const cellPct = percent(state.counts[rowIndex][colIndex], rowSum)
                      return (
                        <CellButton
                          key={`${row}-${col}`}
                          highlighted={state.showHints && current?.rowIndex === rowIndex && current?.colIndex === colIndex && state.phase === 'build'}
                          onClick={() => pickCell(rowIndex, colIndex)}
                        >
                          <div className="text-xl font-black">{state.counts[rowIndex][colIndex]}</div>
                          {state.showPercents && state.phase === 'analyse' && <div className="text-[11px] font-black" style={{ color: colors.row }}>{cellPct}% of row</div>}
                        </CellButton>
                      )
                    })}
                    <div className="grid min-h-[54px] place-items-center rounded-lg p-1.5 text-center" style={{ color: colors.totals, background: colors.colTint }}>
                      <span className="text-xl font-black">{rowTotal(state.counts, rowIndex)}</span>
                    </div>
                  </div>
                ))}

                <div className="rounded-lg p-1.5 text-[13px] font-black" style={{ color: colors.totals, background: colors.colTint }}>Total</div>
                {[0, 1].map((colIndex) => (
                  <div key={`col-total-${colIndex}`} className="grid min-h-[42px] place-items-center rounded-lg p-1.5" style={{ color: colors.totals, background: colors.colTint }}>
                    <span className="text-lg font-black">{colTotal(state.counts, colIndex)}</span>
                  </div>
                ))}
                <div className="grid min-h-[42px] place-items-center rounded-lg p-1.5" style={{ color: '#ffffff', background: colors.totals }}>
                  <span className="text-lg font-black">{placed}</span>
                </div>
              </div>
            </div>
          </div>

          {complete ? (
            <div className="grid min-h-0 flex-1 grid-cols-[1fr_190px] gap-1.5">
              <div className="rounded-xl border bg-white p-2.5" style={{ borderColor: colors.border }}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <h2 className="text-[13px] font-black" style={{ color: colors.row }}>% of each row that {scenario.cols[0]}</h2>
                  <button
                    type="button"
                    onClick={() => setState((old) => ({ ...old, showPercents: !old.showPercents }))}
                    className="rounded-full border px-3 py-1 text-[11px] font-black"
                    style={{ borderColor: colors.col, color: colors.col, background: state.showPercents ? colors.colTint : '#ffffff' }}
                  >
                    Show % in table
                  </button>
                </div>
                <div className="space-y-2">
                  <AnalysisBar label={scenario.rows[0]} part={state.counts[0][0]} whole={firstRowTotal} pct={firstPct} delay={0} />
                  <AnalysisBar label={scenario.rows[1]} part={state.counts[1][0]} whole={secondRowTotal} pct={secondPct} delay={160} />
                </div>
              </div>

              <div className="rounded-xl border p-2.5" style={{
                borderColor: hasAssociation ? colors.noAssociation : colors.association,
                color: hasAssociation ? colors.noAssociation : colors.association,
                background: hasAssociation ? colors.noAssociationTint : colors.associationTint,
              }}>
                <p className="text-[11px] font-black uppercase tracking-wide">Verdict</p>
                <h2 className="mt-1 text-base font-black leading-tight">{hasAssociation ? 'There IS an association' : 'No real association'}</h2>
                <p className="mt-1.5 text-[13px] font-bold leading-snug">
                  {hasAssociation
                    ? `The row percentages differ by ${gap} points. Knowing one variable helps predict the other.`
                    : `The row percentages differ by only ${gap} points. Knowing one does not tell you much about the other.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border bg-white p-2.5 text-center text-sm font-black" style={{ borderColor: colors.border, color: colors.row }}>
              Build the table first. Every person belongs in exactly one cell.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
