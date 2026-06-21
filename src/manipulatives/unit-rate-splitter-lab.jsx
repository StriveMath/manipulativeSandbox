import { useMemo, useState } from 'react'

const cookie = '\u{1F36A}'
const jar = '\u{1FAD9}'
const maxVisibleCookies = 18

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function CookieDot({ faded = false, onClick, draggable = false, onDragStart, label = 'cookie' }) {
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs shadow-sm transition ${
        faded
          ? 'border-slate-200 bg-slate-100 grayscale opacity-45'
          : 'border-amber-300 bg-amber-100 hover:scale-110'
      }`}
      aria-label={label}
    >
      {cookie}
    </button>
  )
}

function CookiePile({ count, active = true, onCookieClick }) {
  const visibleCount = Math.min(count, maxVisibleCookies)

  return (
    <div className="flex min-h-[46px] flex-wrap content-center justify-center gap-0.5 rounded-2xl bg-white/70 p-1">
      {Array.from({ length: visibleCount }, (_, index) => (
        <CookieDot
          key={index}
          label="jar cookie"
          faded={!active}
          onClick={active ? onCookieClick : undefined}
        />
      ))}
      {count > maxVisibleCookies && (
        <span className="self-center rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-black text-white">
          +{count - maxVisibleCookies}
        </span>
      )}
      {count === 0 && (
        <span className="self-center text-[11px] font-black text-slate-400">0 cookies</span>
      )}
    </div>
  )
}

function JarCard({ index, count, active, editable, onDropCookie, onCookieClick }) {
  return (
    <div
      onDragOver={(event) => {
        if (editable) event.preventDefault()
      }}
      onDrop={(event) => {
        event.preventDefault()
        if (editable && event.dataTransfer.getData('text/plain') === 'cookie') {
          onDropCookie()
        }
      }}
      className={`flex min-h-0 flex-col rounded-2xl border-2 p-1.5 text-center transition ${
        active
          ? 'border-teal-300 bg-teal-50 shadow-md shadow-teal-100'
          : 'border-dashed border-slate-300 bg-slate-100 opacity-70 grayscale'
      } ${editable ? 'ring-4 ring-inset ring-amber-200' : ''}`}
    >
      <div className="flex items-center justify-between gap-1">
        <p className="truncate text-[11px] font-black uppercase tracking-wide text-slate-700">
          {jar} jar {index + 1}
        </p>
        <span
          className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${
            editable
              ? 'bg-amber-200 text-amber-900'
              : active
                ? 'bg-teal-200 text-teal-900'
                : 'bg-slate-200 text-slate-500'
          }`}
        >
          {editable ? 'tap cookie' : active ? 'filled' : 'locked'}
        </span>
      </div>

      <div className="mt-1 flex-1 rounded-2xl border-2 border-white/80 bg-white/50 p-1 shadow-inner">
        <CookiePile
          count={count}
          active={active}
          onCookieClick={editable ? onCookieClick : undefined}
        />
      </div>

      <p className="mt-1 rounded-xl bg-white/85 px-2 py-0.5 text-xs font-black text-slate-800">
        {count} cookies
      </p>
    </div>
  )
}

function SliderControl({ label, value, min, max, onChange }) {
  return (
    <label className="rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-amber-100">
      <div className="mb-0.5 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-900">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-amber-500"
      />
    </label>
  )
}

function EquationCard({ totalAmt, groups, group1Count, applied }) {
  const unitRate = totalAmt / groups
  const exactUnitRate = Number.isInteger(unitRate)
  const madeTotal = group1Count * groups
  const isPerfect = applied && madeTotal === totalAmt
  const statusText = !applied
    ? 'Build jar 1'
    : isPerfect
      ? 'Unit rate found'
      : madeTotal < totalAmt
        ? 'Too few'
        : 'Too many'

  return (
    <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center gap-1.5 rounded-2xl border-2 border-sky-100 bg-white p-2 shadow-sm">
      <div>
        <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Ratio</p>
        <p className="text-xl font-black leading-tight text-slate-900">({totalAmt} : {groups})</p>
        <p className="text-xs font-bold text-slate-500">{totalAmt} {'\u00F7'} {groups}</p>
      </div>
      <div className="rounded-full bg-sky-100 px-2.5 py-1.5 text-lg font-black text-sky-900">=</div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-wide text-teal-600">Unit Rate</p>
        <p className="text-xl font-black leading-tight text-teal-800">
          ({applied && isPerfect ? formatNumber(unitRate) : '?'} : 1)
        </p>
        <p className="text-xs font-bold text-slate-500">
          {applied && isPerfect ? `${formatNumber(unitRate)} \u00F7 1` : '? \u00F7 1'}
        </p>
      </div>
      <div className="col-span-3 rounded-2xl bg-slate-900 px-2 py-1 text-center text-xs font-black text-white">
        {statusText}
        {applied && !isPerfect && `: ${group1Count} in each jar makes ${madeTotal}`}
        {applied && isPerfect && `: ${totalAmt} \u00F7 ${groups} = ${formatNumber(unitRate)}`}
        {!exactUnitRate && ' \u2022 try a whole-cookie share'}
      </div>
    </div>
  )
}

