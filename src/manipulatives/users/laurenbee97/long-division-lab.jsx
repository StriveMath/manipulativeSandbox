import { useMemo, useState } from 'react'

const digitGap = 54
const digitStartX = 238
const quotientY = 82
const dividendY = 142
const rowStartY = 176
const rowGap = 88
const productFontClass = 'fill-[#EF4444] text-[31px] font-black'
const workFontClass = 'fill-[#2B235A] text-[31px] font-black'

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.floor(parsed)))
}

function getDigitX(index) {
  return digitStartX + index * digitGap
}

function getNumberStartIndex(value, endIndex) {
  return endIndex - String(value).length + 1
}

function classifyStep(step) {
  if (step.remainder === 0) return 'No remainder — perfect subtraction.'
  if (step.isDecimal) return 'Use the decimal zero to keep dividing.'
  return `Remainder ${step.remainder}; bring down the next digit.`
}

function buildLongDivisionPlan(dividendValue, divisorValue, decimalPlaces = 1) {
  const divisor = clampNumber(divisorValue, 1, 99, 5)
  const dividend = clampNumber(dividendValue, 1, 9999, 1234)
  const integerDigits = String(dividend).split('').map(Number)
  const digits = [...integerDigits]
  let prefix = 0
  let endIndex = 0

  while (endIndex < integerDigits.length) {
    prefix = prefix * 10 + integerDigits[endIndex]
    if (prefix >= divisor || endIndex === integerDigits.length - 1) break
    endIndex += 1
  }

  const steps = []
  let current = prefix
  let remainder = 0
  let decimalZerosUsed = 0
  let position = endIndex

  while (steps.length < 8) {
    const isDecimal = position >= integerDigits.length
    const quotientDigit = Math.floor(current / divisor)
    const product = quotientDigit * divisor
    remainder = current - product
    const nextIndex = position + 1
    let bringDownDigit = null

    if (nextIndex < integerDigits.length) {
      bringDownDigit = integerDigits[nextIndex]
    } else if (remainder > 0 && decimalZerosUsed < decimalPlaces) {
      bringDownDigit = 0
    }

    steps.push({
      id: `${position}-${current}`,
      position,
      current,
      divisor,
      quotientDigit,
      product,
      remainder,
      bringDownDigit,
      isDecimal,
      note: classifyStep({ remainder, isDecimal }),
    })

    if (bringDownDigit === null) break

    if (nextIndex >= integerDigits.length) {
      decimalZerosUsed += 1
      digits.push(0)
    }

    current = remainder * 10 + bringDownDigit
    position = nextIndex
  }

  const hasDecimal = steps.some((step) => step.isDecimal)
  const quotient = steps.map((step) => step.quotientDigit).join('')
  const quotientText = hasDecimal
    ? `${quotient.slice(0, Math.max(1, steps.findIndex((step) => step.isDecimal)))}.${quotient.slice(Math.max(1, steps.findIndex((step) => step.isDecimal)))}`
    : quotient

  return { dividend, divisor, digits, integerDigits, steps, quotientText, finalRemainder: remainder, hasDecimal }
}

