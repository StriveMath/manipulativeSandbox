import { useEffect, useRef, useState } from 'react'

const nodeRadius = 25
const inputWidth = 44
const inputHeight = 24
const inputHitboxWidth = 54
const inputHitboxHeight = 34
const actionButtonWidth = 68
const actionButtonHeight = 28
const actionGap = 6
const svgViewportWidth = 760
const svgViewportHeight = 340

function nodeId(path) {
  return path.length === 0 ? 'root' : `factor-${path.join('-')}`
}

function replaceFactorAtPath(factors, path, updateFactor) {
  const [index, ...remainingPath] = path

  return factors.map((factor, factorIndex) => {
    if (factorIndex !== index) return factor
    if (remainingPath.length === 0) return updateFactor(factor)

    return {
      ...factor,
      factors: replaceFactorAtPath(
        factor?.factors ?? [],
        remainingPath,
        updateFactor,
      ),
    }
  })
}

function flattenTree(startNumber, factors) {
  const nodes = []

  function addNode({
    factor,
    path,
    parentId,
    parentX,
    parentY,
    parentDepth,
    index,
  }) {
    const depth = parentDepth + 1
    const horizontalOffset = 100 / Math.pow(2, parentDepth)
    const x = parentX + (index === 0 ? -horizontalOffset : horizontalOffset)
    const y = parentY + 90
    const children = factor?.factors ?? []
    const id = nodeId(path)

    nodes.push({
      id,
      path,
      parentId,
      value: factor?.value ?? null,
      prime: factor?.prime === true,
      x,
      y,
      childIds: children.map((_, childIndex) =>
        nodeId([...path, childIndex]),
      ),
    })

    children.forEach((childFactor, childIndex) => {
      addNode({
        factor: childFactor,
        path: [...path, childIndex],
        parentId: id,
        parentX: x,
        parentY: y,
        parentDepth: depth,
        index: childIndex,
      })
    })
  }

  nodes.push({
    id: 'root',
    path: [],
    parentId: null,
    value: startNumber,
    prime: false,
    x: 300,
    y: 50,
    childIds: factors.map((_, index) => nodeId([index])),
  })

  factors.forEach((factor, index) => {
    addNode({
      factor,
      path: [index],
      parentId: 'root',
      parentX: 300,
      parentY: 50,
      parentDepth: 0,
      index,
    })
  })

  return nodes
}

function isFactorComplete(factor) {
  if (!factor || factor.value == null) return false
  if (factor.prime) return true

  return (
    factor.factors?.length === 2 &&
    factor.factors.every((childFactor) => isFactorComplete(childFactor))
  )
}

