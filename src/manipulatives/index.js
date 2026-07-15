import PercentageBarModel from './PercentageBarModel.tsx'
import TriangleAreaApp from './TriangleAreaApp.tsx'
import TrapezoidAreaApp from './TrapezoidAreaApp.tsx'
import FactorTree from './factor-tree.jsx'
import TwoFactorTrees from './two-factor-trees.jsx'

export const manipulatives = [
  {
    id: 'percentage-bar-model',
    name: 'Percentage bar model',
    component: PercentageBarModel,
  },
  {
    id: 'area-of-a-triangle',
    name: 'Area of a triangle',
    component: TriangleAreaApp,
  },
  {
    id: 'area-of-trapezoid',
    name: 'Area of Trapezoid',
    component: TrapezoidAreaApp,
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
