import React, { useEffect, useState } from 'react'
import { AlertCircle, RefreshCw, Trophy } from 'lucide-react'

function Strawberry({ x, y }: { x: number; y: number }) {
  return (
    <g style={{ transform: `translate(${x}px, ${y}px)` }}>
      <path
        d="M-6 -2 C-8 4, -4 10, 0 11 C4 10, 8 4, 6 -2 C4 -6, -4 -6, -6 -2 Z"
        fill="#ef4444"
        stroke="#b91c1c"
        strokeWidth="1"
      />
      <path d="M-4 -3 Q0 1 4 -3 L0 -7 Z" fill="#22c55e" />
    </g>
  )
}

function Orange({ x, y }: { x: number; y: number }) {
  return (
    <g style={{ transform: `translate(${x}px, ${y}px)` }}>
      <circle cx="0" cy="0" r="9" fill="#f97316" stroke="#c2410c" strokeWidth="1" />
      <path d="M0 -9 Q3 -13 6 -9 Q3 -6 0 -9" fill="#22c55e" />
    </g>
  )
}

function Apple({ x, y }: { x: number; y: number }) {
  return (
    <g style={{ transform: `translate(${x}px, ${y}px)` }}>
      <path
        d="M-8 -3 C-8 -10, -2 -10, 0 -6 C2 -10, 8 -10, 8 -3 C8 4, 4 9, 0 9 C-4 9, -8 4, -8 -3 Z"
        fill="#ef4444"
        stroke="#b91c1c"
        strokeWidth="1"
      />
      <path d="M0 -6 Q2 -10 4 -12" fill="none" stroke="#78350f" strokeWidth="1.5" />
      <path d="M0 -6 Q-3 -9 -6 -6 Q-3 -3 0 -6" fill="#22c55e" />
    </g>
  )
}

function Pear({ x, y }: { x: number; y: number }) {
  return (
    <g style={{ transform: `translate(${x}px, ${y}px)` }}>
      <path
        d="M-5 2 C-8 8, -5 12, 0 12 C5 12, 8 8, 5 2 C3 -4, 3 -8, 0 -8 C-3 -8, -3 -4, -5 2 Z"
        fill="#bef264"
        stroke="#65a30d"
        strokeWidth="1"
      />
      <path d="M0 -8 Q2 -12 4 -12" fill="none" stroke="#78350f" strokeWidth="1.5" />
    </g>
  )
}

const fruits = {
  strawberry: { name: 'Strawberry', weight: 1, Component: Strawberry },
  orange: { name: 'Orange', weight: 2, Component: Orange },
  apple: { name: 'Apple', weight: 3, Component: Apple },
  pear: { name: 'Pear', weight: 4, Component: Pear },
}

type FruitKey = keyof typeof fruits
type RecordRow = { leftCount: number; rightCount: number }
type Mode = 'explore' | 'challenge'
type Challenge = { left: FruitKey; right: FruitKey; needed: number } | null

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

const getFruitCoords = (index: number) => {
  let row = 0
  let capacity = 5
  let currentTotal = 0

  while (index >= currentTotal + capacity) {
    currentTotal += capacity
    row += 1
    capacity = row % 2 === 0 ? 5 : 4
  }

  const positionInRow = index - currentTotal
  const rowWidth = (capacity - 1) * 18
  const startX = -rowWidth / 2

  return {
    x: startX + positionInRow * 18,
    y: -10 - row * 15,
  }
}

