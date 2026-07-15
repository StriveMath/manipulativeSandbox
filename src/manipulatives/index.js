import AngleRelationships from './angle-relationships.jsx'
import AddingUnlikeFractions from './adding-unlike-fractions.jsx'
import BoxPlotBuilder from './box-plot-builder.jsx'
import CoordinateConnectDots from './coordinate-connect-dots.jsx'
import CoordinateTreasureMap from './coordinate-treasure-map.jsx'
import PercentageBarModel from './PercentageBarModel.tsx'
import TriangleAreaApp from './TriangleAreaApp.tsx'
import TrapezoidAreaApp from './TrapezoidAreaApp.tsx'
import AreaModelMultiplication from './area-model-multiplication.jsx'
import AddingSubtractingFractions from './adding-subtracting-fractions.jsx'
import DecimalHundredthsGrid from './decimal-hundredths-grid.jsx'
import DecimalNumberLine from './decimal-number-line.jsx'
import DecimalPlaceValueDisks from './decimal-place-value-disks.jsx'
import DecimalPlaceValueStrips from './decimal-place-value-strips.jsx'
import FactorTree from './factor-tree.jsx'
import EquivalentFractionsVisual from './equivalent-fractions-visual.jsx'
import FractionBars from './fraction-bars.jsx'
import FractionDivisionBarModel from './fraction-division-bar-model.jsx'
import FractionsNumberLine from './fractions-number-line.jsx'
import FractionsNumberLineChallenge from './fractions-number-line-pr8.jsx'
import DistributiveAreaModel from './distributive-area-model.jsx'
import ElapsedTimeClock from './elapsed-time-clock.jsx'
import ExploreRatios from './explore-ratios.jsx'
import FactorRainbow from './factor-rainbow.jsx'
import IntegerMultiplyDivide from './integer-multiply-divide.jsx'
import LinearEquationGrapher from './linear-equation-grapher.jsx'
import MeanBalancePoint from './mean-balance-point.jsx'
import NetsSurfaceArea from './nets-surface-area.jsx'
import NumberLineAddSubtract from './number-line-add-subtract.jsx'
import NumberLineExplorer from './number-line-explorer.jsx'
import ParallelogramArea from './parallelogram-area.jsx'
import PlaceValueDisks from './place-value-disks.jsx'
import PowerOf10BlobExplorer from './power-of-10-blob-explorer.jsx'
import PowersOf10PlaceValueShift from './powers-of-10-place-value-shift.jsx'
import ProportionalVsNonProportionalGraphs from './proportional-vs-non-proportional-graphs.jsx'
import ScaleDrawingsMaps from './scale-drawings-maps.jsx'
import PolygonInteriorAngles from './polygon-interior-angles.jsx'
import ProbabilitySpinner from './probability-spinner.jsx'
import RatioBalanceScale from './ratio-balance-scale.jsx'
import ScatterLineFit from './scatter-line-fit.jsx'
import SlopeExplorer from './slope-explorer.jsx'
import SubstitutionMachine from './substitution-machine.jsx'
import TwoFactorTrees from './two-factor-trees.jsx'
import UnitRateExplorer from './unit-rate-better-buy.jsx'
import VolumePrisms from './volume-prisms.jsx'

export const manipulatives = [
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
    id: 'fractions-number-line-challenge',
    name: 'Fractions on a Number Line',
    component: FractionsNumberLineChallenge,
  },
  {
    id: 'integer-multiply-divide',
    name: 'Integer Multiply/Divide',
    component: IntegerMultiplyDivide,
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
    id: 'fraction-bars',
    name: 'Fraction Bars',
    component: FractionBars,
  },
  {
    id: 'equivalent-fractions-visual',
    name: 'Equivalent Fractions Visual',
    component: EquivalentFractionsVisual,
  },
  {
    id: 'fraction-division-bar-model',
    name: 'Fraction Division Bar Model',
    component: FractionDivisionBarModel,
  },
  {
    id: 'adding-subtracting-fractions',
    name: 'Adding & Subtracting Fractions',
    component: AddingSubtractingFractions,
  },
  {
    id: 'fractions-number-line',
    name: 'Compare Fractions on a Number Line',
    component: FractionsNumberLine,
  },
  {
    id: 'proportional-vs-non-proportional-graphs',
    name: 'Proportional vs Non-Proportional Graphs',
    component: ProportionalVsNonProportionalGraphs,
  },
  {
    id: 'scale-drawings-maps',
    name: 'Scale Drawings & Maps',
    component: ScaleDrawingsMaps,
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
    id: 'decimal-place-value-strips',
    name: 'Decimal Place Value Strips',
    component: DecimalPlaceValueStrips,
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
    id: 'powers-of-10-place-value-shift',
    name: 'Powers of 10 Place Value Shift',
    component: PowersOf10PlaceValueShift,
  },
  {
    id: 'power-of-10-blob-explorer',
    name: 'Multiplying & Dividing by Powers of 10',
    component: PowerOf10BlobExplorer,
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
