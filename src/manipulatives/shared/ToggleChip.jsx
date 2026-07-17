import { border, hairline, muted } from './palette'

// One reveal layer.
//
// The dot carries the layer's own colour, so the control and the thing it
// reveals read as the same idea. A teacher peels ideas back one at a time
// instead of flipping a single all-or-nothing "show answer".
//
// aria-pressed (not just visual colour) is what tells a screen reader this is
// a two-state control rather than a button that does something.
export default function ToggleChip({ label, color, on, onClick, compact = false }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border bg-white text-sm font-bold ${
        compact ? 'px-3 py-1.5' : 'px-4 py-2'
      }`}
      style={{ borderColor: on ? color : border, color: on ? color : muted }}
    >
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: on ? color : hairline }} />
      {label}
    </button>
  )
}
