'use client'

import { useCallback, useRef, useState } from 'react'
import type { NodeConnection, PortSide, RelationType } from '@/types/nodes'
import {
  createConnection,
  deleteConnection as deleteConnectionAction,
  updateConnection,
} from '@/lib/actions/nodes.actions'

export interface DragState {
  isDragging: boolean
  originNodeId: string | null
  originSide: PortSide | null
}

const INITIAL_DRAG: DragState = {
  isDragging: false,
  originNodeId: null,
  originSide: null,
}

export interface UseConnectionsReturn {
  connections: NodeConnection[]
  drag: DragState
  dragRef: React.MutableRefObject<DragState>
  startDrag: (nodeId: string, side: PortSide) => void
  cancelDrag: () => void
  completeDrag: (targetNodeId: string) => void
  removeConnection: (connectionId: string) => void
  changeConnectionType: (connectionId: string, relationType: RelationType) => void
}

export function useConnections(initialConnections: NodeConnection[]): UseConnectionsReturn {
  const [connections, setConnections] = useState<NodeConnection[]>(initialConnections)
  const [drag, setDrag] = useState<DragState>(INITIAL_DRAG)
  const dragRef = useRef<DragState>(INITIAL_DRAG)

  const syncDrag = (next: DragState) => {
    dragRef.current = next
    setDrag(next)
  }

  const startDrag = useCallback((nodeId: string, side: PortSide) => {
    syncDrag({ isDragging: true, originNodeId: nodeId, originSide: side })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cancelDrag = useCallback(() => {
    syncDrag(INITIAL_DRAG)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const completeDrag = useCallback((targetNodeId: string) => {
    const { originNodeId } = dragRef.current
    syncDrag(INITIAL_DRAG)
    if (!originNodeId || originNodeId === targetNodeId) return
    void createConnection({
      sourceId: originNodeId,
      targetId: targetNodeId,
      relationType: '1:n',
    }).then((result) => {
      if (result.success) {
        setConnections((prev) => [...prev, result.data])
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const removeConnection = useCallback((connectionId: string) => {
    // Optimistic: remove immediately, then fire action
    setConnections((prev) => prev.filter((c) => c.id !== connectionId))
    void deleteConnectionAction({ connectionId })
  }, [])

  const changeConnectionType = useCallback(
    (connectionId: string, relationType: RelationType) => {
      // Optimistic: update immediately, then fire action
      setConnections((prev) =>
        prev.map((c) => (c.id === connectionId ? { ...c, relationType } : c)),
      )
      void updateConnection({ connectionId, relationType })
    },
    [],
  )

  return {
    connections,
    drag,
    dragRef,
    startDrag,
    cancelDrag,
    completeDrag,
    removeConnection,
    changeConnectionType,
  }
}