export default function LongDivisionLab() {
  const [dividendInput, setDividendInput] = useState('1234')
  const [divisorInput, setDivisorInput] = useState('5')
  const [activeStep, setActiveStep] = useState(0)
  const [phase, setPhase] = useState('quotient')
  const [quotientInput, setQuotientInput] = useState('')
  const [remainderInput, setRemainderInput] = useState('')
  const [message, setMessage] = useState('Try the first quotient digit.')

  const plan = useMemo(
    () => buildLongDivisionPlan(dividendInput, divisorInput, 1),
    [dividendInput, divisorInput],
  )
  const currentStep = plan.steps[activeStep]
  const completedSteps = plan.steps.slice(0, activeStep)
  const isComplete = activeStep >= plan.steps.length

  const resetWork = () => {
    setActiveStep(0)
    setPhase('quotient')
    setQuotientInput('')
    setRemainderInput('')
    setMessage('Try the first quotient digit.')
  }

  const updateDividend = (value) => {
    if (/^\d{0,4}$/.test(value)) {
      setDividendInput(value)
      setActiveStep(0)
      setPhase('quotient')
      setQuotientInput('')
      setRemainderInput('')
      setMessage('New problem ready. Try the first quotient digit.')
    }
  }

  const updateDivisor = (value) => {
    if (/^\d{0,2}$/.test(value)) {
      setDivisorInput(value)
      setActiveStep(0)
      setPhase('quotient')
      setQuotientInput('')
      setRemainderInput('')
      setMessage('New problem ready. Try the first quotient digit.')
    }
  }

  const advanceToNextStep = () => {
    const nextStep = activeStep + 1
    setActiveStep(nextStep)
    setPhase('quotient')
    setQuotientInput('')
    setRemainderInput('')
    setMessage(nextStep >= plan.steps.length ? 'Solved! The long division is complete.' : currentStep.note)
  }

  const checkCurrentEntry = () => {
    if (!currentStep) return

    if (phase === 'quotient') {
      if (quotientInput === String(currentStep.quotientDigit)) {
        setPhase('remainder')
        setRemainderInput('')
        setMessage(`Good. ${currentStep.quotientDigit} × ${plan.divisor} = ${currentStep.product}. Now subtract to find the remainder.`)
        return
      }
      setMessage(`Not quite. Try a multiple of ${plan.divisor} that is close to ${currentStep.current} without going over.`)
      return
    }

    if (remainderInput === String(currentStep.remainder)) {
      advanceToNextStep()
      return
    }
    setMessage(`Check the subtraction: ${currentStep.current} − ${currentStep.product}.`)
  }

  const handleQuotientInput = (value) => {
    if (!/^\d?$/.test(value) || !currentStep) return
    setQuotientInput(value)
    if (value === '') return

    if (value === String(currentStep.quotientDigit)) {
      setPhase('remainder')
      setRemainderInput('')
      setMessage(`Good. ${currentStep.quotientDigit} × ${plan.divisor} = ${currentStep.product}. Now subtract to find the remainder.`)
      return
    }

    setMessage(`Not quite. Try a multiple of ${plan.divisor} that is close to ${currentStep.current} without going over.`)
  }

  const handleRemainderInput = (value) => {
    if (!/^\d{0,2}$/.test(value) || !currentStep) return
    setRemainderInput(value)
    if (value === '') return

    if (value === String(currentStep.remainder)) {
      advanceToNextStep()
      return
    }

    setMessage(`Check the subtraction: ${currentStep.current} − ${currentStep.product}.`)
  }

  const showHint = () => {
    if (!currentStep) return
    if (phase === 'remainder') {
      setMessage(`Subtract ${currentStep.product} from ${currentStep.current}. Type that remainder under the line.`)
      return
    }
    if (currentStep.isDecimal) {
      setMessage(`You are in the decimal part now. Use the zero you brought down and think about ${plan.divisor} × __.`)
      return
    }
    if (currentStep.current < plan.divisor) {
      setMessage(`Since ${currentStep.current} is smaller than ${plan.divisor}, think about whether you need to bring down another digit.`)
      return
    }
    setMessage(`Find the biggest multiple of ${plan.divisor} that fits inside ${currentStep.current} without going over.`)
  }

  const quotientDigits = completedSteps.map((step) => step.quotientDigit)
  const decimalIndex = plan.steps.findIndex((step) => step.isDecimal)
  const renderColumnNumber = (value, endIndex, y, className) => (
    String(value).split('').map((digit, offset) => (
      <text
        key={`${value}-${endIndex}-${y}-${offset}`}
        x={getDigitX(getNumberStartIndex(value, endIndex) + offset)}
        y={y}
        textAnchor="middle"
        className={className}
      >
        {digit}
      </text>
    ))
  )

  return (
    <div className="h-[500px] overflow-hidden bg-[#FFF7E8] p-4 font-['Inter'] text-[#2B235A]">
      <div className="grid h-full grid-cols-[1fr_220px] gap-4">
        <section className="relative overflow-hidden rounded-3xl border-4 border-[#2B235A]/10 bg-white shadow-inner">
          <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-[#F6D365] px-5 py-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2B235A]/60">Long Division Lab</p>
              <p className="text-lg font-black">Divide, multiply, subtract, bring down</p>
            </div>
            <div className="rounded-full bg-white px-4 py-2 text-sm font-black shadow-sm">
              {plan.dividend} ÷ {plan.divisor}
            </div>
          </div>

          <style>
            {`
              @keyframes bringDown {
                from { opacity: 0; transform: translateY(-42px); }
                to { opacity: 1; transform: translateY(0); }
              }

              .bring-down-pop {
                animation: bringDown 420ms ease-out both;
              }
            `}
          </style>

          <svg viewBox="0 0 560 540" className="absolute inset-x-0 top-[74px] h-[384px] w-full" role="img" aria-label="Long division workspace">
            <defs>
              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#2B235A" floodOpacity="0.16" />
              </filter>
            </defs>

            <text x="98" y={dividendY} textAnchor="middle" className="fill-[#2B235A] text-[42px] font-black">
              {plan.divisor}
            </text>
            <path d={`M 130 ${dividendY - 50} v 54 h ${Math.min(306, plan.digits.length * digitGap + 28)}`} fill="none" stroke="#2B235A" strokeWidth="5" strokeLinecap="round" />

            {currentStep && (
              <rect
                x={getDigitX(Math.max(0, currentStep.position - String(currentStep.current).length + 1)) - 24}
                y={dividendY - 44}
                width={String(currentStep.current).length * digitGap}
                height="58"
                rx="16"
                fill="#C6F6D5"
                opacity="0.6"
              />
            )}

            {plan.digits.map((digit, index) => (
              <g key={`${digit}-${index}`}>
                {index >= plan.integerDigits.length && (
                  <text x={getDigitX(index) - 28} y={dividendY} textAnchor="middle" className="fill-[#2B235A] text-[34px] font-black">
                    .
                  </text>
                )}
                <text x={getDigitX(index)} y={dividendY} textAnchor="middle" className="fill-[#2B235A] text-[42px] font-black">
                  {digit}
                </text>
              </g>
            ))}

            {quotientDigits.map((digit, index) => {
              const step = completedSteps[index]
              return (
                <g key={step.id}>
                  {decimalIndex === index && (
                    <text x={getDigitX(step.position) - 28} y={quotientY} textAnchor="middle" className="fill-[#2B235A] text-[34px] font-black">
                      .
                    </text>
                  )}
                  <text x={getDigitX(step.position)} y={quotientY} textAnchor="middle" className="fill-[#7C3AED] text-[42px] font-black">
                    {digit}
                  </text>
                </g>
              )
            })}

            {!isComplete && currentStep && (
              <>
                {decimalIndex === activeStep && (
                  <text x={getDigitX(currentStep.position) - 28} y={quotientY} textAnchor="middle" className="fill-[#2B235A] text-[34px] font-black">
                    .
                  </text>
                )}
                {phase === 'remainder' ? (
                  <text x={getDigitX(currentStep.position)} y={quotientY} textAnchor="middle" className="fill-[#7C3AED] text-[42px] font-black">
                    {currentStep.quotientDigit}
                  </text>
                ) : (
                  <foreignObject x={getDigitX(currentStep.position) - 23} y={quotientY - 40} width="46" height="52">
                    <input
                      value={quotientInput}
                      onChange={(event) => handleQuotientInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') checkCurrentEntry()
                      }}
                      className="h-11 w-11 rounded-xl border-3 border-[#B8A4E8] bg-white text-center text-2xl font-black text-[#7C3AED] shadow-md outline-none"
                      inputMode="numeric"
                      aria-label="Next quotient digit"
                      autoFocus
                    />
                  </foreignObject>
                )}
              </>
            )}

            {completedSteps.map((step, index) => {
              const y = rowStartY + index * rowGap
              const x = getDigitX(step.position)
              const productStartX = getDigitX(getNumberStartIndex(step.product, step.position))
              const nextX = step.bringDownDigit === null ? x : getDigitX(step.position + 1)
              const isNewestCompleted = index === completedSteps.length - 1

              return (
                <g key={step.id} filter="url(#softShadow)">
                  {renderColumnNumber(step.product, step.position, y, productFontClass)}
                  <text x={productStartX - 34} y={y} textAnchor="middle" className="fill-[#EF4444] text-[27px] font-black">
                    −
                  </text>
                  <line x1={productStartX - 24} y1={y + 16} x2={x + 26} y2={y + 16} stroke="#2B235A" strokeWidth="3" strokeLinecap="round" />
                  <text x={x} y={y + 48} textAnchor="middle" className={workFontClass}>
                    {step.remainder}
                  </text>
                  {step.bringDownDigit !== null && (
                    <g>
                      <g className={isNewestCompleted ? 'bring-down-pop' : ''}>
                        <path d={`M ${nextX} ${dividendY + 8} C ${nextX + 22} ${y - 12}, ${nextX + 18} ${y + 20}, ${nextX + 6} ${y + 36}`} fill="none" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />
                        <path d={`M ${nextX + 6} ${y + 36} l -10 -14 M ${nextX + 6} ${y + 36} l 15 -8`} fill="none" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />
                        <text x={nextX} y={y + 48} textAnchor="middle" className={workFontClass}>
                          {step.bringDownDigit}
                        </text>
                      </g>
                    </g>
                  )}
                </g>
              )
            })}

            {!isComplete && currentStep && phase === 'remainder' && (() => {
              const y = rowStartY + activeStep * rowGap
              const x = getDigitX(currentStep.position)
              const productStartX = getDigitX(getNumberStartIndex(currentStep.product, currentStep.position))

              return (
                <g filter="url(#softShadow)">
                  {renderColumnNumber(currentStep.product, currentStep.position, y, productFontClass)}
                  <text x={productStartX - 34} y={y} textAnchor="middle" className="fill-[#EF4444] text-[27px] font-black">
                    −
                  </text>
                  <line x1={productStartX - 24} y1={y + 16} x2={x + 26} y2={y + 16} stroke="#2B235A" strokeWidth="3" strokeLinecap="round" />
                  <foreignObject x={x - 23} y={y + 20} width="46" height="52">
                    <input
                      value={remainderInput}
                      onChange={(event) => handleRemainderInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') checkCurrentEntry()
                      }}
                      className="h-11 w-11 rounded-xl border-3 border-[#FCA5A5] bg-white text-center text-2xl font-black text-[#2B235A] shadow-md outline-none"
                      inputMode="numeric"
                      aria-label="Remainder after subtraction"
                      autoFocus
                    />
                  </foreignObject>
                </g>
              )
            })()}
          </svg>
        </section>

        <aside className="flex flex-col gap-3 rounded-3xl bg-[#2B235A] p-4 text-white shadow-xl">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-black uppercase tracking-wide text-white/70">
              Dividend
              <input
                value={dividendInput}
                onChange={(event) => updateDividend(event.target.value)}
                onBlur={() => updateDividend(String(clampNumber(dividendInput, 1, 9999, 1234)))}
                className="mt-1 h-10 w-full rounded-xl border-0 bg-white px-2 text-center text-lg font-black text-[#2B235A]"
              />
            </label>
            <label className="text-xs font-black uppercase tracking-wide text-white/70">
              Divisor
              <input
                value={divisorInput}
                onChange={(event) => updateDivisor(event.target.value)}
                onBlur={() => updateDivisor(String(clampNumber(divisorInput, 1, 99, 5)))}
                className="mt-1 h-10 w-full rounded-xl border-0 bg-white px-2 text-center text-lg font-black text-[#2B235A]"
              />
            </label>
          </div>

          {isComplete ? (
            <div className="rounded-2xl bg-[#DCFCE7] p-4 text-[#166534]">
              <p className="text-xs font-black uppercase tracking-wide opacity-70">Answer</p>
              <p className="text-3xl font-black">{plan.quotientText}</p>
              <p className="mt-1 text-sm font-bold">
                {plan.finalRemainder === 0 ? 'No remainder.' : `Remainder ${plan.finalRemainder}.`}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-white p-4 text-[#2B235A]">
              <p className="text-xs font-black uppercase tracking-wide text-[#7C3AED]">
                {phase === 'quotient' ? 'Quotient digit' : 'Remainder'}
              </p>
              <p className="mt-1 text-sm font-bold">
                {phase === 'quotient'
                  ? `Type your answer in the purple box above the division bar.`
                  : `Type the subtraction remainder under the line.`}
              </p>
              <button type="button" onClick={showHint} className="mt-2 w-full rounded-xl border-2 border-[#7C3AED]/20 py-2 text-sm font-black text-[#7C3AED]">
                Hint for next step
              </button>
              <p className="mt-3 rounded-xl bg-[#F3E8FF] p-2 text-xs font-black leading-snug text-[#5B21B6]">
                {message}
              </p>
            </div>
          )}

          <div className="mt-auto grid gap-2">
            <button type="button" onClick={resetWork} className="rounded-xl bg-white px-4 py-2 text-sm font-black text-[#2B235A]">
              Reset work
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
