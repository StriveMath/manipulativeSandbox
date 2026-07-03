import BalanceScaleEquations from './balance-scale-equations.jsx'
import CoordinateTreasureMap from './coordinate-treasure-map.jsx'
import FactorTree from './factor-tree.jsx'
import MeanBalancePoint from './mean-balance-point.jsx'
import MultiplyingFractionsArea from './multiplying-fractions-area.jsx'
import NumberLineExplorer from './number-line-explorer.jsx'
import ParallelogramArea from './parallelogram-area.jsx'
import PizzaRemainder from './pizza-remainder.jsx'
import RoundingNumberLine from './rounding-number-line.jsx'
import TwoFactorTrees from './two-factor-trees.jsx'

export const manipulatives = [
  {
    id: 'pizza-remainder',
    name: 'Pizza Remainder',
    component: PizzaRemainder,
  },
  {
    id: 'multiplying-fractions-area',
    name: 'Multiplying Fractions (Area)',
    component: MultiplyingFractionsArea,
  },
  {
    id: 'balance-scale-equations',
    name: 'Balance Scale Equations',
    component: BalanceScaleEquations,
  },
  {
    id: 'rounding-number-line',
    name: 'Rounding on a Number Line',
    component: RoundingNumberLine,
  },
  {
    id: 'coordinate-treasure-map',
    name: 'Coordinate Treasure Map',
    component: CoordinateTreasureMap,
  },
  {
    id: 'number-line-explorer',
    name: 'Number Line Explorer',
    component: NumberLineExplorer,
  },
  {
    id: 'mean-balance-point',
    name: 'Mean Balance Point',
    component: MeanBalancePoint,
  },
  {
    id: 'parallelogram-area',
    name: 'Parallelogram Area',
    component: ParallelogramArea,
  },
  {
    id: 'factor-tree',
    name: 'Factor Tree',
    component: FactorTree,
  },
  {
    id: 'two-factor-trees',
    name: 'Two Factor Trees',
    component: TwoFactorTrees,
  },
]
