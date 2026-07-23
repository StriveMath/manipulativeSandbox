import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const xOrange = '#D85A30'
const answerGreen = '#3B6D11'

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2
}

function formatNumber(value) {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(1).replace(/\.0$/, '')
}

function randomX() {
  return Math.floor(Math.random() * 15) - 6
}

const variableLetters = ['a', 'b', 'c', 'x', 'y', 'z']

function randomVariable() {
  return variableLetters[Math.floor(Math.random() * variableLetters.length)]
}

function withVariable(text, variable) {
  return text.replace(/x/g, variable)
}

function Sup2() {
  return <sup className="ml-0.5 align-super text-[0.58em] leading-none">2</sup>
}

function MathText({ children }) {
  if (typeof children !== 'string') return children
  const parts = children.split('^2')
  return parts.map((part, index) => (
    <span key={`${part}-${index}`}>
      {part}
      {index < parts.length - 1 ? <Sup2 /> : null}
    </span>
  ))
}

const expressions = [
  {
    id: '3x-plus-5',
    label: '3x + 5',
    title: '3x + 5',
    color: '#534AB7',
    substitution: (x) => <>3 * <span className="text-[#D85A30]">{formatNumber(x)}</span> + 5</>,
    expressionMath: (variable) => <>3<span className="text-[#D85A30]">{variable}</span> + 5</>,
    firstStepMath: (x, substituted, variable) => <>3 * <span className="text-[#D85A30]">{substituted ? formatNumber(x) : variable}</span></>,
    buildSteps: (x) => {
      const multiply = 3 * x
      const answer = multiply + 5
      return [
        {
          operation: 'Multiply',
          symbol: 'x3',
          before: formatNumber(x),
          after: formatNumber(multiply),
          equation: `3 * ${formatNumber(x)} = ${formatNumber(multiply)}`,
          note: 'Replace x, then multiply by 3.',
        },
        {
          operation: 'Add',
          symbol: '+5',
          before: formatNumber(multiply),
          after: formatNumber(answer),
          equation: `${formatNumber(multiply)} + 5 = ${formatNumber(answer)}`,
          note: 'Add 5 to the value inside the machine.',
        },
      ]
    },
  },
  {
    id: '2x-squared-minus-4',
    label: '2x^2 - 4',
    title: '2x^2 - 4',
    color: '#185FA5',
    substitution: (x) => <>2(<span className="text-[#D85A30]">{formatNumber(x)}</span>)<Sup2 /> - 4</>,
    expressionMath: (variable) => <>2<span className="text-[#D85A30]">{variable}</span><Sup2 /> - 4</>,
    firstStepMath: (x, substituted, variable) => <><span className="text-[#D85A30]">{substituted ? formatNumber(x) : variable}</span><Sup2 /></>,
    buildSteps: (x) => {
      const square = x * x
      const double = 2 * square
      const answer = double - 4
      return [
        {
          operation: 'Square',
          symbol: '^2',
          before: formatNumber(x),
          after: formatNumber(square),
          equation: `${formatNumber(x)}^2 = ${formatNumber(square)}`,
          note: 'Square the substituted value first.',
        },
        {
          operation: 'Multiply',
          symbol: 'x2',
          before: formatNumber(square),
          after: formatNumber(double),
          equation: `2 * ${formatNumber(square)} = ${formatNumber(double)}`,
          note: 'Multiply the squared value by 2.',
        },
        {
          operation: 'Subtract',
          symbol: '-4',
          before: formatNumber(double),
          after: formatNumber(answer),
          equation: `${formatNumber(double)} - 4 = ${formatNumber(answer)}`,
          note: 'Finish by subtracting 4.',
        },
      ]
    },
  },
  {
    id: 'four-brackets',
    label: '4(x + 3)',
    title: '4(x + 3)',
    color: '#0F6E56',
    substitution: (x) => <>4(<span className="text-[#D85A30]">{formatNumber(x)}</span> + 3)</>,
    expressionMath: (variable) => <>4(<span className="text-[#D85A30]">{variable}</span> + 3)</>,
    firstStepMath: (x, substituted, variable) => <><span className="text-[#D85A30]">{substituted ? formatNumber(x) : variable}</span> + 3</>,
    buildSteps: (x) => {
      const inside = x + 3
      const answer = 4 * inside
      return [
        {
          operation: 'Brackets',
          symbol: '+3',
          before: formatNumber(x),
          after: formatNumber(inside),
          equation: `${formatNumber(x)} + 3 = ${formatNumber(inside)}`,
          note: 'Work inside the brackets first.',
        },
        {
          operation: 'Multiply',
          symbol: 'x4',
          before: formatNumber(inside),
          after: formatNumber(answer),
          equation: `4 * ${formatNumber(inside)} = ${formatNumber(answer)}`,
          note: 'Multiply the bracket value by 4.',
        },
      ]
    },
  },
  {
    id: 'quadratic',
    label: 'x^2 + 2x + 1',
    title: 'x^2 + 2x + 1',
    color: '#7C3AED',
    substitution: (x) => <><span className="text-[#D85A30]">{formatNumber(x)}</span><Sup2 /> + 2(<span className="text-[#D85A30]">{formatNumber(x)}</span>) + 1</>,
    expressionMath: (variable) => <><span className="text-[#D85A30]">{variable}</span><Sup2 /> + 2<span className="text-[#D85A30]">{variable}</span> + 1</>,
    firstStepMath: (x, substituted, variable) => <><span className="text-[#D85A30]">{substituted ? formatNumber(x) : variable}</span><Sup2 /></>,
    buildSteps: (x) => {
      const square = x * x
      const twoX = 2 * x
      const partial = square + twoX
      const answer = partial + 1
      return [
        {
          operation: 'Square',
          symbol: '^2',
          before: formatNumber(x),
          after: formatNumber(square),
          equation: `${formatNumber(x)}^2 = ${formatNumber(square)}`,
          note: 'Find the x^2 part first.',
        },
        {
          operation: 'Add 2x',
          symbol: '+2x',
          before: formatNumber(square),
          after: formatNumber(partial),
          equation: `${formatNumber(square)} + 2(${formatNumber(x)}) = ${formatNumber(partial)}`,
          note: 'Add the 2x part.',
        },
        {
          operation: 'Add',
          symbol: '+1',
          before: formatNumber(partial),
          after: formatNumber(answer),
          equation: `${formatNumber(partial)} + 1 = ${formatNumber(answer)}`,
          note: 'Add the final 1.',
        },
      ]
    },
  },
  {
    id: 'ten-minus-2x',
    label: '10 - 2x',
    title: '10 - 2x',
    color: '#BA7517',
    substitution: (x) => <>10 - 2(<span className="text-[#D85A30]">{formatNumber(x)}</span>)</>,
    expressionMath: (variable) => <>10 - 2<span className="text-[#D85A30]">{variable}</span></>,
    firstStepMath: (x, substituted, variable) => <>2 * <span className="text-[#D85A30]">{substituted ? formatNumber(x) : variable}</span></>,
    buildSteps: (x) => {
      const twoX = 2 * x
      const answer = 10 - twoX
      return [
        {
          operation: 'Multiply',
          symbol: 'x2',
          before: formatNumber(x),
          after: formatNumber(twoX),
          equation: `2 * ${formatNumber(x)} = ${formatNumber(twoX)}`,
          note: 'First find 2x.',
        },
        {
          operation: 'Subtract',
          symbol: '10-',
          before: formatNumber(twoX),
          after: formatNumber(answer),
          equation: `10 - ${formatNumber(twoX)} = ${formatNumber(answer)}`,
          note: 'Subtract that amount from 10.',
        },
      ]
    },
  },
  {
    id: 'two-brackets',
    label: '(x+2)(x-1)',
    title: '(x + 2)(x - 1)',
    color: '#993556',
    substitution: (x) => <>(<span className="text-[#D85A30]">{formatNumber(x)}</span> + 2)(<span className="text-[#D85A30]">{formatNumber(x)}</span> - 1)</>,
    expressionMath: (variable) => <>(<span className="text-[#D85A30]">{variable}</span> + 2)(<span className="text-[#D85A30]">{variable}</span> - 1)</>,
    firstStepMath: (x, substituted, variable) => <><span className="text-[#D85A30]">{substituted ? formatNumber(x) : variable}</span> + 2</>,
    buildSteps: (x) => {
      const left = x + 2
      const right = x - 1
      const answer = left * right
      return [
        {
          operation: 'First bracket',
          symbol: '+2',
          before: formatNumber(x),
          after: formatNumber(left),
          equation: `${formatNumber(x)} + 2 = ${formatNumber(left)}`,
          note: 'Evaluate the first bracket.',
        },
        {
          operation: 'Second bracket',
          symbol: '-1',
          before: formatNumber(left),
          after: `${formatNumber(left)} & ${formatNumber(right)}`,
          equation: `${formatNumber(x)} - 1 = ${formatNumber(right)}`,
          note: 'Evaluate the second bracket too.',
        },
        {
          operation: 'Multiply',
          symbol: 'x',
          before: `${formatNumber(left)} & ${formatNumber(right)}`,
          after: formatNumber(answer),
          equation: `${formatNumber(left)} * ${formatNumber(right)} = ${formatNumber(answer)}`,
          note: 'Multiply the two bracket values.',
        },
      ]
    },
  },
]

