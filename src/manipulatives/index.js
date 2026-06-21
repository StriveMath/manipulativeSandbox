import AreaOfParallelogram from './area-of-parallelogram.jsx'
import FactorTree from './factor-tree.jsx'
import RatiosUnitRate from './RatiosUnitRate.tsx'
import TwoFactorTrees from './two-factor-trees.jsx'

export const manipulatives = [
  {
    id: 'unit-rate-splitter-lab',
    name: 'Ratios - Unit rates',
    component: RatiosUnitRate,
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
