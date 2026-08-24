import { useEffect, useRef, useState } from 'react'

const initialNodes = [
  {
    id: 'root',
    value: null,
    parent: null,
    children: [],
    isPrime: false,
    x: 380,
    y: 60,
  },
]

const nodeRadius = 25
const inputWidth = 34
const inputHeight = 20
const inputHitboxWidth = 44
const inputHitboxHeight = 30
const actionButtonWidth = 68
const actionButtonHeight = 28
const actionGap = 6
const svgViewportWidth = 760
const svgViewportHeight = 340

export default function FactorTree() {
  const [nodes, setNodes] = useState(initialNodes)
  const [hoveredNodeId, setHoveredNodeId] = useState(null)
  const hideActionsTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (hideActionsTimerRef.current) clearTimeout(hideActionsTimerRef.current)
    }
  }, [])

  const showActionsFor = (nodeId) => {
    if (hideActionsTimerRef.current) clearTimeout(hideActionsTimerRef.current)
    setHoveredNodeId(nodeId)
  }

  const hideActionsSoon = () => {
    if (hideActionsTimerRef.current) clearTimeout(hideActionsTimerRef.current)
    hideActionsTimerRef.current = setTimeout(() => {
      setHoveredNodeId(null)
    }, 4000)
  }

  const getDepth = (node, allNodes) => {
    let depth = 0
    let cur = node
    while (cur && cur.parent) {
      cur = allNodes.find((n) => n.id === cur.parent)
      depth++
    }
    return depth
  }

  const withChildren = (allNodes, nodeId) => {
    const node = allNodes.find((n) => n.id === nodeId)
    if (!node || node.children.length > 0 || node.value == null || node.isPrime) {
      return allNodes
    }


    const depth = getDepth(node, allNodes)
    const dx = 120 / Math.pow(2, depth)
    const child1Id = `${nodeId}-c1`
    const child2Id = `${nodeId}-c2`

    return allNodes
      .map((n) =>
        n.id === nodeId
          ? { ...n, children: [child1Id, child2Id], isPrime: false }
          : n
      )
      .concat([
        {
          id: child1Id,
          value: null,
          parent: nodeId,
          children: [],
          isPrime: false,
          x: node.x - dx,
          y: node.y + 90,
        },
        {
          id: child2Id,
          value: null,
          parent: nodeId,
          children: [],
          isPrime: false,
          x: node.x + dx,
          y: node.y + 90,
        },
      ])
  }

  const isDescendant = (node, ancestorId, allNodes) => {
    if (node.parent === ancestorId) return true
    if (!node.parent) return false
    const parent = allNodes.find((n) => n.id === node.parent)
    return parent ? isDescendant(parent, ancestorId, allNodes) : false
  }

  const setValue = (nodeId, raw) => {
    const parsed = raw === '' ? null : parseInt(raw, 10)
    const value = parsed === null || isNaN(parsed) ? null : parsed
    setNodes((prev) => {
      const next = prev.map((n) =>
        n.id === nodeId ? { ...n, value, isPrime: value == null ? false : n.isPrime } : n
      )
      return value == null ? next : withChildren(next, nodeId)
    })
  }

  const togglePrime = (nodeId) => {
    setNodes((prev) => {
      const node = prev.find((n) => n.id === nodeId)
      if (!node) return prev

      if (!node.isPrime) {
        return prev
          .filter((n) => !isDescendant(n, nodeId, prev))
          .map((n) =>
            n.id === nodeId ? { ...n, children: [], isPrime: true } : n
          )
      }

      const unmarked = prev.map((n) =>
        n.id === nodeId ? { ...n, isPrime: false } : n
      )
      return withChildren(unmarked, nodeId)
    })
  }

  const hasEmptyChildren = (node) =>
    node.children.some((childId) => {
      const child = nodes.find((n) => n.id === childId)
      return child?.value == null
    })

  const shouldShowPrimeAction = (node) =>
    node.children.length === 0 || hasEmptyChildren(node)

  const minNodeX = Math.min(...nodes.map((n) => n.x))
  const maxNodeX = Math.max(...nodes.map((n) => n.x))
  const maxNodeY = Math.max(...nodes.map((n) => n.y))
  const viewBoxX = Math.min(0, minNodeX - 90)
  const viewBoxWidth = Math.max(
    svgViewportWidth,
    maxNodeX + 130 - viewBoxX
  )
  const viewBoxHeight = Math.max(svgViewportHeight, maxNodeY + 90)

  return (
    <div className="box-border flex h-full flex-col p-4">
      <svg
        width={svgViewportWidth}
        height={svgViewportHeight}
        viewBox={`${viewBoxX} 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="mx-auto shrink-0"
        preserveAspectRatio="xMidYMid meet"
      >
        {nodes.map((node) =>
          node.children.map((childId) => {
            const child = nodes.find((n) => n.id === childId)
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
          })
        )}

        {nodes.map((node) => {
          const showActions = hoveredNodeId === node.id
          const showPrime = showActions && shouldShowPrimeAction(node)

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
                fill={node.isPrime ? '#10b981' : '#e2e8f0'}
                stroke={node.isPrime ? '#059669' : '#94a3b8'}
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
                    onChange={(e) => setValue(node.id, e.target.value)}
                    className={`block rounded border p-0 text-center text-sm leading-none outline-none focus:border-slate-400 ${
                      node.isPrime
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
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
                    onClick={() => togglePrime(node.id)}
                    className={`w-full h-full rounded border text-xs font-medium leading-none ${
                      node.isPrime
                        ? 'bg-emerald-500 border-emerald-600 text-white'
                        : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {node.isPrime ? 'Prime' : '? Prime'}
                  </button>
                </foreignObject>
              )}
            </g>
          )
        })}
      </svg>

      <div className="mt-4 shrink-0 text-sm text-slate-600 text-center">
        <span className="inline-flex items-center gap-2">
          <span className="w-4 h-4 bg-emerald-500 rounded-full"></span>
          Prime number
        </span>
        <span className="inline-flex items-center gap-2 ml-4">
          <span className="w-4 h-4 bg-slate-200 border border-slate-400 rounded-full"></span>
          Composite number
        </span>
      </div>

      <div className="mt-2 shrink-0 text-xs text-slate-500 text-center">
        Type a number in a node to create children automatically. Hover a node to mark it prime.
      </div>
    </div>
  )
}
