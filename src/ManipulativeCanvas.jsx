import { useLayoutEffect, useRef, useState } from 'react'

const canvasWidth = 800
const canvasHeight = 500

export default function ManipulativeCanvas({ children }) {
  const frameRef = useRef(null)
  const contentRef = useRef(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const frame = frameRef.current
    const content = contentRef.current
    if (!frame || !content) return

    const updateScale = () => {
      const frameRect = frame.getBoundingClientRect()
      const contentWidth = Math.max(canvasWidth, content.scrollWidth)
      const contentHeight = Math.max(canvasHeight, content.scrollHeight)
      setScale(Math.min(1, frameRect.width / contentWidth, frameRect.height / contentHeight))
    }

    updateScale()

    const resizeObserver = new ResizeObserver(updateScale)
    resizeObserver.observe(frame)
    resizeObserver.observe(content)

    return () => resizeObserver.disconnect()
  }, [children])

  return (
    <div
      ref={frameRef}
      className="mx-auto aspect-[8/5] w-full max-w-[800px] overflow-hidden border border-blue-400 bg-slate-50"
    >
      <div
        ref={contentRef}
        className="origin-top-left"
        style={{
          transform: `scale(${scale})`,
          width: canvasWidth,
          minHeight: canvasHeight,
        }}
      >
        {children}
      </div>
    </div>
  )
}
