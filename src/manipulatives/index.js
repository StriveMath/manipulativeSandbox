import CoordinateTreasureMap from './coordinate-treasure-map.jsx'
import FactorTree from './factor-tree.jsx'
import NumberLineExplorer from './number-line-explorer.jsx'
import ParallelogramArea from './parallelogram-area.jsx'
import TwoFactorTrees from './two-factor-trees.jsx'

export const manipulatives = [
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
