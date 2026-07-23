import { border, green, orange } from './palette'

// −/value/+ control. Was written three times with cosmetic drift between the
// copies (different column widths, `color` vs `accent`, different font sizes).
//
// decLabel/incLabel exist because the right screen-reader wording depends on
// what is being counted: "More pizzas" reads naturally, "Increase pizzas"
// does not, and for an abstract boundary value it is the other way round.
export default function Stepper({ label, value, color, onDec, onInc, decLabel, incLabel }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold" style={{ color }}>
        {label}
      </span>
      <div
        className="grid grid-cols-[38px_46px_38px] items-center overflow-hidden rounded-full border bg-white"
        style={{ borderColor: border }}
      >
        <button
          type="button"
          onClick={onDec}
          className="h-10 text-2xl font-black"
          style={{ color: orange }}
          aria-label={decLabel || `Decrease ${label}`}
        >
          −
        </button>
        <span
          className="border-x py-2 text-center text-lg font-black tabular-nums"
          style={{ borderColor: border }}
          aria-live="polite"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={onInc}
          className="h-10 text-2xl font-black"
          style={{ color: green }}
          aria-label={incLabel || `Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  )
}
