import React, { useEffect, useMemo, useRef, useState } from 'react'

type PopState = {
  active: boolean
  start1: number
  end1: number
  start2: number
  end2: number
  intensity: number
}

const getCoords = (index: number) => {
  const largeCol = Math.floor(index / 1000)
  const rem1 = index % 1000
  const largeRow = Math.floor(rem1 / 100)
  const rem2 = rem1 % 100
  const smallCol = Math.floor(rem2 / 10)
  const smallRow = rem2 % 10

  return {
    x: largeCol * 10 + smallCol,
    y: largeRow * 10 + smallRow,
  }
}

const runAnimation = (duration: number, onUpdate: (progress: number) => void) =>
  new Promise<void>((resolve) => {
    const startTime = performance.now()
    const step = (time: number) => {
      const progress = Math.min(1, (time - startTime) / duration)
      onUpdate(progress)
      if (progress < 1) requestAnimationFrame(step)
      else resolve()
    }
    requestAnimationFrame(step)
  })

export default function ComparingDecimals() {
  const [val1Str, setVal1Str] = useState('0.7')
  const [val2Str, setVal2Str] = useState('0.25')
  const [activeTab, setActiveTab] = useState<'grid' | 'placeValue'>('grid')
  const [animStatus, setAnimStatus] = useState<'idle' | 'animating' | 'complete'>('idle')
  const [currentStep, setCurrentStep] = useState(-1)
  const [highlightDigit, setHighlightDigit] = useState(-1)
  const [drawnValue1, setDrawnValue1] = useState(0)
  const [drawnValue2, setDrawnValue2] = useState(0)
  const [popState, setPopState] = useState<PopState>({
    active: false,
    start1: 0,
    end1: 0,
    start2: 0,
    end2: 0,
    intensity: 0,
  })

  const canvas1Ref = useRef<HTMLCanvasElement | null>(null)
  const canvas2Ref = useRef<HTMLCanvasElement | null>(null)

  const getUIDigits = (str: string) => {
    const parts = (str || '0').split('.')
    const frac = parts[1] || ''
    return Array.from({ length: 4 }, (_, index) => (index < frac.length ? Number(frac[index]) : null))
  }

  const getMathDigits = (str: string) => {
    const parts = (str || '0').split('.')
    return parts[1] ? parts[1].padEnd(4, '0').split('').map(Number).slice(0, 4) : [0, 0, 0, 0]
  }

  const getTypedLength = (str: string) => {
    const parts = (str || '0').split('.')
    return parts[1] ? parts[1].length : 0
  }

  const uiDigits1 = useMemo(() => getUIDigits(val1Str), [val1Str])
  const uiDigits2 = useMemo(() => getUIDigits(val2Str), [val2Str])
  const mathDigits1 = useMemo(() => getMathDigits(val1Str), [val1Str])
  const mathDigits2 = useMemo(() => getMathDigits(val2Str), [val2Str])

  const diffIndex = useMemo(() => {
    for (let index = 0; index < 4; index += 1) {
      if (mathDigits1[index] !== mathDigits2[index]) return index
    }
    return -1
  }, [mathDigits1, mathDigits2])

  const maxEvalStep = useMemo(() => Math.max(0, Math.max(getTypedLength(val1Str), getTypedLength(val2Str)) - 1), [val1Str, val2Str])

  const getStepTargets = (stepIndex: number) => {
    if (stepIndex < 0) return { t1: 0, t2: 0 }
    let t1 = 0
    let t2 = 0
    const multipliers = [1000, 100, 10, 1]

    for (let index = 0; index <= stepIndex; index += 1) {
      if (index < 4) {
        t1 += mathDigits1[index] * multipliers[index]
        t2 += mathDigits2[index] * multipliers[index]
      }
    }

    return { t1, t2 }
  }

  useEffect(() => {
    setAnimStatus('idle')
    setCurrentStep(-1)
    setHighlightDigit(-1)
    setDrawnValue1(0)
    setDrawnValue2(0)
    setPopState({ active: false, start1: 0, end1: 0, start2: 0, end2: 0, intensity: 0 })
  }, [val1Str, val2Str, activeTab])

  useEffect(() => {
    let isCancelled = false

    const processSteps = async () => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 400)
      })

      for (let step = 0; step <= maxEvalStep; step += 1) {
        if (isCancelled) return
        setCurrentStep(step)
        setHighlightDigit(step)

        if (activeTab === 'placeValue') {
          await new Promise((resolve) => {
            window.setTimeout(resolve, 1200)
          })
          continue
        }

        await new Promise((resolve) => {
          window.setTimeout(resolve, 600)
        })
        if (isCancelled) return

        const targets = getStepTargets(step)
        const start1 = getStepTargets(step - 1).t1
        const start2 = getStepTargets(step - 1).t2

        if (mathDigits1[step] === mathDigits2[step]) {
          await runAnimation(800, (progress) => {
            if (isCancelled) return
            const ease = 1 - (1 - progress) ** 3
            setDrawnValue1(start1 + Math.round((targets.t1 - start1) * ease))
            setDrawnValue2(start2 + Math.round((targets.t2 - start2) * ease))
          })

          if (step >= 2) {
            setPopState({ active: true, start1, end1: targets.t1, start2, end2: targets.t2, intensity: 0 })
            await runAnimation(900, (progress) => {
              if (isCancelled) return
              const intensity = Math.sin(progress * Math.PI)
              setPopState((prev) => ({ ...prev, intensity }))
            })
            if (!isCancelled) setPopState({ active: false, start1: 0, end1: 0, start2: 0, end2: 0, intensity: 0 })
          }
        } else {
          await runAnimation(700, (progress) => {
            if (isCancelled) return
            const ease = 1 - (1 - progress) ** 3
            setDrawnValue1(start1 + Math.round((targets.t1 - start1) * ease))
          })
          await new Promise((resolve) => {
            window.setTimeout(resolve, 200)
          })
          await runAnimation(700, (progress) => {
            if (isCancelled) return
            const ease = 1 - (1 - progress) ** 3
            setDrawnValue2(start2 + Math.round((targets.t2 - start2) * ease))
          })

          if (isCancelled) return
          setPopState({ active: true, start1, end1: targets.t1, start2, end2: targets.t2, intensity: 0 })
          await runAnimation(900, (progress) => {
            if (isCancelled) return
            const intensity = Math.sin(progress * Math.PI)
            setPopState((prev) => ({ ...prev, intensity }))
          })
          if (!isCancelled) setPopState({ active: false, start1: 0, end1: 0, start2: 0, end2: 0, intensity: 0 })
        }

        await new Promise((resolve) => {
          window.setTimeout(resolve, 400)
        })
      }

      if (!isCancelled) {
        setHighlightDigit(-1)
        setAnimStatus('complete')
      }
    }

    if (animStatus === 'animating') processSteps()
    return () => {
      isCancelled = true
    }
  }, [animStatus, mathDigits1, mathDigits2, maxEvalStep, activeTab])

  useEffect(() => {
    const c1 = canvas1Ref.current
    const c2 = canvas2Ref.current
    if (!c1 || !c2 || activeTab !== 'grid') return

    const pixelRatio = window.devicePixelRatio || 2
    const logicalSize = 240
    const actualSize = logicalSize * pixelRatio
    const cellSize = actualSize / 100

    const configureCanvas = (canvas: HTMLCanvasElement) => {
      canvas.width = actualSize
      canvas.height = actualSize
      canvas.style.width = `${logicalSize}px`
      canvas.style.height = `${logicalSize}px`
    }

    configureCanvas(c1)
    configureCanvas(c2)

    const drawGrid = (
      ctx: CanvasRenderingContext2D | null,
      fillVal: number,
      fillColor: string,
      strokeColor: string,
      popStart: number,
      popEnd: number,
    ) => {
      if (!ctx) return
      ctx.clearRect(0, 0, actualSize, actualSize)

      ctx.fillStyle = fillColor
      ctx.beginPath()
      for (let index = 0; index < fillVal; index += 1) {
        const { x, y } = getCoords(index)
        ctx.rect(x * cellSize, y * cellSize, cellSize, cellSize)
      }
      ctx.fill()

      ctx.strokeStyle = 'rgba(0,0,0,0.06)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let index = 0; index <= 100; index += 1) {
        ctx.moveTo(index * cellSize, 0)
        ctx.lineTo(index * cellSize, actualSize)
        ctx.moveTo(0, index * cellSize)
        ctx.lineTo(actualSize, index * cellSize)
      }
      ctx.stroke()

      ctx.strokeStyle = 'rgba(0,0,0,0.3)'
      ctx.lineWidth = 2 * pixelRatio
      ctx.beginPath()
      for (let index = 0; index <= 10; index += 1) {
        ctx.moveTo(index * cellSize * 10, 0)
        ctx.lineTo(index * cellSize * 10, actualSize)
        ctx.moveTo(0, index * cellSize * 10)
        ctx.lineTo(actualSize, index * cellSize * 10)
      }
      ctx.stroke()

      if (popState.active && popState.intensity > 0 && popEnd > popStart) {
        let maxScale = 1.2
        if (currentStep === 2) maxScale = 4
        if (currentStep === 3) maxScale = 8

        const currentScale = 1 + (maxScale - 1) * popState.intensity
        const size = cellSize * currentScale
        const offset = (size - cellSize) / 2

        if (currentStep >= 2) {
          ctx.shadowColor = 'rgba(0,0,0,0.5)'
          ctx.shadowBlur = 4 * pixelRatio * popState.intensity
        }

        ctx.fillStyle = fillColor
        for (let index = popStart; index < popEnd; index += 1) {
          const { x, y } = getCoords(index)
          ctx.fillRect(x * cellSize - offset, y * cellSize - offset, size, size)
        }

        ctx.shadowColor = 'transparent'
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = pixelRatio
        for (let index = popStart; index < popEnd; index += 1) {
          const { x, y } = getCoords(index)
          ctx.strokeRect(x * cellSize - offset, y * cellSize - offset, size, size)
        }
      }
    }

    drawGrid(c1.getContext('2d'), drawnValue1, 'rgba(239, 68, 68, 0.85)', 'rgba(153, 27, 27, 1)', popState.start1, popState.end1)
    drawGrid(c2.getContext('2d'), drawnValue2, 'rgba(234, 88, 12, 0.85)', 'rgba(154, 52, 18, 1)', popState.start2, popState.end2)
  }, [drawnValue1, drawnValue2, popState, currentStep, activeTab])

  const handleAnimate = () => {
    if (animStatus === 'animating') return
    setAnimStatus('animating')
    setCurrentStep(-1)
    setDrawnValue1(0)
    setDrawnValue2(0)
    setHighlightDigit(-1)
    setPopState({ active: false, start1: 0, end1: 0, start2: 0, end2: 0, intensity: 0 })
  }

  const getWinnerMessage = () => {
    if (animStatus === 'idle') return 'Click Animate to begin comparison.'
    const places = ['tenths', 'hundredths', 'thousandths', 'ten-thousandths']
    if (animStatus === 'animating') return `Analyzing ${places[currentStep === -1 ? 0 : currentStep]} place...`
    if (diffIndex === -1) return 'All evaluated digits match. The values are equal.'

    const d1 = mathDigits1[diffIndex]
    const d2 = mathDigits2[diffIndex]
    const place = places[diffIndex]
    return d1 > d2
      ? `${d1} at ${place} is greater than ${d2}. So, ${val1Str} is greater.`
      : `${d2} at ${place} is greater than ${d1}. So, ${val2Str} is greater.`
  }

  const isColVisible = (idx: number) => {
    if (animStatus === 'idle') return false
    if (animStatus === 'animating') return idx <= currentStep
    return true
  }

  const shouldShowComparisonSymbol = (idx: number) => {
    if (highlightDigit === idx) return true
    return animStatus === 'complete' && isColVisible(idx)
  }

  return (
    <div className="flex h-[500px] w-[800px] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white font-sans text-neutral-800 shadow-xl">
      <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-6">
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-neutral-800">Comparing Decimals</h2>
        <button
          type="button"
          onClick={handleAnimate}
          disabled={animStatus === 'animating'}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          ▶ Animate
        </button>
      </header>

      <div className="flex h-[44px] shrink-0 border-b border-neutral-200 bg-neutral-50 px-5">
        <button
          type="button"
          onClick={() => setActiveTab('grid')}
          className={`flex items-center gap-2 border-b-2 px-5 py-2.5 text-sm font-bold transition-colors ${
            activeTab === 'grid' ? 'border-blue-600 bg-white text-blue-700' : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          ▦ Grid Model
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('placeValue')}
          className={`flex items-center gap-2 border-b-2 px-5 py-2.5 text-sm font-bold transition-colors ${
            activeTab === 'placeValue' ? 'border-blue-600 bg-white text-blue-700' : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          # Place Value Chart
        </button>
      </div>

      <div
        className={`flex h-[36px] shrink-0 items-center justify-center border-b text-sm transition-colors ${
          animStatus === 'animating'
            ? 'border-blue-100 bg-blue-50 font-medium text-blue-800'
            : animStatus === 'complete'
              ? 'border-green-100 bg-green-50 font-bold text-green-800'
              : 'border-neutral-100 bg-neutral-50 font-medium text-neutral-600'
        }`}
      >
        {getWinnerMessage()}
      </div>

      <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-white">
        {activeTab === 'placeValue' && (
          <div className="flex h-full w-full flex-col items-center justify-center p-6">
            <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
              <table className="w-full border-collapse text-center">
                <thead>
                  <tr className="bg-blue-50 text-xs font-bold uppercase tracking-wider text-blue-900">
                    <th className="w-1/5 border-b border-r border-blue-200 px-2 py-2.5">Input</th>
                    <th className="w-4 border-b border-r border-blue-200 px-1 py-2.5 text-neutral-400">.</th>
                    {['1/10', '1/100', '1/1000', '1/10000'].map((label, idx) => (
                      <th
                        key={label}
                        className={`w-1/5 border-b border-r border-blue-200 px-2 py-2.5 transition-colors ${
                          highlightDigit === idx ? 'bg-yellow-200 text-yellow-900 ring-2 ring-inset ring-yellow-400' : ''
                        }`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-2xl font-medium">
                  <tr className="h-14 bg-white">
                    <td className="border-r border-blue-100 px-2">
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        max="0.9999"
                        className="mx-auto block w-24 rounded-md border border-red-200 bg-red-50 px-1 py-1 text-center font-mono text-lg font-bold text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-75"
                        value={val1Str}
                        onChange={(event) => setVal1Str(event.target.value)}
                        disabled={animStatus === 'animating'}
                      />
                    </td>
                    <td className="border-r border-blue-100 px-1 font-bold text-neutral-400">{animStatus !== 'idle' ? '0.' : ''}</td>
                    {uiDigits1.map((digit, idx) => (
                      <td
                        key={`d1-${idx}`}
                        className={`border-r border-blue-100 px-2 text-red-600 transition-all duration-300 ${
                          highlightDigit === idx ? 'scale-110 bg-yellow-50 font-bold text-red-700 shadow-inner' : ''
                        } ${animStatus === 'complete' && isColVisible(idx) ? 'font-bold' : ''}`}
                      >
                        {isColVisible(idx) && digit !== null ? digit : ''}
                      </td>
                    ))}
                  </tr>
                  <tr className="h-10 border-y border-blue-100 bg-blue-50/30">
                    <td className="border-r border-blue-100" />
                    <td className="border-r border-blue-100" />
                    {uiDigits1.map((_, idx) => (
                      <td key={`comp-${idx}`} className={`border-r border-blue-100 ${highlightDigit === idx ? 'bg-yellow-100/50' : ''}`}>
                        {shouldShowComparisonSymbol(idx) && isColVisible(idx) && (
                          <div className="flex animate-bounce items-center justify-center text-xl font-bold text-blue-600">
                            {mathDigits1[idx] > mathDigits2[idx] ? '>' : mathDigits1[idx] < mathDigits2[idx] ? '<' : '='}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="h-14 bg-white">
                    <td className="border-r border-blue-100 px-2">
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        max="0.9999"
                        className="mx-auto block w-24 rounded-md border border-orange-200 bg-orange-50 px-1 py-1 text-center font-mono text-lg font-bold text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-75"
                        value={val2Str}
                        onChange={(event) => setVal2Str(event.target.value)}
                        disabled={animStatus === 'animating'}
                      />
                    </td>
                    <td className="border-r border-blue-100 px-1 font-bold text-neutral-400">{animStatus !== 'idle' ? '0.' : ''}</td>
                    {uiDigits2.map((digit, idx) => (
                      <td
                        key={`d2-${idx}`}
                        className={`border-r border-blue-100 px-2 text-orange-600 transition-all duration-300 ${
                          highlightDigit === idx ? 'scale-110 bg-yellow-50 font-bold text-orange-700 shadow-inner' : ''
                        } ${animStatus === 'complete' && isColVisible(idx) ? 'font-bold' : ''}`}
                      >
                        {isColVisible(idx) && digit !== null ? digit : ''}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'grid' && (
          <div className="flex h-full w-full flex-row items-center justify-center gap-8 px-6">
            {[{ value: val1Str, setValue: setVal1Str, color: 'red', ref: canvas1Ref }, { value: val2Str, setValue: setVal2Str, color: 'orange', ref: canvas2Ref }].map((item, index) => (
              <div key={index} className="flex flex-col items-center gap-3">
                {animStatus === 'idle' ? (
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    max="0.9999"
                    className={`w-32 rounded-xl border py-1 text-center font-mono text-3xl font-bold focus:outline-none focus:ring-2 ${
                      item.color === 'red'
                        ? 'border-red-200 bg-red-50/70 text-red-600 focus:ring-red-400'
                        : 'border-orange-200 bg-orange-50/70 text-orange-600 focus:ring-orange-400'
                    }`}
                    value={item.value}
                    onChange={(event) => item.setValue(event.target.value)}
                  />
                ) : (
                  <div
                    className={`flex w-32 items-center justify-center rounded-xl border py-1 font-mono text-3xl font-bold tracking-tight ${
                      item.color === 'red' ? 'border-red-200 bg-red-50/70 text-red-600' : 'border-orange-200 bg-orange-50/70 text-orange-600'
                    }`}
                  >
                    <span>0.</span>
                    {(index === 0 ? uiDigits1 : uiDigits2).map((digit, digitIndex) => (
                      <span
                        key={`${index}-${digitIndex}`}
                        className={`w-[22px] text-center transition-all ${highlightDigit === digitIndex ? 'scale-110 rounded bg-yellow-300 font-bold text-black shadow-sm' : ''}`}
                      >
                        {isColVisible(digitIndex) && digit !== null ? digit : '\u00A0'}
                      </span>
                    ))}
                  </div>
                )}

                <div className="relative h-[240px] w-[240px] overflow-hidden rounded-sm bg-white shadow-md ring-1 ring-black/10">
                  <canvas ref={item.ref} className="block" title={index === 0 ? 'Left Grid' : 'Right Grid'} />
                </div>
              </div>
            ))}

            <div className="ml-2 flex w-[140px] flex-col gap-2.5 rounded-xl border border-neutral-200 bg-neutral-50 p-3.5 text-[11px] font-medium text-neutral-600 shadow-sm">
              <h4 className="flex items-center gap-1.5 border-b border-neutral-300 pb-1.5 text-xs font-bold text-neutral-800">▦ Grid Reference</h4>
              <div className="mt-1 flex items-center gap-2.5">
                <div className="h-1.5 w-1.5 shrink-0 bg-neutral-700" />
                <span>
                  1 px = <strong>0.0001</strong>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-3.5 w-1.5 shrink-0 flex-col justify-between bg-neutral-700">
                  <div className="h-px w-full bg-neutral-400" />
                  <div className="h-px w-full bg-neutral-400" />
                </div>
                <span>
                  10 px = <strong>0.001</strong>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="grid h-3.5 w-3.5 shrink-0 grid-cols-4 border border-neutral-700">
                  <div className="border-r border-neutral-400" />
                  <div className="border-r border-neutral-400" />
                  <div className="border-r border-neutral-400" />
                  <div />
                </div>
                <span>
                  1 col = <strong>0.01</strong>
                </span>
              </div>
              <div className="mb-1 flex items-center gap-2.5">
                <div className="h-5 w-5 shrink-0 bg-neutral-700" />
                <span>
                  1 box = <strong>0.1</strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
