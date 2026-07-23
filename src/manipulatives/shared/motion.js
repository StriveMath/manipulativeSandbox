// Should this frame animate, or just arrive?
//
// Two reasons to skip the motion and jump straight to the end state:
//
//   - the viewer asked for reduced motion, and a manipulative that slides
//     things around is exactly what that setting is for;
//   - the document is hidden, where requestAnimationFrame does not fire at
//     all. Animating a tab nobody is looking at buys nothing, and easing must
//     never be the only path to a correct frame — otherwise a manipulative
//     built while hidden is still mid-flight when it is first shown.
export function skipMotion() {
  if (typeof window === 'undefined') return true
  if (typeof document !== 'undefined' && document.hidden) return true
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}
