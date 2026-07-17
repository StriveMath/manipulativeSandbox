import { useLayoutEffect, useState } from 'react'

// Measures the element `ref` points at and keeps a canvas-sized box in state.
//
// This was copy-pasted into all ten manipulatives, because getting it right
// took three separate bug fixes and each one had to be applied everywhere:
//
//   1. useLayoutEffect, not useEffect — measure before first paint, or the
//      canvas draws at its default 300x150 and visibly snaps to size.
//   2. contentRect, not getBoundingClientRect, inside the observer — the
//      shared ManipulativeCanvas frame scales its children with a CSS
//      transform, and contentRect is the unscaled box. getBoundingClientRect
//      returns the scaled one, which feeds back into the observer and bounces.
//   3. rAF-defer the callback and only commit whole-pixel changes — a
//      sub-pixel width change must not be able to retrigger the observer.
//
// Returns a { w, h } object whose identity is stable until a dimension
// actually changes, so it is safe to put straight into a deps array.
export function useCanvasBox(ref, { minW = 420, minH = 220 } = {}) {
  const [box, setBox] = useState({ w: 720, h: minH })

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return undefined
    let raf = 0
    const commit = (rect) => {
      const w = Math.max(minW, Math.round(rect.width))
      const h = Math.max(minH, Math.round(rect.height))
      setBox((prev) => (Math.abs(prev.w - w) >= 1 || Math.abs(prev.h - h) >= 1 ? { w, h } : prev))
    }
    commit(node.getBoundingClientRect())
    const observer = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect
      if (!cr) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => commit(cr))
    })
    observer.observe(node)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [ref, minW, minH])

  return box
}
