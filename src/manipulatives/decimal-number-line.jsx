import { useMemo, useState } from 'react'

const clampHundredths = (value) => {
  const parsed = parseInt(value, 10)
  if (Number.isNaN(parsed)) return 0
  return Math.max(0, Math.min(100, parsed))
}

const parseDecimalInput = (value) => {
  const parsed = parseFloat(value)
  if (Number.isNaN(parsed)) return 0
  return Math.max(0, Math.min(100, Math.round(parsed * 100)))
}

const formatDecimal = (hundredths) => (hundredths / 100).toFixed(2)

const markerPosition = (hundredths) => 60 + (hundredths / 100) * 620

export default function DecimalNumberLine() {
  const [pointA, setPointA] = useState(35)
  const [pointB, setPointB] = useState(72)

  const comparison = useMemo(() => {
    if (pointA === pointB) return `${formatDecimal(pointA)} = ${formatDecimal(pointB)}`
    if (pointA > pointB) return `${formatDecimal(pointA)} > ${formatDecimal(pointB)}`
    return `${formatDecimal(pointA)} < ${formatDecimal(pointB)}`
  }, [pointA, pointB])

  const roundedA = (Math.round(pointA / 10) / 10).toFixed(1)
  const roundedB = (Math.round(pointB / 10) / 10).toFixed(1)

  return (
    <div className="box-border flex h-full flex-col bg-slate-50 px-8 py-5 text-slate-700">
      <div className="mb-4 flex shrink-0 items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            Decimal number line
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Place decimals from 0 to 1, compare them, and round to tenths.
          </p>
        </div>

        <div className="rounded bg-slate-900 px-4 py-2 text-right text-white">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
            Compare
          </div>
          <div className="text-xl font-bold tabular-nums">{comparison}</div>
        </div>
      </div>

      <div className="rounded border border-slate-200 bg-white p-5 shadow-sm">
        <svg width="700" height="210" viewBox="0 0 740 210" className="mx-auto block">
          <line x1="60" y1="110" x2="680" y2="110" stroke="#334155" strokeWidth="3" />

          {Array.from({ length: 101 }, (_, hundredth) => {
            const x = markerPosition(hundredth)
            const isTenth = hundredth % 10 === 0
            const isHalf = hundredth === 50

            return (
              <g key={hundredth}>
                <line
                  x1={x}
                  y1={isTenth ? 92 : 102}
                  x2={x}
                  y2={isTenth ? 128 : 118}
                  stroke={isTenth ? '#334155' : '#cbd5e1'}
                  strokeWidth={isTenth ? 2 : 1}
                />
                {isTenth && (
                  <text
                    x={x}
                    y="148"
                    textAnchor="middle"
                    className="fill-slate-600 text-[11px] font-semibold"
                  >
                    {(hundredth / 100).toFixed(1)}
                  </text>
                )}
                {isHalf && (
                  <text
                    x={x}
                    y="82"
                    textAnchor="middle"
                    className="fill-slate-400 text-[10px] font-semibold"
                  >
                    midpoint
                  </text>
                )}
              </g>
            )
          })}

          <line
            x1={markerPosition(pointA)}
            y1="48"
            x2={markerPosition(pointA)}
            y2="110"
            stroke="#2563eb"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <circle cx={markerPosition(pointA)} cy="48" r="15" fill="#2563eb" />
          <text
            x={markerPosition(pointA)}
            y="53"
            textAnchor="middle"
            className="fill-white text-xs font-bold"
          >
            A
          </text>
          <text
            x={markerPosition(pointA)}
            y="28"
            textAnchor="middle"
            className="fill-blue-700 text-sm font-bold"
          >
            {formatDecimal(pointA)}
          </text>

          <line
            x1={markerPosition(pointB)}
            y1="172"
            x2={markerPosition(pointB)}
            y2="110"
            stroke="#dc2626"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
          <circle cx={markerPosition(pointB)} cy="172" r="15" fill="#dc2626" />
          <text
            x={markerPosition(pointB)}
            y="177"
            textAnchor="middle"
            className="fill-white text-xs font-bold"
          >
            B
          </text>
          <text
            x={markerPosition(pointB)}
            y="200"
            textAnchor="middle"
            className="fill-red-700 text-sm font-bold"
          >
            {formatDecimal(pointB)}
          </text>
        </svg>
      </div>

      <div className="mt-4 grid shrink-0 grid-cols-[1fr_1fr_190px] gap-4">
        <label className="rounded border border-blue-200 bg-blue-50 p-3 text-xs font-semibold text-blue-900">
          Point A
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={formatDecimal(pointA)}
            onChange={(event) => setPointA(parseDecimalInput(event.target.value))}
            className="mt-2 block h-8 w-24 rounded border border-blue-200 bg-white px-2 text-center text-sm font-bold tabular-nums text-blue-900 outline-none focus:border-blue-500"
            aria-label="Point A decimal"
          />
          <input
            type="range"
            min="0"
            max="100"
            value={pointA}
            onChange={(event) => setPointA(clampHundredths(event.target.value))}
            className="mt-3 w-full accent-blue-600"
            aria-label="Point A slider"
          />
        </label>

        <label className="rounded border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-900">
          Point B
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={formatDecimal(pointB)}
            onChange={(event) => setPointB(parseDecimalInput(event.target.value))}
            className="mt-2 block h-8 w-24 rounded border border-red-200 bg-white px-2 text-center text-sm font-bold tabular-nums text-red-900 outline-none focus:border-red-500"
            aria-label="Point B decimal"
          />
          <input
            type="range"
            min="0"
            max="100"
            value={pointB}
            onChange={(event) => setPointB(clampHundredths(event.target.value))}
            className="mt-3 w-full accent-red-600"
            aria-label="Point B slider"
          />
        </label>

        <div className="rounded border border-slate-200 bg-white p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Nearest tenth
          </div>
          <div className="mt-2 space-y-1 text-sm font-semibold tabular-nums text-slate-700">
            <div>A rounds to {roundedA}</div>
            <div>B rounds to {roundedB}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
