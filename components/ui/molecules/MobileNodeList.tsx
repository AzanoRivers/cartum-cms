'use client'

import { useNodeBoardStore } from '@/lib/stores/nodeBoardStore'
import { useUIStore } from '@/lib/stores/uiStore'
import { NodeCard } from '@/components/ui/molecules/NodeCard'

export function MobileNodeList() {
  const nodes          = useNodeBoardStore((s) => s.nodes)
  const selectedNodeId = useNodeBoardStore((s) => s.selectedNodeId)
  const selectNode     = useNodeBoardStore((s) => s.selectNode)
  const openFieldEdit  = useUIStore((s) => s.openFieldEdit)
  const d              = useUIStore((s) => s.cmsDict)

  const sorted = [...nodes].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )

  const containerNodes = sorted.filter((n) => n.type === 'container')
  const fieldNodes     = sorted.filter((n) => n.type === 'field')

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2">
        <span className="font-mono text-xs text-muted">{d?.mobileList.empty ?? 'No nodes yet.'}</span>
        <span className="font-mono text-xs text-border">{d?.mobileList.emptyHint ?? 'Use + to create your first container.'}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {containerNodes.map((node) => (
          <li key={node.id}>
            <NodeCard
              node={node}
              selected={selectedNodeId === node.id}
              onSelect={selectNode}
            />
          </li>
        ))}
      </ul>

      {fieldNodes.length > 0 && (
        <>
          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 h-px bg-border" />
            <span className="font-mono text-[10px] text-muted uppercase tracking-widest">{d?.mobileList.fieldsSeparator ?? 'Fields'}</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <ul className="flex flex-col gap-2">
            {fieldNodes.map((node) => (
              <li key={node.id}>
                <NodeCard
                  node={node}
                  selected={selectedNodeId === node.id}
                  onSelect={selectNode}
                  onEditField={openFieldEdit}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
