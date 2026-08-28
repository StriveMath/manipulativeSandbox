import { useEffect, useMemo, useRef, useState } from 'react'

import {
  buildPreviewHtml,
  CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
} from './preview-iframe.js'

/**
 * Run a converted manipulative the way Strive will run it.
 *
 * The iframe reports its state on every change, which is what makes this a
 * verification surface rather than a screenshot: if interacting with the
 * component does not move the reported state, the student's work is sitting
 * in local `useState` and would not survive a reload. And because the report
 * crosses postMessage, a state holding a function or a DOM node fails
 * loudly here instead of silently on import.
 *
 * `reloadKey` remounts the frame, which is how both Reset and a fresh
 * conversion get a clean compile rather than a stale one.
 */
export default function ManipulativePreview({ reloadKey, ...frameProps }) {
  return <PreviewFrame key={reloadKey} {...frameProps} />
}

function PreviewFrame({
  code,
  props,
  state,
  canvasHeight = DEFAULT_CANVAS_HEIGHT,
  onStateChange,
}) {
  const frameRef = useRef(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  const html = useMemo(
    () => buildPreviewHtml({ code, props, state, canvasHeight }),
    [code, props, state, canvasHeight],
  )

  useEffect(() => {
    function onMessage(event) {
      if (event.source !== frameRef.current?.contentWindow) return
      const message = event.data
      if (!message || typeof message !== 'object') return

      if (message.type === 'ready') setStatus('ready')
      if (message.type === 'state') onStateChange?.(message.state)
      if (message.type === 'unserialisable') {
        setStatus('error')
        setError(`State is not serialisable: ${message.message}`)
      }
      if (message.type === 'error') {
        setStatus('error')
        setError(message.message)
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onStateChange])

  return (
    <div className="flex min-h-0 flex-col overflow-hidden">
      <div
        className="relative w-full overflow-hidden rounded-lg border border-slate-700 bg-white"
        style={{ aspectRatio: `${CANVAS_WIDTH} / ${canvasHeight}` }}
      >
        <iframe
          ref={frameRef}
          title="Converted manipulative preview"
          srcDoc={html}
          sandbox="allow-scripts"
          className="h-full w-full border-0"
        />
        {status === 'loading' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/70 text-xs text-slate-300">
            Compiling and mounting…
          </div>
        )}
      </div>

      {error && (
        <pre className="mt-2 max-h-32 shrink-0 overflow-auto whitespace-pre-wrap break-words rounded border border-red-900 bg-red-950/50 p-2 font-mono text-[11px] leading-relaxed text-red-300">
          {error}
        </pre>
      )}
    </div>
  )
}