export default function FactorTree({ props, state, setState }) {
  const [hoveredNodeId, setHoveredNodeId] = useState(null)
  const hideActionsTimerRef = useRef(null)
  const nodes = flattenTree(props.startNumber, state.factors)
  const complete =
    state.factors.length === 2 &&
    state.factors.every((factor) => isFactorComplete(factor))

  useEffect(() => {
    return () => {
      if (hideActionsTimerRef.current) {
        clearTimeout(hideActionsTimerRef.current)
      }
    }
  }, [])

  const showActionsFor = (id) => {
    if (hideActionsTimerRef.current) {
      clearTimeout(hideActionsTimerRef.current)
    }
    setHoveredNodeId(id)
  }

  const hideActionsSoon = () => {
    if (hideActionsTimerRef.current) {
      clearTimeout(hideActionsTimerRef.current)
    }
    hideActionsTimerRef.current = setTimeout(() => {
      setHoveredNodeId(null)
    }, 4000)
  }

  const setValue = (path, rawValue) => {
    const parsedValue = rawValue === '' ? null : Number.parseInt(rawValue, 10)
    const value =
      parsedValue === null || Number.isNaN(parsedValue) ? null : parsedValue

    setState((previousState) => ({
      ...previousState,
      factors: replaceFactorAtPath(
        previousState.factors,
        path,
        (factor) => {
          if (value == null) return null
          if (factor?.prime) return { value, prime: true }

          return {
            value,
            factors: factor?.factors ?? [null, null],
          }
        },
      ),
    }))
  }

  const togglePrime = (path) => {
    setState((previousState) => ({
      ...previousState,
      factors: replaceFactorAtPath(
        previousState.factors,
        path,
        (factor) => {
          if (!factor || factor.value == null) return factor
          if (factor.prime) {
            return { value: factor.value, factors: [null, null] }
          }

          return { value: factor.value, prime: true }
        },
      ),
    }))
  }

  const hasEmptyChildren = (node) =>
    node.childIds.some((childId) => {
      const child = nodes.find((candidate) => candidate.id === childId)
      return child?.value == null
    })

  const shouldShowPrimeAction = (node) =>
    node.id !== 'root' &&
    node.value != null &&
    (node.childIds.length === 0 || hasEmptyChildren(node))

  const minNodeX = Math.min(...nodes.map((node) => node.x))
  const maxNodeX = Math.max(...nodes.map((node) => node.x))
  const maxNodeY = Math.max(...nodes.map((node) => node.y))
  const viewBoxX = Math.min(0, minNodeX - 90)
  const viewBoxWidth = Math.max(
    svgViewportWidth,
    maxNodeX + 130 - viewBoxX,
  )
  const viewBoxHeight = Math.max(svgViewportHeight, maxNodeY + 90)

  return (
    <div className="box-border flex h-full flex-col overflow-hidden p-4">
      <div className="shrink-0 text-center">
        <p className="text-sm font-semibold text-slate-700">
          Build a prime factor tree for {props.startNumber}
        </p>
        {complete && (
          <p className="mt-1 text-xs font-semibold text-emerald-600">
            Factor tree complete
          </p>
        )}
      </div>

      <svg
        width={svgViewportWidth}
        height={svgViewportHeight}
        viewBox={`${viewBoxX} 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="mx-auto shrink-0"
        preserveAspectRatio="xMidYMid meet"
      >
        {nodes.map((node) =>
          node.childIds.map((childId) => {
            const child = nodes.find((candidate) => candidate.id === childId)
            return child ? (
              <line
                key={`${node.id}-${childId}`}
                x1={node.x}
                y1={node.y}
                x2={child.x}
                y2={child.y}
                stroke="#94a3b8"
                strokeWidth="2"
              />
            ) : null
          }),
        )}

        {nodes.map((node) => {
          const showActions = hoveredNodeId === node.id
          const showPrime = showActions && shouldShowPrimeAction(node)
          const isRoot = node.id === 'root'

          return (
            <g
              key={node.id}
              onMouseEnter={() => showActionsFor(node.id)}
              onMouseLeave={hideActionsSoon}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={nodeRadius}
                fill={node.prime ? '#10b981' : '#e2e8f0'}
                stroke={node.prime ? '#059669' : '#94a3b8'}
                strokeWidth="2"
              />

              <foreignObject
                x={node.x - inputHitboxWidth / 2}
                y={node.y - inputHitboxHeight / 2}
                width={inputHitboxWidth}
                height={inputHitboxHeight}
              >
                <div className="flex h-full w-full items-center justify-center">
                  <input
                    type="number"
                    min="2"
                    value={node.value ?? ''}
                    readOnly={isRoot}
                    aria-label={
                      isRoot
                        ? `Starting number ${props.startNumber}`
                        : `Factor for ${props.startNumber}`
                    }
                    onChange={(event) =>
                      setValue(node.path, event.target.value)
                    }
                    className={`block rounded border p-0 text-center text-sm leading-none outline-none focus:border-slate-400 ${
                      node.prime
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                        : isRoot
                          ? 'border-slate-400 bg-slate-100 font-semibold text-slate-800'
                          : 'border-slate-300 bg-white text-slate-700'
                    }`}
                    style={{
                      width: inputWidth,
                      height: inputHeight,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </foreignObject>

              {showPrime && (
                <foreignObject
                  x={node.x + nodeRadius + actionGap}
                  y={node.y - actionButtonHeight / 2}
                  width={actionButtonWidth}
                  height={actionButtonHeight}
                >
                  <button
                    type="button"
                    onMouseEnter={() => showActionsFor(node.id)}
                    onMouseLeave={hideActionsSoon}
                    onClick={() => togglePrime(node.path)}
                    className={`h-full w-full rounded border text-xs font-medium leading-none ${
                      node.prime
                        ? 'border-emerald-600 bg-emerald-500 text-white'
                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {node.prime ? 'Prime' : '? Prime'}
                  </button>
                </foreignObject>
              )}
            </g>
          )
        })}
      </svg>

      <div className="mt-2 shrink-0 text-center text-sm text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 rounded-full bg-emerald-500" />
          Prime number
        </span>
        <span className="ml-4 inline-flex items-center gap-2">
          <span className="h-4 w-4 rounded-full border border-slate-400 bg-slate-200" />
          Composite number
        </span>
      </div>

      <p className="mt-2 shrink-0 text-center text-xs text-slate-500">
        Enter factors in the empty nodes. Hover a node to mark it prime.
      </p>
    </div>
  )
}
