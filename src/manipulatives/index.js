import AreaModelMultiplication from './area-model-multiplication.jsx'
import DecimalHundredthsGrid from './decimal-hundredths-grid.jsx'
import DecimalNumberLine from './decimal-number-line.jsx'
import DecimalPlaceValueDisks from './decimal-place-value-disks.jsx'
import FactorTree from './factor-tree.jsx'
import FractionBars from './fraction-bars.jsx'
import PlaceValueDisks from './place-value-disks.jsx'
import TwoFactorTrees from './two-factor-trees.jsx'

export const manipulatives = [
  {
    id: 'factor-tree',
    name: 'Factor Tree',
    component: FactorTree,
  },
  {
    id: 'fraction-bars',
    name: 'Fraction Bars',
    component: FractionBars,
  },
  {
    id: 'area-model-multiplication',
    name: 'Area Model Multiplication',
    component: AreaModelMultiplication,
  },
  {
    id: 'place-value-disks',
    name: 'Place Value Disks',
    component: PlaceValueDisks,
  },
  {
    id: 'decimal-place-value-disks',
    name: 'Decimal Place Value Disks',
    component: DecimalPlaceValueDisks,
  },
  {
    id: 'decimal-hundredths-grid',
    name: 'Decimal Hundredths Grid',
    component: DecimalHundredthsGrid,
  },
  {
    id: 'decimal-number-line',
    name: 'Decimal Number Line',
    component: DecimalNumberLine,
  },
  {
    id: 'two-factor-trees',
    name: 'Two Factor Trees',
    component: TwoFactorTrees,
  },
]
