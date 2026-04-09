import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { AnyNode } from '@/types/nodes'

interface NodeBoardState {
  nodes: AnyNode[]
  scale: number
  offsetX: number
  offsetY: number
  selectedNodeId: string | null
  isDragging: boolean
  dragNodeId: string | null
  /** Actual pixel dimensions of the canvas container — updated by InfiniteCanvas on mount/resize. */
  canvasWidth: number
  canvasHeight: number
}

interface NodeBoardActions {
  setNodes: (nodes: AnyNode[]) => void
  addNode: (node: AnyNode) => void
  removeNode: (id: string) => void
  setScale: (scale: number) => void
  setOffset: (x: number, y: number) => void
  selectNode: (id: string | null) => void
  setDragging: (id: string | null) => void
  setCanvasDimensions: (width: number, height: number) => void
  updateNodePositionOptimistic: (id: string, x: number, y: number) => void
  reset: () => void
}

const initialState: NodeBoardState = {
  nodes: [],
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  selectedNodeId: null,
  isDragging: false,
  dragNodeId: null,
  canvasWidth: typeof window !== 'undefined' ? window.innerWidth : 1280,
  canvasHeight: typeof window !== 'undefined' ? window.innerHeight : 900,
}

export const useNodeBoardStore = create<NodeBoardState & NodeBoardActions>()(
  subscribeWithSelector((set) => ({
    ...initialState,

    setNodes:    (nodes) => set({ nodes }),
    addNode:     (node)  => set((state) => ({ nodes: [...state.nodes, node] })),
    removeNode:  (id)    => set((state) => ({ nodes: state.nodes.filter((n) => n.id !== id) })),
    setScale: (scale) => set({ scale: Math.min(2, Math.max(0.3, scale)) }),
    setOffset: (x, y) => set({ offsetX: x, offsetY: y }),
    setCanvasDimensions: (width, height) => set({ canvasWidth: width, canvasHeight: height }),
    selectNode: (id) => set({ selectedNodeId: id }),
    setDragging: (id) => set({ isDragging: id !== null, dragNodeId: id }),
    updateNodePositionOptimistic: (id, x, y) =>
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === id ? { ...n, positionX: x, positionY: y } : n
        ),
      })),
    reset: () => set(initialState),
  }))
)
