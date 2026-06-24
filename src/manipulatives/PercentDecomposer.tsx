import React, { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Lock } from 'lucide-react'

function Fraction({
  num,
  den,
  className = '',
}: {
  num: number | string
  den: number | string
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center justify-center font-bold leading-none ${className}`}>
      <span className="min-w-[1.2em] border-b-2 border-current px-1 pb-[2px] text-center">{num}</span>
      <span className="min-w-[1.2em] pt-[2px] text-center">{den}</span>
    </div>
  )
}

function MathInput({
  val,
  setVal,
  expected,
  unlocked,
}: {
  val: string
  setVal: (value: string) => void
  expected: number
  unlocked: boolean
}) {
  const isCorrect = Math.abs(Number(val) - expected) < 0.0001 && val !== ''

  return (
    <input
      type="number"
      disabled={!unlocked || isCorrect}
      value={val}
      onChange={(event) => setVal(event.target.value)}
      className={`h-8 w-16 rounded border-b-2 bg-slate-50 text-center font-bold shadow-inner outline-none transition-all ${
        isCorrect
          ? 'border-green-500 bg-green-50 text-green-700'
          : 'border-slate-300 text-slate-800 focus:border-blue-500 focus:bg-white'
      } ${!unlocked ? 'cursor-not-allowed opacity-50' : ''}`}
    />
  )
}

function StepCard({
  num,
  title,
  unlocked,
  children,
}: {
  num: number
  title: string
  unlocked: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`relative flex h-full flex-col justify-center rounded-xl border p-3 transition-all duration-500 ${
        unlocked ? 'border-blue-200 bg-white shadow-sm' : 'pointer-events-none border-slate-200 bg-slate-50 opacity-50 grayscale'
      }`}
    >
      {!unlocked && <Lock size={20} className="absolute right-3 top-3 text-slate-300" />}
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        Step {num}: <span className="text-slate-600">{title}</span>
      </h3>
      {children}
    </div>
  )
}

const formatValue = (value: number) => Number(Number(value).toFixed(4))
const isMatching = (input: string, expected: number) =>
  input !== '' && Math.abs(Number(input) - expected) < 0.0001

export default function PercentDecomposer() {
  const [wholePct, setWholePct] = useState(10)
  const [num, setNum] = useState(2)
  const [den, setDen] = useState(5)
  const [base, setBase] = useState(280)

  const [s1In, setS1In] = useState('')
  const [s2In, setS2In] = useState('')
  const [s3In, setS3In] = useState('')
  const [s4In1, setS4In1] = useState('')
  const [s4In2, setS4In2] = useState('')
  const [s4InFinal, setS4InFinal] = useState('')
  const [step, setStep] = useState(1)

  const safeDen = Math.max(1, den)
  const safeNum = Math.max(0, Math.min(num, safeDen))
  const safeWholePct = Math.max(0, Math.min(100, wholePct))
  const safeBase = Math.max(1, base)

  const valWhole = useMemo(() => formatValue(safeBase * (safeWholePct / 100)), [safeBase, safeWholePct])
  const valOnePercent = useMemo(() => formatValue(safeBase / 100), [safeBase])
  const valSlice = useMemo(() => formatValue(valOnePercent / safeDen), [valOnePercent, safeDen])
  const valFrac = useMemo(() => formatValue(valSlice * safeNum), [valSlice, safeNum])
  const valTotal = useMemo(() => formatValue(valWhole + valFrac), [valWhole, valFrac])

  useEffect(() => {
    const isS1 = isMatching(s1In, valWhole)
    const isS2 = isMatching(s2In, valOnePercent)
    const isS3 = isMatching(s3In, valFrac)
    const isS4 =
      isMatching(s4In1, valWhole) &&
      isMatching(s4In2, valFrac) &&
      isMatching(s4InFinal, valTotal)

    let currentStep = 1
    if (isS1) currentStep = 2
    if (currentStep === 2 && isS2) currentStep = 3
    if (currentStep === 3 && isS3) currentStep = 4
    if (currentStep === 4 && isS4) currentStep = 5
    setStep(currentStep)
  }, [s1In, s2In, s3In, s4In1, s4In2, s4InFinal, valWhole, valOnePercent, valFrac, valTotal])

  useEffect(() => {
    setS1In('')
    setS2In('')
    setS3In('')
    setS4In1('')
    setS4In2('')
    setS4InFinal('')
  }, [safeWholePct, safeNum, safeDen, safeBase])

  const checkStatus = (input: string, expected: number) => {
    if (input === '') return 'empty'
    return Math.abs(Number(input) - expected) < 0.0001 ? 'correct' : 'wrong'
  }

  const s1Status = checkStatus(s1In, valWhole)
  const s2Status = checkStatus(s2In, valOnePercent)
  const s3Status = checkStatus(s3In, valFrac)
  const segmentCount = safeWholePct > 0 && 100 % safeWholePct === 0 ? 100 / safeWholePct : 10

  return (
    <div className="mx-auto grid h-[500px] w-[800px] select-none grid-cols-2 grid-rows-3 gap-3 rounded-xl border border-slate-200 bg-slate-100 p-3 font-sans text-slate-800 shadow-xl">
      <section className="row-start-1 flex h-full flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <span className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Problem Setup</span>
        <div className="flex items-center gap-1 text-2xl font-bold">
          <input
            type="number"
            value={safeWholePct}
            onChange={(event) => setWholePct(Number(event.target.value) || 0)}
            className="w-14 border-b-2 border-slate-200 bg-transparent text-center text-blue-600 outline-none focus:border-blue-500"
          />
          <div className="-mt-1 mx-1 flex flex-col items-center justify-center text-lg text-orange-500">
            <input
              type="number"
              value={safeNum}
              onChange={(event) => setNum(Number(event.target.value) || 0)}
              className="w-10 bg-transparent text-center outline-none"
            />
            <div className="h-[2px] w-full bg-orange-300" />
            <input
              type="number"
              value={safeDen}
              onChange={(event) => setDen(Number(event.target.value) || 1)}
              className="w-10 bg-transparent text-center outline-none"
            />
          </div>
          <span className="text-xl font-light text-slate-500">% of</span>
          <input
            type="number"
            value={safeBase}
            onChange={(event) => setBase(Number(event.target.value) || 1)}
            className="ml-1 w-20 border-b-2 border-slate-200 bg-transparent text-center text-slate-700 outline-none focus:border-slate-500"
          />
        </div>
      </section>

      <section className="row-start-2 col-start-1">
        <StepCard num={1} title={`${safeWholePct}% of ${safeBase}`} unlocked={step >= 1}>
          <div className="flex flex-col gap-3">
            <div className="relative mt-3 w-full">
              <span className="absolute -top-4 right-1 text-[10px] font-bold text-slate-400">100%</span>
              <div className="relative h-8 w-full overflow-hidden rounded-md border-2 border-blue-200 bg-blue-50 shadow-inner">
                <div className="absolute inset-0 z-0 flex">
                  {Array.from({ length: segmentCount }).map((_, index) => (
                    <div key={index} className="flex-1 border-r border-blue-300 last:border-r-0" />
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center font-bold text-slate-500 opacity-40">
                  {safeBase}
                </div>
                <div
                  className={`absolute left-0 top-0 z-10 flex h-full items-center justify-center text-sm font-bold shadow-md transition-all ${
                    s1Status === 'correct'
                      ? 'bg-green-500 text-white'
                      : s1Status === 'wrong'
                        ? 'bg-red-500 text-white'
                        : 'bg-transparent'
                  }`}
                  style={{ width: `${safeWholePct}%` }}
                >
                  {s1In}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xl text-slate-600">
                <Fraction num={safeWholePct} den={100} className="text-blue-600" />
                <span className="text-slate-400">x</span>
                <span className="font-bold text-slate-700">{safeBase}</span>
                <span className="text-slate-400">=</span>
              </div>
              <MathInput val={s1In} setVal={setS1In} expected={valWhole} unlocked={step >= 1} />
            </div>
          </div>
        </StepCard>
      </section>

      <section className="row-start-3 col-start-1">
        <StepCard num={2} title={`1% of ${safeBase}`} unlocked={step >= 2}>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-slate-500">1% of {safeBase}</span>
              <div className="grid h-[80px] w-[80px] grid-cols-10 gap-[1px] rounded-sm bg-slate-300 p-[1px]">
                {Array.from({ length: 100 }).map((_, index) => (
                  <div key={index} className={`h-full w-full ${index === 0 ? 'bg-slate-500' : 'bg-white'}`} />
                ))}
              </div>
            </div>

            <ArrowRight size={18} className="text-slate-400" />

            <div
              className={`flex h-12 w-12 items-center justify-center rounded text-sm font-bold shadow-md transition-colors ${
                s2Status === 'correct'
                  ? 'bg-green-500 text-white'
                  : s2Status === 'wrong'
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-200'
              }`}
            >
              {s2In}
            </div>

            <div className="flex flex-1 flex-col items-end justify-center">
              <div className="flex items-center gap-2 text-xl text-slate-600">
                <Fraction num={safeBase} den={100} className="text-slate-700" />
                <span className="text-slate-400">=</span>
                <MathInput val={s2In} setVal={setS2In} expected={valOnePercent} unlocked={step >= 2} />
              </div>
            </div>
          </div>
        </StepCard>
      </section>

      <section className="row-start-1 col-start-2">
        <StepCard num={3} title={`Find ${safeNum}/${safeDen} of 1%`} unlocked={step >= 3}>
          <div className="flex flex-col gap-3">
            <div className="relative mx-auto h-10 w-4/5 overflow-hidden rounded-md border-2 border-orange-200 bg-orange-50 shadow-inner">
              <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center font-bold text-slate-500 opacity-40">
                {step >= 3 ? valOnePercent : ''}
              </div>
              <div className="absolute inset-0 z-10 flex">
                {Array.from({ length: safeDen }).map((_, index) => (
                  <div
                    key={index}
                    className={`flex flex-1 items-center justify-center border-r border-orange-300 text-[11px] font-bold transition-colors last:border-r-0 ${
                      index < safeNum
                        ? s3Status === 'correct'
                          ? 'bg-green-500 text-white shadow-inner'
                          : s3Status === 'wrong'
                            ? 'bg-red-500 text-white shadow-inner'
                            : 'bg-orange-200'
                        : 'bg-transparent'
                    }`}
                  >
                    {index < safeNum && s3In !== '' ? formatValue(Number(s3In) / safeNum) : ''}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xl text-slate-600">
                <Fraction num={safeNum} den={safeDen} className="text-orange-500" />
                <span className="text-slate-400">x</span>
                <span className="font-bold text-slate-700">{step >= 3 ? valOnePercent : '?'}</span>
                <span className="text-slate-400">=</span>
              </div>
              <MathInput val={s3In} setVal={setS3In} expected={valFrac} unlocked={step >= 3} />
            </div>
          </div>
        </StepCard>
      </section>

      <section className="row-start-2 col-start-2">
        <StepCard num={4} title="Add Whole and Part" unlocked={step >= 4}>
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div className="flex w-full items-center justify-center gap-3 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
              <span className="font-bold text-blue-600">{safeWholePct}%</span>
              <span>of {safeBase}</span>
              <span className="mx-1 text-slate-400">+</span>
              <div className="flex items-center gap-1 text-orange-500">
                <Fraction num={safeNum} den={safeDen} className="text-[10px]" />
                <span className="font-bold">%</span>
              </div>
              <span>of {safeBase}</span>
            </div>

            <div className="flex items-center gap-3 text-xl font-bold text-slate-400">
              <MathInput val={s4In1} setVal={setS4In1} expected={valWhole} unlocked={step >= 4} />
              <span>+</span>
              <MathInput val={s4In2} setVal={setS4In2} expected={valFrac} unlocked={step >= 4} />
              <span>=</span>
              <MathInput val={s4InFinal} setVal={setS4InFinal} expected={valTotal} unlocked={step >= 4} />
            </div>
          </div>
        </StepCard>
      </section>

      <section className="row-start-3 col-start-2 flex items-center justify-center">
        {step === 5 && (
          <div className="flex animate-bounce items-center gap-3 rounded-2xl border-2 border-green-400 bg-green-100 p-6 text-3xl font-bold text-green-700 shadow-lg">
            <CheckCircle2 size={36} /> Solved!
          </div>
        )}
      </section>
    </div>
  )
}
