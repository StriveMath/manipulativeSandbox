import { useMemo, useState } from 'react'

const clampTwoDigit = (value) => {
  const parsed = parseInt(value, 10)
  if (Number.isNaN(parsed)) return 0
  return Math.max(0, Math.min(99, parsed))
}

const splitNumber = (value) => {
  const tens = Math.floor(value / 10) * 10
  const ones = value % 10
  return { tens, ones }
}

const formatFactor = (value) => (value === 0 ? '' : value)

export default function AreaModelMultiplication() {
  const [leftFactor, setLeftFactor] = useState(23)
  const [topFactor, setTopFactor] = useState(14)

  const model = useMemo(() => {
    const left = splitNumber(leftFactor)
    const top = splitNumber(topFactor)
    const rows = [
      { id: 'top-tens', label: left.tens, size: left.tens, color: '#bfdbfe' },
      { id: 'top-ones', label: left.ones, size: left.ones, color: '#dbeafe' },
    ].filter((part) => part.size > 0)
    const columns = [
      { id: 'left-tens', label: top.tens, size: top.tens, color: '#fde68a' },
      { id: 'left-ones', label: top.ones, size: top.ones, color: '#fef3c7' },
    ].filter((part) => part.size > 0)

    const cells = rows.flatMap((row) =>
      columns.map((column) => ({
        id: `${row.id}-${column.id}`,
        row,
        column,
        product: row.label * column.label,
      }))
    )

    return {
      rows,
      columns,
      cells,
      total: leftFactor * topFactor,
    }
  }, [leftFactor, topFactor])

  const rowTotal = model.rows.reduce((sum, row) => sum + row.size, 0) || 1
  const columnTotal = model.columns.reduce((sum, column) => sum + column.size, 0) || 1

  return (
    <div className="box-border flex h-full flex-col bg-slate-50 px-8 py-5 text-slate-700">
      <div className="mb-4 flex shrink-0 items-start justify-between gap-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            Area model multiplication
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Break two-digit factors into tens and ones, then add the partial products.
          </p>
        </div>

        <div className="flex items-end gap-3">
          <label className="text-xs font-semibold text-slate-500">
            First factor
            <input
              type="number"
              min="0"
              max="99"
              value={leftFactor}
              onChange={(event) => setLeftFactor(clampTwoDigit(event.target.value))}
              className="mt-1 block h-9 w-20 rounded border border-slate-300 bg-white px-2 text-center text-sm font-semibold text-slate-800 outline-none focus:border-blue-500"
            />
          </label>
          <div className="pb-2 text-lg font-semibold text-slate-400">x</div>
          <label className="text-xs font-semibold text-slate-500">
            Second factor
            <input
              type="number"
              min="0"
              max="99"
              value={topFactor}
              onChange={(event) => setTopFactor(clampTwoDigit(event.target.value))}
              className="mt-1 block h-9 w-20 rounded border border-slate-300 bg-white px-2 text-center text-sm font-semibold text-slate-800 outline-none focus:border-blue-500"
            />
          </label>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_210px] gap-5">
        <div className="grid grid-cols-[56px_1fr] grid-rows-[36px_1fr]">
          <div />

          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: model.columns
                .map((column) => `${Math.max(18, (column.size / columnTotal) * 100)}fr`)
                .join(' '),
            }}
          >
            {model.columns.map((column) => (
              <div
                key={column.id}
                className="flex items-center justify-center rounded border border-amber-300 bg-amber-100 text-sm font-semibold text-amber-900"
              >
                {column.label}
              </div>
            ))}
          </div>

          <div
            className="grid gap-1"
            style={{
              gridTemplateRows: model.rows
                .map((row) => `${Math.max(18, (row.size / rowTotal) * 100)}fr`)
                .join(' '),
            }}
          >
            {model.rows.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-center rounded border border-blue-300 bg-blue-100 text-sm font-semibold text-blue-900"
              >
                {row.label}
              </div>
            ))}
          </div>

          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: model.columns
                .map((column) => `${Math.max(18, (column.size / columnTotal) * 100)}fr`)
                .join(' '),
              gridTemplateRows: model.rows
                .map((row) => `${Math.max(18, (row.size / rowTotal) * 100)}fr`)
                .join(' '),
            }}
          >
            {model.cells.map((cell) => (
              <div
                key={cell.id}
                className="flex min-h-24 flex-col items-center justify-center rounded border border-slate-300 bg-white text-center shadow-sm"
                style={{
                  background: `linear-gradient(135deg, ${cell.row.color}, ${cell.column.color})`,
                }}
              >
                <div className="text-sm font-semibold text-slate-700">
                  {cell.row.label} x {cell.column.label}
                </div>
                <div className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                  {cell.product}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="flex flex-col rounded border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Partial products
          </div>

          <div className="mt-3 space-y-2">
            {model.cells.map((cell) => (
              <div
                key={cell.id}
                className="flex items-center justify-between rounded bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="font-medium text-slate-600">
                  {cell.row.label} x {cell.column.label}
                </span>
                <span className="font-bold tabular-nums text-slate-800">
                  {cell.product}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-auto rounded bg-blue-600 px-4 py-3 text-white">
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-100">
              Product
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums">
              {formatFactor(leftFactor)} x {formatFactor(topFactor)} = {model.total}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