export default function FruitBalanceLab() {
  const [leftCount, setLeftCount] = useState(1)
  const [rightCount, setRightCount] = useState(1)
  const [leftFruit, setLeftFruit] = useState<FruitKey>('orange')
  const [rightFruit, setRightFruit] = useState<FruitKey>('apple')
  const [records, setRecords] = useState<RecordRow[]>([])
  const [hintMessage, setHintMessage] = useState('')
  const [mode, setMode] = useState<Mode>('explore')
  const [challenge, setChallenge] = useState<Challenge>(null)

  const generateChallenge = () => {
    const fruitKeys = Object.keys(fruits) as FruitKey[]
    let f1 = fruitKeys[Math.floor(Math.random() * fruitKeys.length)]
    let f2 = fruitKeys[Math.floor(Math.random() * fruitKeys.length)]

    while (f1 === f2) {
      f2 = fruitKeys[Math.floor(Math.random() * fruitKeys.length)]
    }

    const w1 = fruits[f1].weight
    const w2 = fruits[f2].weight
    const g = gcd(w1, w2)
    const b1 = w2 / g
    const b2 = w1 / g
    const maxMult = Math.floor(25 / Math.max(b1, b2))
    const maxPossible = Math.max(2, Math.min(4, maxMult))
    const target = Math.floor(Math.random() * (maxPossible - 1)) + 2

    setLeftFruit(f1)
    setRightFruit(f2)
    setLeftCount(1)
    setRightCount(1)
    setRecords([])
    setChallenge({ left: f1, right: f2, needed: target })
  }

  useEffect(() => {
    setRecords([])
  }, [leftFruit, rightFruit])

  const weightL = leftCount * fruits[leftFruit].weight
  const weightR = rightCount * fruits[rightFruit].weight
  const diff = weightR - weightL
  const isBalanced = diff === 0 && leftCount > 0 && rightCount > 0
  const angle = Math.max(-20, Math.min(20, diff * 4))
  const g = gcd(fruits[leftFruit].weight, fruits[rightFruit].weight)
  const baseLeft = fruits[rightFruit].weight / g
  const baseRight = fruits[leftFruit].weight / g
  const LeftFruitComponent = fruits[leftFruit].Component
  const RightFruitComponent = fruits[rightFruit].Component

  const handleRecord = () => {
    if (!isBalanced) {
      setHintMessage('Try to make the scale balance first.')
      window.setTimeout(() => setHintMessage(''), 3000)
      return
    }

    if (!records.find((row) => row.leftCount === leftCount && row.rightCount === rightCount)) {
      setRecords([...records, { leftCount, rightCount }])
    }
    setHintMessage('')
  }

  return (
    <div className="flex h-[500px] w-[800px] overflow-hidden rounded-2xl border border-gray-300 bg-white font-sans shadow-xl">
      <section className="relative flex w-[520px] flex-col justify-between bg-slate-50">
        <div className="relative z-10 flex h-16 items-center justify-end px-6 pt-4">
          <div className="relative flex flex-col items-end">
            <button
              type="button"
              onClick={handleRecord}
              className={`rounded-lg border-2 px-5 py-2 font-bold shadow-sm transition-all duration-200 ${
                isBalanced
                  ? 'cursor-pointer border-blue-300 bg-blue-100 text-blue-800 hover:bg-blue-200 hover:shadow-md'
                  : 'cursor-pointer border-gray-200 bg-gray-100 text-gray-500'
              }`}
            >
              Record Values
            </button>

            <div
              className={`absolute right-0 top-12 mt-2 flex items-center gap-2 rounded border border-red-200 bg-red-100 px-3 py-2 text-sm font-medium text-red-700 shadow-md transition-opacity duration-300 ${
                hintMessage ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              <AlertCircle className="h-4 w-4" />
              {hintMessage}
            </div>
          </div>
        </div>

        <div className="flex flex-grow items-center justify-center">
          <svg width="520" height="300" className="overflow-visible">
            <g transform="translate(0, 10)">
              <rect x="210" y="280" width="100" height="15" fill="#ca8a04" rx="3" />
              <rect x="220" y="270" width="80" height="10" fill="#eab308" />
              <rect x="245" y="130" width="30" height="140" fill="#eab308" />
              <rect x="255" y="130" width="10" height="140" fill="#facc15" />
              <circle cx="260" cy="130" r="22" fill="#ca8a04" />
            </g>

            <g
              style={{
                transform: `rotate(${angle}deg)`,
                transformOrigin: '260px 140px',
                transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <rect x="130" y="136" width="260" height="8" fill="#4b5563" rx="4" />
              <circle cx="130" cy="140" r="5" fill="#fbbf24" />
              <circle cx="390" cy="140" r="5" fill="#fbbf24" />

              <g style={{ transform: 'translate(130px, 140px)' }}>
                <g
                  style={{
                    transform: `rotate(${-angle}deg)`,
                    transformOrigin: '0px 0px',
                    transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  <line x1="0" y1="0" x2="-45" y2="90" stroke="#9ca3af" strokeWidth="2" />
                  <line x1="0" y1="0" x2="45" y2="90" stroke="#9ca3af" strokeWidth="2" />
                  <path d="M-55 90 Q0 120 55 90 Z" fill="#9ca3af" stroke="#4b5563" strokeWidth="2" />
                  <g style={{ transform: 'translate(0, 90px)' }}>
                    {Array.from({ length: leftCount }).map((_, index) => {
                      const { x, y } = getFruitCoords(index)
                      return <LeftFruitComponent x={x} y={y} key={`left-${index}`} />
                    })}
                  </g>
                </g>
              </g>

              <g style={{ transform: 'translate(390px, 140px)' }}>
                <g
                  style={{
                    transform: `rotate(${-angle}deg)`,
                    transformOrigin: '0px 0px',
                    transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  <line x1="0" y1="0" x2="-45" y2="90" stroke="#9ca3af" strokeWidth="2" />
                  <line x1="0" y1="0" x2="45" y2="90" stroke="#9ca3af" strokeWidth="2" />
                  <path d="M-55 90 Q0 120 55 90 Z" fill="#9ca3af" stroke="#4b5563" strokeWidth="2" />
                  <g style={{ transform: 'translate(0, 90px)' }}>
                    {Array.from({ length: rightCount }).map((_, index) => {
                      const { x, y } = getFruitCoords(index)
                      return <RightFruitComponent x={x} y={y} key={`right-${index}`} />
                    })}
                  </g>
                </g>
              </g>
            </g>

            <g transform="translate(0, 10)">
              {isBalanced ? (
                <g style={{ transformOrigin: '260px 130px' }}>
                  <circle cx="260" cy="130" r="16" fill="#ffffff" stroke="#22c55e" strokeWidth="2.5" />
                  <path
                    d="M252 130 l5 5 l11 -12"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              ) : (
                <>
                  <circle cx="260" cy="130" r="14" fill="#eab308" />
                  <circle cx="260" cy="130" r="6" fill="#fefce8" />
                </>
              )}
            </g>
          </svg>
        </div>

        <div className="flex h-32 items-center justify-between border-t border-gray-300 bg-slate-200 px-6 py-2">
          <div className="flex w-1/2 flex-col items-center gap-1 border-r border-gray-300 pr-4">
            <select
              value={leftFruit}
              onChange={(event) => setLeftFruit(event.target.value as FruitKey)}
              disabled={mode === 'challenge'}
              className={`rounded border border-gray-300 px-2 py-1 text-sm font-medium shadow-sm outline-none ${
                mode === 'challenge'
                  ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                  : 'cursor-pointer bg-white text-gray-700 focus:ring-blue-500'
              }`}
            >
              {Object.entries(fruits).map(([key, fruit]) => (
                <option key={key} value={key}>
                  {fruit.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 text-lg font-bold text-gray-800">
              <svg width="20" height="20" viewBox="-12 -12 24 24">
                <LeftFruitComponent x={0} y={0} />
              </svg>
              {leftCount}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setLeftCount(Math.max(0, leftCount - 1))}
                className="flex h-8 w-8 items-center justify-center rounded border border-gray-400 bg-white font-bold text-gray-700 shadow-sm hover:bg-gray-100"
              >
                -
              </button>
              <input
                type="range"
                min="0"
                max="25"
                value={leftCount}
                onChange={(event) => setLeftCount(Number(event.target.value))}
                className="w-20 cursor-pointer accent-blue-500"
              />
              <button
                type="button"
                onClick={() => setLeftCount(Math.min(25, leftCount + 1))}
                className="flex h-8 w-8 items-center justify-center rounded border border-gray-400 bg-white font-bold text-gray-700 shadow-sm hover:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex w-1/2 flex-col items-center gap-1 pl-4">
            <select
              value={rightFruit}
              onChange={(event) => setRightFruit(event.target.value as FruitKey)}
              disabled={mode === 'challenge'}
              className={`rounded border border-gray-300 px-2 py-1 text-sm font-medium shadow-sm outline-none ${
                mode === 'challenge'
                  ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                  : 'cursor-pointer bg-white text-gray-700 focus:ring-blue-500'
              }`}
            >
              {Object.entries(fruits).map(([key, fruit]) => (
                <option key={key} value={key}>
                  {fruit.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 text-lg font-bold text-gray-800">
              <svg width="20" height="20" viewBox="-12 -12 24 24">
                <RightFruitComponent x={0} y={0} />
              </svg>
              {rightCount}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setRightCount(Math.max(0, rightCount - 1))}
                className="flex h-8 w-8 items-center justify-center rounded border border-gray-400 bg-white font-bold text-gray-700 shadow-sm hover:bg-gray-100"
              >
                -
              </button>
              <input
                type="range"
                min="0"
                max="25"
                value={rightCount}
                onChange={(event) => setRightCount(Number(event.target.value))}
                className="w-20 cursor-pointer accent-blue-500"
              />
              <button
                type="button"
                onClick={() => setRightCount(Math.min(25, rightCount + 1))}
                className="flex h-8 w-8 items-center justify-center rounded border border-gray-400 bg-white font-bold text-gray-700 shadow-sm hover:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </section>

      <aside className="flex w-[280px] flex-col bg-white">
        <div className="p-4 pb-3">
          <h1 className="text-xl font-bold leading-tight text-gray-900">Equivalent Ratios</h1>
        </div>

        <div className="flex border-y border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={() => setMode('explore')}
            className={`w-1/2 py-2 text-sm font-bold tracking-wide transition-colors ${
              mode === 'explore'
                ? 'border-b-2 border-blue-600 bg-white text-blue-700'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            EXPLORE
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('challenge')
              if (!challenge) generateChallenge()
            }}
            className={`w-1/2 py-2 text-sm font-bold tracking-wide transition-colors ${
              mode === 'challenge'
                ? 'border-b-2 border-orange-500 bg-white text-orange-700'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          >
            CHALLENGE
          </button>
        </div>

        <div className="bg-white p-4 text-sm leading-relaxed text-gray-600">
          {mode === 'explore' ? (
            <p>Try different ways to balance the scale and record the values to find the pattern.</p>
          ) : (
            <div className="flex flex-col gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3 shadow-inner">
              <div className="flex items-center justify-between font-bold text-orange-800">
                <span className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" /> Challenge
                </span>
                <span className="rounded-full border border-orange-200 bg-white px-2 py-0.5 text-xs font-bold text-orange-600 shadow-sm">
                  {records.length} / {challenge?.needed}
                </span>
              </div>
              {records.length >= (challenge?.needed || 1) ? (
                <div className="mt-1 flex flex-col items-center gap-2 text-center font-bold text-green-700">
                  Goal Reached!
                  <button
                    type="button"
                    onClick={generateChallenge}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-3 py-1.5 text-white shadow-sm transition-colors hover:bg-orange-600"
                  >
                    <RefreshCw className="h-4 w-4" /> Next Challenge
                  </button>
                </div>
              ) : (
                <p className="leading-snug text-orange-900">
                  Find <strong>{challenge?.needed}</strong> different ways to balance{' '}
                  <strong>{fruits[challenge?.left || 'orange'].name}s</strong> and{' '}
                  <strong>{fruits[challenge?.right || 'apple'].name}s</strong>.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-grow flex-col overflow-hidden border-t border-gray-200">
          <table className="w-full text-center text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="w-1/2 border-b border-r border-gray-300 py-2 font-semibold">
                  {fruits[leftFruit].name}s
                </th>
                <th className="w-1/2 border-b border-gray-300 py-2 font-semibold">
                  {fruits[rightFruit].name}s
                </th>
              </tr>
            </thead>
          </table>

          <div className="flex-grow overflow-y-auto bg-gray-50">
            <table className="w-full text-center text-sm">
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-8 italic text-gray-400">
                      No values recorded yet.
                    </td>
                  </tr>
                ) : (
                  records.map((record, index) => {
                    const isBase = record.leftCount === baseLeft && record.rightCount === baseRight
                    const mult = record.leftCount / baseLeft

                    return (
                      <tr
                        key={`${record.leftCount}-${record.rightCount}-${index}`}
                        className={`border-b border-gray-200 transition-colors ${
                          isBase ? 'bg-green-100 hover:bg-green-200' : 'bg-white hover:bg-blue-50'
                        }`}
                      >
                        <td
                          className={`w-1/2 border-r border-gray-200 py-3 ${
                            isBase ? 'font-bold text-gray-900' : 'font-medium text-gray-700'
                          }`}
                        >
                          {record.leftCount}{' '}
                          {!isBase && <span className="ml-1 text-xs font-normal text-gray-400">(&times;{mult})</span>}
                        </td>
                        <td
                          className={`w-1/2 py-3 ${
                            isBase ? 'font-bold text-gray-900' : 'font-medium text-gray-700'
                          }`}
                        >
                          {record.rightCount}{' '}
                          {!isBase && <span className="ml-1 text-xs font-normal text-gray-400">(&times;{mult})</span>}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </aside>
    </div>
  )
}
