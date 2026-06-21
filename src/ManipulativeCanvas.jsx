import { useLayoutEffect, useRef, useState } from 'react'

const canvasWidth = 800
const canvasHeight = 500

export default function ManipulativeCanvas({ children }) {
  const contentRef = useRef(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return

    const updateScale = () => {
      const width = content.scrollWidth || canvasWidth
      const height = content.scrollHeight || canvasHeight
      setScale(Math.min(1, canvasWidth / width, canvasHeight / height))
    }

    updateScale()

    const resizeObserver = new ResizeObserver(updateScale)
    resizeObserver.observe(content)

    return () => resizeObserver.disconnect()
  }, [children])

  return (
    <div className="mx-auto h-[500px] w-[800px] overflow-hidden rounded-[18px] border border-slate-300/90 bg-slate-50 shadow-2xl shadow-black/40">
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
