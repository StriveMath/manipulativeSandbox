import FactorTree from './factor-tree/FactorTree.jsx'
import factorTreeData from './factor-tree/data.json'

export const liveManipulatives = [
  {
    id: 'factor-tree',
    name: 'Factor Tree',
    component: FactorTree,
    data: factorTreeData,
    sandboxPath: '/approved/factor-tree',
  },
]
