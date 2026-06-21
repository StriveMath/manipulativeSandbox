import { useEffect, useRef, useState } from 'react'

const leftInitialNodes = [
  {
    id: 'left-root',
    value: null,
    parent: null,
    children: [],
    isPrime: false,
    x: 200,
    y: 70,
  },
]

const rightInitialNodes = [
  {
    id: 'right-root',
    value: null,
    parent: null,
    children: [],
    isPrime: false,
    x: 600,
    y: 70,
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

export default function TwoFactorTrees() {
  const [leftNodes, setLeftNodes] = useState(leftInitialNodes)
  const [rightNodes, setRightNodes] = useState(rightInitialNodes)
  const [hoveredNodeKey, setHoveredNodeKey] = useState(null)
  const hideActionsTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (hideActionsTimerRef.current) clearTimeout(hideActionsTimerRef.current)
    }
  }, [])

  const showActionsFor = (nodeKey) => {
    if (hideActionsTimerRef.current) clearTimeout(hideActionsTimerRef.current)
    setHoveredNodeKey(nodeKey)
  }

  const hideActionsSoon = () => {
    if (hideActionsTimerRef.current) clearTimeout(hideActionsTimerRef.current)
    hideActionsTimerRef.current = setTimeout(() => {
      setHoveredNodeKey(null)
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
    const dx = 90 / Math.pow(2, depth)
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

  const updateValue = (setTreeNodes, nodeId, raw) => {
    const parsed = raw === '' ? null : parseInt(raw, 10)
    const value = parsed === null || isNaN(parsed) ? null : parsed

    setTreeNodes((prev) => {
      const next = prev.map((n) =>
        n.id === nodeId ? { ...n, value, isPrime: value == null ? false : n.isPrime } : n
      )
      return value == null ? next : withChildren(next, nodeId)
    })
  }

  const togglePrime = (setTreeNodes, nodeId) => {
    setTreeNodes((prev) => {
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

  const hasEmptyChildren = (node, allNodes) =>
    node.children.some((childId) => {
      const child = allNodes.find((n) => n.id === childId)
      return child?.value == null
    })

  const shouldShowPrimeAction = (node, allNodes) =>
    node.children.length === 0 || hasEmptyChildren(node, allNodes)

  const renderTree = (treeId, treeNodes, setTreeNodes) => (
    <>
      {treeNodes.map((node) =>
        node.children.map((childId) => {
          const child = treeNodes.find((n) => n.id === childId)
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

      {treeNodes.map((node) => {
        const nodeKey = `${treeId}:${node.id}`
        const showPrime =
          hoveredNodeKey === nodeKey && shouldShowPrimeAction(node, treeNodes)

        return (
          <g
            key={node.id}
            onMouseEnter={() => showActionsFor(nodeKey)}
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
                  onChange={(e) => updateValue(setTreeNodes, node.id, e.target.value)}
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
                  onMouseEnter={() => showActionsFor(nodeKey)}
                  onMouseLeave={hideActionsSoon}
                  onClick={() => togglePrime(setTreeNodes, node.id)}
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
    </>
  )

  const maxY = Math.max(
    ...leftNodes.map((n) => n.y),
    ...rightNodes.map((n) => n.y)
  )
  const svgViewBoxHeight = Math.max(svgViewportHeight, maxY + 100)

  return (
    <div className="box-border flex h-full flex-col p-4">
      <svg
        width={svgViewportWidth}
        height={svgViewportHeight}
        viewBox={`0 0 800 ${svgViewBoxHeight}`}
        className="mx-auto shrink-0"
        preserveAspectRatio="xMidYMid meet"
      >
        <text
          x="200"
          y="24"
          textAnchor="middle"
          className="text-sm font-semibold fill-slate-600"
        >
          Left Tree
        </text>
        <text
          x="600"
          y="24"
          textAnchor="middle"
          className="text-sm font-semibold fill-slate-600"
        >
          Right Tree
        </text>
        <line
          x1="400"
          y1="0"
          x2="400"
          y2={svgViewBoxHeight}
          stroke="#cbd5e1"
          strokeDasharray="6 6"
        />

        {renderTree('left', leftNodes, setLeftNodes)}
        {renderTree('right', rightNodes, setRightNodes)}
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
        Type in either tree to grow it automatically. Hover a node to mark it prime.
      </div>
    </div>
  )
}
