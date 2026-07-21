import AngleRelationships from './angle-relationships.jsx'
import AddingUnlikeFractions from './adding-unlike-fractions.jsx'
import BoxPlotBuilder from './box-plot-builder.jsx'
import ComparingTwoPopulations from './comparing-two-populations.jsx'
import CoordinateConnectDots from './coordinate-connect-dots.jsx'
import CoordinateTreasureMap from './coordinate-treasure-map.jsx'
import DistributiveAreaModel from './distributive-area-model.jsx'
import DistanceCoordinatePlane from './distance-coordinate-plane.jsx'
import ElapsedTimeClock from './elapsed-time-clock.jsx'
import ExploreRatios from './explore-ratios.jsx'
import FactorRainbow from './factor-rainbow.jsx'
import FactorTree from './factor-tree.jsx'
import FractionsNumberLine from './fractions-number-line.jsx'
import FunctionMachineDetective from './function-machine-detective.jsx'
import HcfBuilder from './hcf-builder.jsx'
import IntegerMultiplyDivide from './integer-multiply-divide.jsx'
import LcmCirclingPairs from './lcm-circling-pairs.jsx'
import LinearEquationGrapher from './linear-equation-grapher.jsx'
import MeanBalancePoint from './mean-balance-point.jsx'
import NetsSurfaceArea from './nets-surface-area.jsx'
import NumberLineAddSubtract from './number-line-add-subtract.jsx'
import NumberLineExplorer from './number-line-explorer.jsx'
import ParallelogramArea from './parallelogram-area.jsx'
import PolygonInteriorAngles from './polygon-interior-angles.jsx'
import ProbabilitySpinner from './probability-spinner.jsx'
import RatioBalanceScale from './ratio-balance-scale.jsx'
import ScatterLineFit from './scatter-line-fit.jsx'
import SlopeExplorer from './slope-explorer.jsx'
import SubstitutionMachine from './substitution-machine.jsx'
import SystemsOfEquations from './systems-of-equations.jsx'
import TwoWayTables from './two-way-tables.jsx'
import TwoFactorTrees from './two-factor-trees.jsx'
import TwoStepEquationSolver from './two-step-equation-solver.jsx'
import UnitRateExplorer from './unit-rate-better-buy.jsx'
import VolumePrisms from './volume-prisms.jsx'
import LinearVsNonlinear from './linear-vs-nonlinear.jsx'
import RateOfChangeExplorer from './rate-of-change-explorer.jsx'
import PercentParkDesigner from './percent-park-designer.jsx'

export const manipulatives = [
  {
    id: 'percent-park-designer',
    name: 'Percent Park Designer',
    component: PercentParkDesigner,
  },
  {
    id: 'rate-of-change-explorer',
    name: 'Rate of Change Explorer',
    component: RateOfChangeExplorer,
  },
  {
    id: 'linear-vs-nonlinear',
    name: 'Linear vs Non-Linear',
    component: LinearVsNonlinear,
  },
  {
    id: 'adding-unlike-fractions',
    name: 'Adding Unlike Fractions',
    component: AddingUnlikeFractions,
  },
  {
    id: 'angle-relationships',
    name: 'Angle Relationships',
    component: AngleRelationships,
  },
  {
    id: 'box-plot-builder',
    name: 'Box Plot Builder',
    component: BoxPlotBuilder,
  },
  {
    id: 'comparing-two-populations',
    name: 'Comparing Two Populations',
    component: ComparingTwoPopulations,
  },
  {
    id: 'coordinate-connect-dots',
    name: 'Coordinate Connect-the-Dots',
    component: CoordinateConnectDots,
  },
  {
    id: 'coordinate-treasure-map',
    name: 'Coordinate Treasure Map',
    component: CoordinateTreasureMap,
  },
  {
    id: 'distributive-area-model',
    name: 'Distributive Area Model',
    component: DistributiveAreaModel,
  },
  {
    id: 'distance-coordinate-plane',
    name: 'Distance on a Coordinate Plane',
    component: DistanceCoordinatePlane,
  },
  {
    id: 'elapsed-time-clock',
    name: 'Elapsed Time Clock',
    component: ElapsedTimeClock,
  },
  {
    id: 'explore-ratios',
    name: 'Explore Ratios',
    component: ExploreRatios,
  },
  {
    id: 'factor-rainbow',
    name: 'Factor Rainbow',
    component: FactorRainbow,
  },
  {
    id: 'fractions-number-line',
    name: 'Fractions on a Number Line',
    component: FractionsNumberLine,
  },
  {
    id: 'function-machine-detective',
    name: 'Function Machine Detective',
    component: FunctionMachineDetective,
  },
  {
    id: 'hcf-builder',
    name: 'HCF / GCF Builder',
    component: HcfBuilder,
  },
  {
    id: 'integer-multiply-divide',
    name: 'Integer Multiply/Divide',
    component: IntegerMultiplyDivide,
  },
  {
    id: 'lcm-circling-pairs',
    name: 'LCM Builder',
    component: LcmCirclingPairs,
  },
  {
    id: 'linear-equation-grapher',
    name: 'Linear Equation Grapher',
    component: LinearEquationGrapher,
  },
  {
    id: 'number-line-explorer',
    name: 'Number Line Explorer',
    component: NumberLineExplorer,
  },
  {
    id: 'number-line-add-subtract',
    name: 'Number Line Add/Subtract',
    component: NumberLineAddSubtract,
  },
  {
    id: 'mean-balance-point',
    name: 'Mean Balance Point',
    component: MeanBalancePoint,
  },
  {
    id: 'nets-surface-area',
    name: 'Nets & Surface Area',
    component: NetsSurfaceArea,
  },
  {
    id: 'polygon-interior-angles',
    name: 'Polygon Interior Angles',
    component: PolygonInteriorAngles,
  },
  {
    id: 'probability-spinner',
    name: 'Probability Spinner',
    component: ProbabilitySpinner,
  },
  {
    id: 'ratio-balance-scale',
    name: 'Ratio Balance Scale',
    component: RatioBalanceScale,
  },
  {
    id: 'scatter-line-fit',
    name: 'Scatter Plot & Line of Best Fit',
    component: ScatterLineFit,
  },
  {
    id: 'substitution-machine',
    name: 'Substitution Machine',
    component: SubstitutionMachine,
  },
  {
    id: 'systems-of-equations',
    name: 'Systems of Equations',
    component: SystemsOfEquations,
  },
  {
    id: 'two-way-tables',
    name: 'Two-Way Tables',
    component: TwoWayTables,
  },
  {
    id: 'two-step-equation-solver',
    name: 'Two-Step Equation Solver',
    component: TwoStepEquationSolver,
  },
  {
    id: 'slope-explorer',
    name: 'Slope Explorer',
    component: SlopeExplorer,
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
  {
    id: 'unit-rate-explorer',
    name: 'Unit Rate Explorer',
    component: UnitRateExplorer,
  },
  {
    id: 'volume-prisms',
    name: 'Volume of Prisms',
    component: VolumePrisms,
  },
]
