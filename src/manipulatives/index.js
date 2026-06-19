import AreaOfParallelogram from './area-of-parallelogram.jsx'
import FactorTree from './factor-tree.jsx'
import TwoFactorTrees from './two-factor-trees.jsx'
import UnitRateSplitterLab from './unit-rate-splitter-lab.jsx'

export const manipulatives = [
  {
    id: 'unit-rate-splitter-lab',
    name: 'Ratios - Unit rates',
    component: UnitRateSplitterLab,
  },
  {
    id: 'area-of-parallelogram',
    name: 'Area of Parallelogram',
    component: AreaOfParallelogram,
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
