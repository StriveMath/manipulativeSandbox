import React, { useEffect, useRef } from 'react'

const logicalWidth = 800
const logicalHeight = 500

const layout = {
  x: 100,
  w: 640,
  topY: 100,
  barH: 45,
  bottomY: 165,
}

const newButton = { x: 330, y: 390, w: 140, h: 45 }

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  life: number
  decay: number
  size: number
}

type ModelState = {
  fill: number
  isDragging: boolean
  isMatched: boolean
  feedbackMsg: string
  targetPercentage: number
}

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
}

const drawPanel = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  bg: string,
  border: string,
  title: string,
  titleColor: string,
  value: string,
  valueColor: string,
) => {
  ctx.fillStyle = bg
  ctx.strokeStyle = border
  ctx.lineWidth = 2
  drawRoundedRect(ctx, x, y, width, height, 10)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = titleColor
  ctx.font = 'bold 14px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(title, x + width / 2, y + 22)

  ctx.fillStyle = valueColor
  ctx.font = 'bold 36px Arial, sans-serif'
  ctx.fillText(value, x + width / 2, y + 62)
}

const drawButton = (ctx: CanvasRenderingContext2D, text: string) => {
  ctx.fillStyle = '#ffffff'
  ctx.strokeStyle = '#cccccc'
  ctx.lineWidth = 1
  drawRoundedRect(ctx, newButton.x, newButton.y, newButton.w, newButton.h, 8)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#000000'
  ctx.font = 'bold 18px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(text, newButton.x + newButton.w / 2, newButton.y + 28)
}

const createParticle = (x: number, y: number): Particle => ({
  x,
  y,
  vx: (Math.random() - 0.5) * 12,
  vy: (Math.random() - 1) * 12 - 2,
  color: `hsl(${Math.random() * 360}, 100%, 50%)`,
  life: 1,
  decay: Math.random() * 0.015 + 0.01,
  size: Math.random() * 6 + 2,
})