function withAlpha(hex, alpha) {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function Token({ value, progress, phase, isFinalStep, isWaitingAtTray }) {
  const y = (() => {
    if (phase === 'done') return 224
    if (phase !== 'animating') return isWaitingAtTray ? 218 : 28
    if (progress < 0.24) return 28 + (progress / 0.24) * 38
    if (progress < 0.62) return 66 + ((progress - 0.24) / 0.38) * 44
    if (progress < 0.8) return 110 + ((progress - 0.62) / 0.18) * 42
    return 152 + ((progress - 0.8) / 0.2) * (isFinalStep ? 72 : 66)
  })()
  const scale = phase === 'animating' && progress > 0.36 && progress < 0.72 ? 0.88 : 1
  const isAnswer = phase === 'done' || (isFinalStep && phase === 'animating' && progress > 0.66)
  const isInsideMachine = phase === 'animating' && progress > 0.22 && progress < 0.88
  const isPairedValue = String(value).includes('&')

  return (
    <div
      className={`absolute left-1/2 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white font-mono font-black leading-none text-white transition-transform ${isPairedValue ? 'text-[12px]' : 'text-base'}`}
      style={{
        top: y,
        zIndex: isInsideMachine ? 10 : 30,
        transform: `translate(-50%, -50%) scale(${scale})`,
        backgroundColor: isAnswer ? answerGreen : xOrange,
        boxShadow: isAnswer ? '0 14px 26px rgba(59,109,17,0.28)' : '0 14px 24px rgba(216,90,48,0.28)',
      }}
    >
      {value}
    </div>
  )
}

function StepCard({ step, index, status, color }) {
  const isActive = status === 'active'
  const isDone = status === 'done'

  return (
    <div
      className="h-[58px] min-w-[160px] flex-1 rounded-[14px] border px-2.5 py-2 transition-all"
      style={{
        borderColor: isDone ? '#93C572' : isActive ? color : '#E0DDD6',
        backgroundColor: isDone ? '#EAF6DF' : isActive ? withAlpha(color, 0.12) : '#ffffff',
        opacity: status === 'pending' ? 0.56 : 1,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
          style={{ backgroundColor: isDone ? answerGreen : isActive ? color : '#9CA3AF' }}
        >
          {isDone ? '✓' : index + 1}
        </span>
        <p className="min-w-0 truncate font-mono text-[13px] font-black text-[#1A1A2E]">
          {step.operation} <span className="font-semibold"><MathText>{step.equation}</MathText></span>
        </p>
      </div>
      <p className={`mt-1 truncate pl-8 text-[11px] font-semibold text-[#5F5E5A] ${isActive ? 'opacity-100' : 'opacity-0'}`}>
        {step.note}
      </p>
    </div>
  )
}

function WindowMath({ expression, xValue, variable, completedSteps, phase, progress, currentStep, lastStep, isComplete, answer }) {
  const isFirstAnimation = completedSteps === 0 && phase === 'animating'
  const isLaterAnimation = completedSteps > 0 && phase === 'animating'
  const showGlow = completedSteps === 0 && (!isFirstAnimation || progress < 0.58)
  const isWorking = phase === 'animating' && progress > 0.22 && progress < 0.82
  const shake = isWorking
    ? Math.sin(progress * Math.PI * 44) * 1.7
    : 0
  const scale = isFirstAnimation && progress > 0.5 && progress < 0.68 ? 1.04 : 1
  const firstOperation = currentStep?.equation.split(' = ')[0]
  const multiplySymbol = currentStep?.symbol?.match(/^x(\d+)$/)
  const operationDisplay = completedSteps === 0 ? firstOperation : currentStep?.symbol
  const twoXValue = formatNumber(2 * xValue)
  const pairedValues = currentStep?.before?.includes(' & ') ? currentStep.before.split(' & ') : null
  const operationMath = multiplySymbol && isLaterAnimation ? (
    <>
      <span className="text-[#D85A30]">{currentStep.before}</span> * {multiplySymbol[1]}
    </>
  ) : currentStep?.symbol === '10-' && isLaterAnimation ? (
    <>
      10 - <span className="text-[#D85A30]">{currentStep.before}</span>
    </>
  ) : currentStep?.operation === 'Second bracket' ? (
    !isLaterAnimation || progress < 0.34 ? (
      <>
        <span className="text-[#D85A30]">{variable}</span> - 1
      </>
    ) : (
      <>
        <span className="text-[#D85A30]">{formatNumber(xValue)}</span> - 1
      </>
    )
  ) : currentStep?.symbol === '+2x' && isLaterAnimation ? (
    progress < 0.12 ? (
      <>
        + 2<span className="text-[#D85A30]">{variable}</span>
      </>
    ) : progress < 0.28 ? (
      <>
        + 2 * <span className="text-[#D85A30]">{formatNumber(xValue)}</span>
      </>
    ) : progress < 0.52 ? (
      <>
        + <span className="text-[#D85A30]">{twoXValue}</span>
      </>
    ) : (
      <>
        {currentStep.before} + <span className="text-[#D85A30]">{twoXValue}</span> = {currentStep.after}
      </>
    )
  ) : pairedValues && currentStep?.symbol === 'x' && isLaterAnimation ? (
    <>
      <span className="text-[#D85A30]">{pairedValues[0]}</span> * <span className="text-[#D85A30]">{pairedValues[1]}</span>
    </>
  ) : (
    <span><MathText>{operationDisplay}</MathText></span>
  )
  const xHasDroppedIn = isFirstAnimation && progress > 0.36

  return (
    <div
      className="h-9 whitespace-nowrap font-mono text-[24px] font-black text-[#312B8C] transition-opacity duration-200"
      style={{
        opacity: isFirstAnimation && progress > 0.5 && progress < 0.68 ? 0.9 : 1,
        transform: `translateX(${shake}px) scale(${scale})`,
      }}
    >
      {isComplete ? (
        <span>{answer}</span>
      ) : isFirstAnimation ? (
        <span>{expression.firstStepMath(xValue, xHasDroppedIn, variable)}</span>
      ) : phase === 'idle' && completedSteps > 0 && lastStep ? (
        <span>{lastStep.after}</span>
      ) : completedSteps > 0 && currentStep ? (
        operationMath
      ) : (
        <span className={showGlow ? '[text-shadow:0_0_12px_rgba(216,90,48,0.35)]' : ''}>
          {expression.expressionMath(variable)}
        </span>
      )}
    </div>
  )
}

export default function SubstitutionMachine() {
  const frameRef = useRef(null)
  const [expressionIndex, setExpressionIndex] = useState(() => Math.floor(Math.random() * expressions.length))
  const [variable] = useState(() => randomVariable())
  const [xValue, setXValue] = useState(4)
  const [completedSteps, setCompletedSteps] = useState(0)
  const [phase, setPhase] = useState('idle')
  const [progress, setProgress] = useState(0)
  const [tokenValue, setTokenValue] = useState('4')

  const expression = expressions[expressionIndex]
  const steps = useMemo(() => expression.buildSteps(xValue), [expression, xValue])
  const currentStep = steps[completedSteps]
  const lastStep = completedSteps > 0 ? steps[completedSteps - 1] : null
  const isComplete = completedSteps >= steps.length
  const isFinalStep = completedSteps === steps.length - 1
  const answer = steps[steps.length - 1]?.after ?? formatNumber(xValue)
  const color = expression.color
  const hasStarted = phase === 'animating' || completedSteps > 0 || isComplete

  const resetRun = useCallback((nextX) => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    setCompletedSteps(0)
    setPhase('idle')
    setProgress(0)
    setTokenValue(formatNumber(nextX))
  }, [])

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  const animateStep = () => {
    if (!currentStep || frameRef.current) return
    const duration = 3024
    const topPause = 1000
    const startedAt = performance.now()
    setPhase('animating')
    setProgress(0)
    setTokenValue(completedSteps === 0 ? formatNumber(xValue) : currentStep.before)

    const tick = (now) => {
      const elapsed = now - startedAt
      if (elapsed < topPause) {
        setProgress(0)
        frameRef.current = requestAnimationFrame(tick)
        return
      }

      const raw = Math.min(1, (elapsed - topPause) / duration)
      const eased = easeInOut(raw)
      setProgress(eased)
      if (raw > 0.52) setTokenValue(currentStep.after)

      if (raw < 1) {
        frameRef.current = requestAnimationFrame(tick)
      } else {
        frameRef.current = null
        setProgress(1)
        setTokenValue(currentStep.after)
        setCompletedSteps((value) => value + 1)
        setPhase(completedSteps + 1 >= steps.length ? 'done' : 'idle')
      }
    }

    frameRef.current = requestAnimationFrame(tick)
  }

  const tryAnother = () => {
    const next = randomX()
    setXValue(next)
    resetRun(next)
  }

  const changeX = (amount) => {
    const next = Math.max(-10, Math.min(10, xValue + amount))
    setXValue(next)
    resetRun(next)
  }

  const cycleExpression = (amount) => {
    setExpressionIndex((index) => (index + amount + expressions.length) % expressions.length)
    resetRun(xValue)
  }

  const chooseExpression = (index) => {
    setExpressionIndex(index)
    resetRun(xValue)
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#F8F6F0] p-1 font-['Inter'] text-[#1A1A2E]">
      <div className="flex h-full w-full flex-col gap-1">
        <div className="flex shrink-0 flex-col items-center gap-0.5">
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => cycleExpression(-1)}
              className="hidden h-8 w-8 items-center justify-center rounded-full border border-[#E0DDD6] bg-white text-2xl font-black text-[#1A1A2E]"
              aria-label="Previous expression"
            >
              ‹
            </button>
            <div
              className="min-w-[220px] rounded-[14px] border bg-white px-5 py-1.5 text-center font-mono text-xl font-black shadow-sm"
              style={{ borderColor: color, color }}
            >
              <MathText>{withVariable(expression.label, variable)}</MathText>
            </div>
            <button
              type="button"
              onClick={() => cycleExpression(1)}
              className="hidden h-8 w-8 items-center justify-center rounded-full border border-[#E0DDD6] bg-white text-2xl font-black text-[#1A1A2E]"
              aria-label="Next expression"
            >
              ›
            </button>
          </div>
          <div className="hidden gap-1.5">
            {expressions.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => chooseExpression(index)}
                className="h-2 w-2 rounded-full transition-all"
                style={{
                  backgroundColor: index === expressionIndex ? color : '#D9D6CF',
                  transform: index === expressionIndex ? 'scale(1.25)' : 'scale(1)',
                }}
                aria-label={`Choose expression ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div className={`mx-auto h-[67px] shrink-0 rounded-[14px] border border-[#E0DDD6] bg-white px-4 py-1.5 text-center transition-opacity duration-200 ${hasStarted ? 'pointer-events-none invisible opacity-0' : 'opacity-100'}`}>
          <p className="mb-0.5 text-[10px] font-black uppercase tracking-wide text-[#5F5E5A]">Set the value of {variable}</p>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-xl font-black text-[#1A1A2E]">{variable} =</span>
            <button
              type="button"
              onClick={() => changeX(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xl font-black text-white"
              style={{ backgroundColor: color }}
            >
              -
            </button>
            <div className="flex h-11 min-w-16 items-center justify-center rounded-2xl px-4 text-2xl font-black text-white shadow-[0_12px_20px_rgba(216,90,48,0.22)]" style={{ backgroundColor: xOrange }}>
              {xValue}
            </div>
            <button
              type="button"
              onClick={() => changeX(1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xl font-black text-white"
              style={{ backgroundColor: color }}
            >
              +
            </button>
          </div>
        </div>

        <div className="relative h-[286px] shrink-0 overflow-hidden rounded-[14px] border border-[#E0DDD6] bg-white px-4 pt-2">
          {hasStarted ? (
            <Token
              value={tokenValue}
              progress={progress}
              phase={phase}
              isFinalStep={isFinalStep}
              isWaitingAtTray={completedSteps > 0 && !isComplete}
            />
          ) : null}

          <div className="absolute left-1/2 top-[20px] z-20 h-3.5 w-[150px] -translate-x-1/2 rounded-full shadow-sm" style={{ backgroundColor: color }} />
          <div className="absolute left-1/2 top-[32px] z-20 h-0 w-0 -translate-x-1/2 border-x-[48px] border-t-[38px] border-x-transparent" style={{ borderTopColor: color }} />
          <div className="absolute left-1/2 top-[40px] z-30 h-7 w-[94px] -translate-x-1/2 skew-x-[-14deg] rounded-md bg-[#DCD8EE]" />
          <div className="absolute left-1/2 top-[70px] z-20 h-[48px] w-11 -translate-x-1/2 rounded-t-xl" style={{ backgroundColor: color }} />

          <div className="absolute left-1/2 top-[88px] z-20 w-[470px] max-w-[90%] -translate-x-1/2 rounded-[28px] border-[8px] p-4 shadow-[0_18px_28px_rgba(83,74,183,0.16)]" style={{ borderColor: color, backgroundColor: color }}>
            <div className="absolute left-5 top-5 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: withAlpha('#000000', 0.35) }} />
            <div className="absolute right-5 top-5 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: withAlpha('#000000', 0.35) }} />
            <div className="flex min-h-[74px] items-center justify-center rounded-[14px] bg-white px-4 text-center shadow-inner">
              <WindowMath expression={expression} xValue={xValue} variable={variable} completedSteps={completedSteps} phase={phase} progress={progress} currentStep={currentStep} lastStep={lastStep} isComplete={isComplete} answer={answer} />
            </div>
            <div className="mt-4 flex justify-center gap-6">
              {[0, 1, 2].map((dot) => (
                <span key={dot} className="h-8 w-8 rounded-full border-4 border-[#EEEDFE]" style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>

          <div className="absolute left-1/2 top-[200px] z-20 h-10 w-[82px] -translate-x-1/2" style={{ backgroundColor: '#312B8C', clipPath: 'polygon(18% 0, 82% 0, 100% 100%, 0 100%)' }} />
          <div className="absolute left-1/2 top-[240px] h-1.5 w-36 -translate-x-1/2 rounded-full bg-[#DDE7D6]" />
          <div className="absolute left-1/2 top-[236px] flex -translate-x-1/2 gap-2">
            {steps.map((step, index) => (
              <span
                key={`${step.operation}-${index}`}
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: index < completedSteps ? answerGreen : index === completedSteps ? color : '#C8C4E8' }}
              />
            ))}
          </div>
        </div>

        <div className="hidden shrink-0 gap-1.5 overflow-hidden">
          {steps.map((step, index) => (
            <StepCard
              key={`${step.operation}-${index}`}
              step={step}
              index={index}
              color={color}
              status={index < completedSteps ? 'done' : index === completedSteps && !isComplete ? 'active' : 'pending'}
            />
          ))}
        </div>

        <div className="mt-1 grid shrink-0 grid-cols-[1fr_1fr_0.72fr] gap-2">
          <div className="flex min-h-10 items-center justify-center rounded-[14px] border bg-white px-3 py-2 text-center font-mono text-sm font-black" style={{ borderColor: color, color }}>
            <MathText>{`${withVariable(expression.title, variable)} when ${variable} = ${xValue}${isComplete ? ` -> ${answer}` : ''}`}</MathText>
          </div>
          <button
            type="button"
            onClick={isComplete ? tryAnother : animateStep}
            className="h-10 rounded-full text-base font-black text-white shadow-sm disabled:opacity-60"
            style={{ backgroundColor: color }}
            disabled={phase === 'animating'}
          >
            {isComplete ? 'Try another ->' : completedSteps === 0 ? 'Start ->' : 'Next step ->'}
          </button>
          <button
            type="button"
            onClick={() => resetRun(xValue)}
            className="h-10 rounded-full border border-[#D9D6CF] bg-white text-sm font-black text-[#1A1A2E]"
          >
            Start over
          </button>
        </div>
      </div>
    </div>
  )
}
