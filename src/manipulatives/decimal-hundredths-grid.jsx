import { useState } from 'react'

const maxHundredths = 200

const clampHundredths = (value) => {
  const parsed = parseInt(value, 10)
  if (Number.isNaN(parsed)) return 0
  return Math.max(0, Math.min(maxHundredths, parsed))
}

function HundredGrid({ gridIndex, shaded, onShade }) {
  return (
    <div className="rounded border border-slate-300 bg-white p-2 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>Whole {gridIndex + 1}</span>
        <span>{Math.min(100, Math.max(0, shaded))}/100</span>
      </div>
      <div className="grid grid-cols-10 gap-[2px]">
        {Array.from({ length: 100 }, (_, index) => {
          const globalIndex = gridIndex * 100 + index
          const squareNumber = globalIndex + 1
          const isShaded = squareNumber <= shaded + gridIndex * 100

          return (
            <button
              key={squareNumber}
              type="button"
              onClick={() => onShade(squareNumber)}
              className={`h-5 w-5 rounded-[2px] border transition ${
                isShaded
                  ? 'border-blue-600 bg-blue-500 hover:bg-blue-600'
                  : 'border-slate-200 bg-slate-50 hover:bg-blue-100'
              }`}
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

  const whole = Math.floor(hundredths / 100)
  const remainder = hundredths % 100
  const decimal = (hundredths / 100).toFixed(2)

  const shadeTo = (squareNumber) => {
    setHundredths((prev) => (prev === squareNumber ? 0 : squareNumber))
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
            onChange={(event) => setHundredths(clampHundredths(event.target.value))}
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
          />
          <HundredGrid
            gridIndex={1}
            shaded={Math.max(0, hundredths - 100)}
            onShade={shadeTo}
          />
        </div>

        <aside className="flex flex-col rounded border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Value
          </div>
          <div className="mt-2 rounded bg-blue-600 px-4 py-3 text-white">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-100">
              Decimal
            </div>
            <div className="text-3xl font-bold tabular-nums">{decimal}</div>
          </div>

          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between rounded bg-slate-50 px-3 py-2">
              <span className="font-medium text-slate-500">Fraction</span>
              <span className="font-bold tabular-nums text-slate-800">
                {hundredths}/100
              </span>
            </div>
            <div className="flex items-center justify-between rounded bg-slate-50 px-3 py-2">
              <span className="font-medium text-slate-500">Percent</span>
              <span className="font-bold tabular-nums text-slate-800">
                {hundredths}%
              </span>
            </div>
            <div className="flex items-center justify-between rounded bg-slate-50 px-3 py-2">
              <span className="font-medium text-slate-500">Mixed value</span>
              <span className="font-bold tabular-nums text-slate-800">
                {whole} and {remainder}/100
              </span>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max={maxHundredths}
            value={hundredths}
            onChange={(event) => setHundredths(clampHundredths(event.target.value))}
            className="mt-auto w-full accent-blue-600"
            aria-label="Adjust shaded hundredths"
          />
          <button
            type="button"
            onClick={() => setHundredths(0)}
            className="mt-3 rounded border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Clear grid
          </button>
        </aside>
      </div>
    </div>
  )
}