export default function UnitRateSplitterLab() {
  const [totalAmt, setTotalAmt] = useState(20)
  const [groups, setGroups] = useState(4)
  const [group1Count, setGroup1Count] = useState(0)
  const [applied, setApplied] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)

  const madeTotal = group1Count * groups
  const isPerfect = applied && madeTotal === totalAmt
  const supplyLeft = Math.max(0, totalAmt - group1Count)

  const jarCounts = useMemo(
    () => Array.from({ length: groups }, (_, index) => {
      if (index === 0) return group1Count
      return isPerfect ? group1Count : 0
    }),
    [group1Count, groups, isPerfect],
  )

  const resetWork = () => {
    setGroup1Count(0)
    setApplied(false)
  }

  const updateTotal = (nextValue) => {
    setTotalAmt(nextValue)
    resetWork()
  }

  const updateGroups = (nextValue) => {
    setGroups(nextValue)
    resetWork()
  }

  const addCookie = () => {
    if (group1Count >= totalAmt) return
    setGroup1Count((current) => current + 1)
    setApplied(false)
  }

  const removeCookie = () => {
    setGroup1Count((current) => Math.max(0, current - 1))
    setApplied(false)
  }

  const applyToAll = () => {
    if (group1Count === 0) return
    setApplied(true)
  }

  return (
    <div className="h-[500px] w-[800px] overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-sky-50 p-2 text-slate-800">
      <div className="grid h-full grid-rows-[auto_1fr] gap-1.5 rounded-3xl bg-white/80 p-2.5 shadow-inner">
        <header className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-black leading-tight text-slate-950">
              {jar} Ratios - Unit rates {cookie}
            </h2>
            <p className="text-xs font-semibold text-slate-600">
              Put cookies in Jar 1. Apply the same share to every jar.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSoundEnabled((current) => !current)}
            className="rounded-full bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-700 shadow-sm ring-1 ring-slate-200"
          >
            {soundEnabled ? 'Sound on' : 'Sound off'}
          </button>
        </header>

        <main className="grid min-h-0 grid-rows-[84px_1fr_64px] gap-1.5">
          <section className="grid grid-cols-[185px_1fr] gap-1.5">
            <div className="grid gap-1.5">
              <SliderControl
                label="Total Cookies"
                min={1}
                max={48}
                value={totalAmt}
                onChange={updateTotal}
              />
              <SliderControl
                label="Jars"
                min={1}
                max={8}
                value={groups}
                onChange={updateGroups}
              />
            </div>
            <EquationCard
              totalAmt={totalAmt}
              groups={groups}
              group1Count={group1Count}
              applied={applied}
            />
          </section>

          <section className="min-h-0 rounded-2xl border-2 border-teal-100 bg-teal-50 p-1.5">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="text-[11px] font-black uppercase tracking-wide text-teal-800">
                Jar playground
              </p>
              <p className="truncate text-[11px] font-bold text-slate-600">
                Drag or click cookies to load Jar 1. Other jars unlock after Apply To All.
              </p>
            </div>
            <div
              className="grid h-[152px] gap-1.5"
              style={{ gridTemplateColumns: `repeat(${groups}, minmax(0, 1fr))` }}
            >
              {jarCounts.map((count, index) => (
                <JarCard
                  key={index}
                  index={index}
                  count={count}
                  editable={index === 0}
                  active={index === 0 || isPerfect}
                  onDropCookie={addCookie}
                  onCookieClick={removeCookie}
                />
              ))}
            </div>
          </section>

          <section className="grid grid-cols-[1fr_230px] items-center gap-1.5">
            <div className="rounded-2xl border-2 border-amber-100 bg-amber-50 p-1.5">
              <div className="mb-0.5 flex items-center justify-between">
                <p className="text-[11px] font-black uppercase tracking-wide text-amber-900">
                  Cookie Supply Drawer
                </p>
                <p className="text-[11px] font-bold text-amber-800">{supplyLeft} left</p>
              </div>
              <div className="flex h-[40px] flex-wrap content-center justify-center gap-0.5 overflow-hidden rounded-2xl bg-white/80 p-1">
                {Array.from({ length: Math.min(supplyLeft, 24) }, (_, index) => (
                  <CookieDot
                    key={index}
                    label="supply cookie"
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData('text/plain', 'cookie')}
                    onClick={addCookie}
                  />
                ))}
                {supplyLeft > 24 && (
                  <span className="self-center rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-black text-white">
                    +{supplyLeft - 24}
                  </span>
                )}
                {supplyLeft === 0 && (
                  <span className="self-center text-[11px] font-black text-slate-500">
                    No cookies left in the drawer
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={applyToAll}
                disabled={group1Count === 0}
                className="rounded-2xl bg-teal-600 px-2 py-3 text-xs font-black text-white shadow-sm transition hover:bg-teal-700 disabled:bg-slate-300"
              >
                Apply To All
              </button>
              <button
                type="button"
                onClick={resetWork}
                className="rounded-2xl bg-white px-2 py-3 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
