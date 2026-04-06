import type { AnyNode, ContainerNode, FieldNode, NodeTree } from '@/types/nodes'

/**
 * Given a flat array of all nodes, builds a nested NodeTree[].
 * Field nodes are leaves; container nodes can hold both field nodes and nested containers.
 * Protected against orphans (nodes whose parentId references a missing node) — they are skipped.
 */
export function resolveNodeTree(flatNodes: AnyNode[]): NodeTree[] {
  const containerMap = new Map<string, NodeTree>()
  const fieldNodes:   FieldNode[] = []

  // First pass: index all containers
  for (const node of flatNodes) {
    if (node.type === 'container') {
      containerMap.set(node.id, { node: node as ContainerNode, children: [] })
    } else {
      fieldNodes.push(node as FieldNode)
    }
  }

  // Second pass: attach field nodes to their parent container
  for (const field of fieldNodes) {
    if (!field.parentId) continue
    const parent = containerMap.get(field.parentId)
    if (parent) parent.children.push(field)
  }

  // Third pass: attach container nodes to their parent (or collect as roots)
  const roots: NodeTree[] = []

  for (const [, tree] of containerMap) {
    const parentId = tree.node.parentId
    if (!parentId) {
      roots.push(tree)
    } else {
      const parent = containerMap.get(parentId)
      if (parent) {
        parent.children.push(tree)
      } else {
        // Orphan with missing parent — treat as root rather than losing data
        roots.push(tree)
      }
    }
  }

  return roots
}
