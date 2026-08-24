// Shared palette for the mjones manipulatives.
//
// The three neutrals were declared identically in all ten files. The accents
// were too, but under a different name each time (solGreen, meanGreen, posX,
// roundGreen... all #1D9E75). Import and alias at the point of use so each
// manipulative still names a colour for what it MEANS there:
//
//   import { green as solGreen, blue as testBlue } from './shared/palette'
//
// Colour carries meaning in these manipulatives, so a colour should keep its
// job across the set: green = the true/solved thing, purple = the unknown or
// the total, blue = the thing you are testing or have selected, orange/red =
// the leftover, the distance, the negative.
//
// Domain colours (pizza cheese, balance-beam wood) stay in their own file —
// they mean nothing outside it.

export const cream = '#F8F6F0'
export const ink = '#1A1A2E'
export const muted = '#5F5E5A'
export const border = '#E0DDD6'
export const hairline = '#C9CDD6'

export const green = '#1D9E75'
export const purple = '#7C3AED'
export const blue = '#2563EB'
export const orange = '#D85A30'
export const amber = '#D97706'
export const red = '#D8402F'
