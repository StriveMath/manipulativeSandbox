import { border, muted } from './palette'

// The neutral pill used for presets, resets and "clear" across the set.
// Deliberately quiet: these are the controls that set a scene up, not the
// ones a student is meant to reach for while thinking.
export default function GhostButton({ children, onClick, ariaLabel, compact = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`rounded-full border bg-white text-sm font-bold ${compact ? 'px-3 py-1.5' : 'px-4 py-2'}`}
      style={{ borderColor: border, color: muted }}
    >
      {children}
    </button>
  )
}
