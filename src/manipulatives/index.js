import RatioTables from './ratio-table-playground/App.tsx'
import UnitRateVisualizer from './UnitRateVisualizer.tsx'
import PercentDecomposer from './PercentDecomposer.tsx'
import FruitBalanceLab from './FruitBalanceLab.tsx'
import FactorTree from './factor-tree.jsx'
import TwoFactorTrees from './two-factor-trees.jsx'

export const manipulatives = [
  {
    id: 'ratio-tables',
    name: 'Ratio Tables',
    component: RatioTables,
  },
  {
    id: 'unit-rate-visualizer',
    name: 'Unit Rate Visualizer',
    component: UnitRateVisualizer,
  },
  {
    id: 'percent-decomposer',
    name: 'Percent of Numbers: Fractions',
    component: PercentDecomposer,
  },
  {
    id: 'equivalent-ratios',
    name: 'Equivalent ratios',
    component: FruitBalanceLab,
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