export default function PercentageBarModel() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const stateRef = useRef<ModelState>({
    fill: 0,
    isDragging: false,
    isMatched: false,
    feedbackMsg: '',
    targetPercentage: 60,
  })
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return undefined

    const initCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = logicalWidth * dpr
      canvas.height = logicalHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const fireConfetti = (x: number, y: number) => {
      particlesRef.current.push(...Array.from({ length: 60 }, () => createParticle(x, y)))
    }

    const generateNewQuestion = () => {
      const state = stateRef.current
      let newTarget = state.targetPercentage
      while (newTarget === state.targetPercentage) {
        newTarget = Math.floor(Math.random() * 10) * 10 + 10
      }

      state.targetPercentage = newTarget
      state.fill = 0
      state.isMatched = false
      state.feedbackMsg = ''
      particlesRef.current = []
    }

    const getPointerPos = (event: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect()
      const touch = 'touches' in event && event.touches.length > 0 ? event.touches[0] : null
      const clientX = touch?.clientX ?? ('clientX' in event ? event.clientX : 0)
      const clientY = touch?.clientY ?? ('clientY' in event ? event.clientY : 0)

      return {
        x: ((clientX - rect.left) / rect.width) * logicalWidth,
        y: ((clientY - rect.top) / rect.height) * logicalHeight,
      }
    }

    const updateFill = (x: number) => {
      const state = stateRef.current
      const percentage = Math.round(((x - layout.x) / layout.w) * 100)
      state.fill = Math.max(0, Math.min(100, percentage))
      state.feedbackMsg = ''
    }

    const evaluateSuccess = () => {
      const state = stateRef.current
      if (state.fill === state.targetPercentage) {
        if (!state.isMatched) {
          fireConfetti(layout.x + (state.fill / 100) * layout.w, layout.topY + layout.barH)
          state.isMatched = true
          state.feedbackMsg = ''
        }
      } else {
        state.isMatched = false
        state.feedbackMsg = `Not quite! Adjust the slider to find ${state.targetPercentage}%.`
      }
    }

    const onDown = (event: MouseEvent | TouchEvent) => {
      const pos = getPointerPos(event)

      if (
        pos.x >= newButton.x &&
        pos.x <= newButton.x + newButton.w &&
        pos.y >= newButton.y &&
        pos.y <= newButton.y + newButton.h
      ) {
        generateNewQuestion()
        return
      }

      if (
        pos.x >= layout.x - 20 &&
        pos.x <= layout.x + layout.w + 20 &&
        pos.y >= layout.topY - 30 &&
        pos.y <= layout.bottomY + layout.barH + 30
      ) {
        stateRef.current.isDragging = true
        updateFill(pos.x)
      }
    }

    const onMove = (event: MouseEvent | TouchEvent) => {
      if (!stateRef.current.isDragging) return
      event.preventDefault()
      updateFill(getPointerPos(event).x)
    }

    const onUp = () => {
      if (!stateRef.current.isDragging) return
      stateRef.current.isDragging = false
      evaluateSuccess()
    }

    const draw = () => {
      const state = stateRef.current
      ctx.clearRect(0, 0, logicalWidth, logicalHeight)

      ctx.fillStyle = state.isMatched ? '#e6f4ea' : '#f0f4fa'
      ctx.strokeStyle = state.isMatched ? '#ceead6' : '#d9e4f5'
      ctx.lineWidth = 2
      drawRoundedRect(ctx, 20, 20, 760, 45, 12)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = state.isMatched ? '#137333' : '#21436e'
      ctx.font = 'bold 20px Arial, sans-serif'
      ctx.textAlign = 'center'

      let bannerText = `Shade ${state.targetPercentage}% - click or drag on either bar`
      if (state.isMatched) {
        bannerText = `Excellent! ${state.targetPercentage}% matches perfectly.`
      } else if (state.feedbackMsg) {
        bannerText = state.feedbackMsg
        ctx.fillStyle = '#b22222'
      }
      ctx.fillText(bannerText, logicalWidth / 2, 48)

      const fillWidth = (state.fill / 100) * layout.w
      const barBg = '#e8e7e0'
      const barFill = '#5ca4eb'

      ctx.fillStyle = barBg
      ctx.fillRect(layout.x, layout.topY, layout.w, layout.barH)
      ctx.fillStyle = barFill
      ctx.fillRect(layout.x, layout.topY, fillWidth, layout.barH)

      for (let i = 1; i < 100; i += 1) {
        const lx = layout.x + (i / 100) * layout.w
        ctx.strokeStyle = i <= state.fill ? '#8bbdf0' : '#d1d1c9'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(lx, layout.topY)
        ctx.lineTo(lx, layout.topY + layout.barH)
        ctx.stroke()
      }
      ctx.strokeStyle = '#111111'
      ctx.lineWidth = 3
      ctx.strokeRect(layout.x, layout.topY, layout.w, layout.barH)

      ctx.fillStyle = barBg
      ctx.fillRect(layout.x, layout.bottomY, layout.w, layout.barH)
      ctx.fillStyle = barFill
      ctx.fillRect(layout.x, layout.bottomY, fillWidth, layout.barH)

      for (let i = 1; i < 10; i += 1) {
        const lx = layout.x + (i / 10) * layout.w
        ctx.strokeStyle = i * 10 <= state.fill ? '#4a89c7' : '#888883'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(lx, layout.bottomY)
        ctx.lineTo(lx, layout.bottomY + layout.barH)
        ctx.stroke()
      }
      ctx.strokeStyle = '#111111'
      ctx.lineWidth = 3
      ctx.strokeRect(layout.x, layout.bottomY, layout.w, layout.barH)

      ctx.textAlign = 'right'
      ctx.font = '16px Arial, sans-serif'
      ctx.fillStyle = '#7b4c95'
      ctx.fillText(`${state.fill}/100`, layout.x - 15, layout.topY + layout.barH / 2 + 6)
      ctx.fillStyle = '#1b447a'
      ctx.fillText(`${state.fill}%`, layout.x - 15, layout.bottomY + layout.barH / 2 + 6)

      ctx.textAlign = 'center'
      for (let i = 0; i <= 10; i += 1) {
        const tickX = layout.x + (i / 10) * layout.w
        ctx.fillStyle = '#666666'
        ctx.font = '12px Arial, sans-serif'
        ctx.fillText((i / 10).toFixed(1), tickX, layout.bottomY + layout.barH + 20)

        ctx.fillStyle = '#888888'
        ctx.font = '11px Arial, sans-serif'
        ctx.fillText(`${i * 10}%`, tickX, layout.bottomY + layout.barH + 35)
      }

      const handleX = layout.x + fillWidth
      ctx.strokeStyle = '#3172de'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(handleX, layout.topY - 10)
      ctx.lineTo(handleX, layout.bottomY + layout.barH + 10)
      ctx.stroke()

      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#3172de'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(handleX, layout.bottomY + layout.barH, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      const tipY = layout.topY - 20
      ctx.fillStyle = '#3172de'
      drawRoundedRect(ctx, handleX - 25, tipY - 25, 50, 24, 6)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(handleX - 6, tipY - 1)
      ctx.lineTo(handleX + 6, tipY - 1)
      ctx.lineTo(handleX, tipY + 6)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 14px Arial, sans-serif'
      ctx.fillText(`${state.fill}%`, handleX, tipY - 8)

      const panelY = 285
      drawPanel(ctx, 60, panelY, 200, 80, '#f4f7fb', '#b9cde5', 'PERCENT', '#4b72a8', `${state.fill}%`, '#27559c')
      drawPanel(ctx, 300, panelY, 200, 80, '#faf5fb', '#ddbce1', 'FRACTION', '#9163a6', `${state.fill}/100`, '#7c4694')
      drawPanel(ctx, 540, panelY, 200, 80, '#f1faf5', '#b3dbc3', 'DECIMAL', '#468f63', (state.fill / 100).toFixed(2), '#267345')

      drawButton(ctx, 'New target')

      ctx.fillStyle = '#f0f4fa'
      drawRoundedRect(ctx, 20, 445, 760, 40, 8)
      ctx.fill()
      ctx.fillStyle = '#21436e'
      ctx.font = '13px Arial, sans-serif'
      ctx.fillText(
        'Drag anywhere on the bars to shade. The top bar has 100 tiny parts (hundredths), the bottom has 10 big parts (tenths) - they line up.',
        logicalWidth / 2,
        470,
      )

      for (let i = particlesRef.current.length - 1; i >= 0; i -= 1) {
        const particle = particlesRef.current[i]
        particle.x += particle.vx
        particle.y += particle.vy
        particle.vy += 0.3
        particle.life -= particle.decay

        ctx.globalAlpha = Math.max(0, particle.life)
        ctx.fillStyle = particle.color
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1

        if (particle.life <= 0) particlesRef.current.splice(i, 1)
      }

      animationRef.current = window.requestAnimationFrame(draw)
    }

    initCanvas()
    draw()

    canvas.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    canvas.addEventListener('touchstart', onDown, { passive: false })
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)

    return () => {
      if (animationRef.current !== null) window.cancelAnimationFrame(animationRef.current)
      canvas.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      canvas.removeEventListener('touchstart', onDown)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="h-[500px] w-[800px] touch-none rounded-xl bg-white shadow-xl"
      aria-label="Interactive percentage bar model"
    />
  )
}
