export type NodeCategory = 'container' | 'field'
export type FieldType = 'text' | 'number' | 'boolean' | 'image' | 'video' | 'relation'
export type RelationType = '1:1' | '1:n' | 'n:m'

export interface BaseNode {
  id: string
  name: string
  type: NodeCategory
  parentId: string | null
  positionX: number
  positionY: number
  createdAt: Date
  updatedAt: Date
}

export interface ContainerNode extends BaseNode {
  type: 'container'
}

export interface FieldNode extends BaseNode {
  type: 'field'
  fieldType: FieldType
  isRequired: boolean
  defaultValue: string | null
  relationTargetId: string | null
}

export type AnyNode = ContainerNode | FieldNode

export interface NodeConnection {
  id: string
  sourceNodeId: string
  targetNodeId: string
  relationType: RelationType
}
