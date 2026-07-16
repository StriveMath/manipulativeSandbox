import PercentageBarModel from './PercentageBarModel.tsx'
import TriangleAreaApp from './TriangleAreaApp.tsx'
import TrapezoidAreaApp from './TrapezoidAreaApp.tsx'
import ComparingDecimals from './ComparingDecimals.tsx'
import OrderingOfDecimals from './OrderingOfDecimals.tsx'
import AbsoluteValueManipulative from './AbsoluteValueManipulative.tsx'
import VolumeOfCylinders from './VolumeOfCylinders.tsx'
import VolumeOfCone from './VolumeOfCone.tsx'
import VolumeOfSphere from './VolumeOfSphere.tsx'
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
    id: 'comparing-decimals',
    name: 'Comparing decimals',
    component: ComparingDecimals,
  },
  {
    id: 'ordering-of-decimals',
    name: 'Ordering of decimals',
    component: OrderingOfDecimals,
  },
  {
    id: 'absolute-value',
    name: 'absolute value',
    component: AbsoluteValueManipulative,
  },
  {
    id: 'volume-of-cylinders',
    name: 'Volume of Cylinders',
    component: VolumeOfCylinders,
  },
  {
    id: 'volume-of-cone',
    name: 'Volume of cone',
    component: VolumeOfCone,
  },
  {
    id: 'volume-of-sphere',
    name: 'Volume of Sphere',
    component: VolumeOfSphere,
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
