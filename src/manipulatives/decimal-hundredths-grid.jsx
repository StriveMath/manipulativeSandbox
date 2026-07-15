import { useState } from 'react'

const maxHundredths = 200

const clampHundredths = (value) => {
  const parsed = parseInt(value, 10)
  if (Number.isNaN(parsed)) return 0
  return Math.max(0, Math.min(maxHundredths, parsed))
}

function ValueCard({ label, children, colorClass, stamp }) {
  return (
    <div
      className={`place-value-refresh flex items-center justify-between rounded px-3 py-2 ${colorClass}`}
      key={`${label}-${stamp}`}
    >
      <span className="font-semibold">{label}</span>
      <span className="font-bold tabular-nums">{children}</span>
    </div>
  )
}

function HundredGrid({ gridIndex, shaded, onShade, stamp }) {
  const localShaded = Math.min(100, Math.max(0, shaded))
  const isCompleteWhole = localShaded === 100
  const hasPartialHundredths = localShaded > 0 && !isCompleteWhole

  return (
    <div
      className={`rounded border p-2 shadow-sm transition ${
        isCompleteWhole
          ? 'border-emerald-300 bg-emerald-50'
          : hasPartialHundredths
            ? 'border-blue-300 bg-blue-50'
            : 'border-slate-300 bg-white'
      }`}
    >
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>Whole {gridIndex + 1}</span>
        <span
          className={
            isCompleteWhole
              ? 'text-emerald-700'
              : hasPartialHundredths
                ? 'text-blue-700'
                : 'text-slate-500'
          }
        >
          {localShaded}/100
        </span>
      </div>
      <div className="grid grid-cols-10 gap-[2px]">
        {Array.from({ length: 100 }, (_, index) => {
          const globalIndex = gridIndex * 100 + index
          const squareNumber = globalIndex + 1
          const isShaded = index < localShaded
          const shadedColor = isCompleteWhole
            ? 'border-emerald-600 bg-emerald-500 hover:bg-emerald-600'
            : 'border-blue-600 bg-blue-500 hover:bg-blue-600'

          return (
            <button
              key={`${squareNumber}-${stamp}-${isShaded ? 'on' : 'off'}`}
              type="button"
              onClick={() => onShade(squareNumber)}
              className={`h-5 w-5 rounded-[2px] border transition ${
                isShaded
                  ? `hundredth-square-fill ${shadedColor}`
                  : 'border-slate-200 bg-slate-50 hover:bg-blue-100'
              }`}
              style={{
                '--hundredth-delay': `${Math.min(index, 99) * 4}ms`,
              }}
              aria-label={`Shade ${squareNumber} hundredths`}
            />
          )
        })}
      </div>
    </div>
  )
}

export default function DecimalHundredthsGrid() {
  const [hundredths, setHundredths] = useState(37)
  const [valueStamp, setValueStamp] = useState(0)

  const whole = Math.floor(hundredths / 100)
  const remainder = hundredths % 100
  const decimal = (hundredths / 100).toFixed(2)

  const updateHundredths = (value) => {
    setHundredths(clampHundredths(value))
    setValueStamp((stamp) => stamp + 1)
  }

  const shadeTo = (squareNumber) => {
    setHundredths((prev) => (prev === squareNumber ? 0 : squareNumber))
    setValueStamp((stamp) => stamp + 1)
  }

  return (
    <div className="box-border flex h-full flex-col bg-slate-50 px-8 py-5 text-slate-700">
      <div className="mb-4 flex shrink-0 items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            Decimal hundredths grid
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Shade hundredths to connect decimals, fractions, and percent.
          </p>
        </div>

        <label className="text-xs font-semibold text-slate-500">
          Hundredths shaded
          <input
            type="number"
            min="0"
            max={maxHundredths}
            value={hundredths}
            onChange={(event) => updateHundredths(event.target.value)}
            className="mt-1 block h-9 w-24 rounded border border-slate-300 bg-white px-2 text-center text-sm font-semibold text-slate-800 outline-none focus:border-blue-500"
          />
        </label>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_220px] gap-5">
        <div className="flex items-center justify-center gap-5">
          <HundredGrid
            gridIndex={0}
            shaded={Math.min(100, hundredths)}
            onShade={shadeTo}
            stamp={valueStamp}
          />
          <HundredGrid
            gridIndex={1}
            shaded={Math.max(0, hundredths - 100)}
            onShade={shadeTo}
            stamp={valueStamp}
          />
        </div>

        <aside className="flex flex-col rounded border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Value
          </div>
          <div
            className="place-value-refresh mt-2 rounded bg-blue-600 px-4 py-3 text-white"
            key={`decimal-${valueStamp}`}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-100">
              Decimal
            </div>
            <div className="text-3xl font-bold tabular-nums">{decimal}</div>
          </div>

          <div className="mt-3 space-y-2 text-sm">
            <ValueCard
              colorClass="bg-amber-50 text-amber-800"
              label="Fraction"
              stamp={valueStamp}
            >
              {hundredths}/100
            </ValueCard>
            <ValueCard
              colorClass="bg-violet-50 text-violet-800"
              label="Percent"
              stamp={valueStamp}
            >
              {hundredths}%
            </ValueCard>
            <ValueCard
              colorClass="bg-emerald-50 text-emerald-800"
              label="Mixed value"
              stamp={valueStamp}
            >
              <span className="text-emerald-700">{whole}</span>
              <span className="mx-1 text-slate-500">and</span>
              <span className="text-blue-700">{remainder}/100</span>
            </ValueCard>
          </div>

          <input
            type="range"
            min="0"
            max={maxHundredths}
            value={hundredths}
            onChange={(event) => updateHundredths(event.target.value)}
            className="mt-auto w-full accent-blue-600"
            aria-label="Adjust shaded hundredths"
          />
          <button
            type="button"
            onClick={() => updateHundredths(0)}
            className="mt-3 rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Clear grid
          </button>
        </aside>
      </div>
    </div>
  )
}
