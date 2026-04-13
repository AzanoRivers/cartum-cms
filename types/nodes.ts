export type NodeCategory = 'container' | 'field'
export type FieldType = 'text' | 'number' | 'boolean' | 'image' | 'video' | 'relation' | 'gallery'
export type RelationType = '1:1' | '1:n' | 'n:m'
export type PortSide = 'top' | 'right' | 'bottom' | 'left'
export type Position = { x: number; y: number }

// ── Field config types ────────────────────────────────────────────────────────

export interface TextFieldConfig {
  multiline?: boolean
  maxLength?: number
}

export interface NumberFieldConfig {
  subtype: 'integer' | 'float'
  valueMode?: 'fixed' | 'range'
  fixedValue?: number | null
  min?: number
  max?: number
}

export interface BooleanFieldConfig {
  defaultValue?: boolean
  trueLabel?: string
  falseLabel?: string
}

export interface RelationFieldConfig {
  relationTargetId: string
  relationType: RelationType
}

export interface ImageFieldConfig {
  defaultUrl?:     string | null
  defaultMediaId?: string | null
}

export interface VideoFieldConfig {
  defaultUrl?:     string | null
  defaultMediaId?: string | null
}

export interface GalleryItem {
  url:     string
  mediaId: string | null
}

export interface GalleryFieldConfig {
  items:     GalleryItem[]
  maxItems?: number
}

export type GalleryContentLabels = {
  addImage:      string
  removeImage:   string
  confirmRemove: string
  selectFromLib: string
  uploadNew:     string
  dragOrSelect?: string
  empty:         string
  maxReached:    string
  uploading:     string
  optimizing:    string
  uploadError:   string
}

export type FieldConfig =
  | TextFieldConfig
  | NumberFieldConfig
  | BooleanFieldConfig
  | RelationFieldConfig
  | ImageFieldConfig
  | VideoFieldConfig
  | GalleryFieldConfig
  | Record<string, never>

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
  config: FieldConfig | null
}

export type AnyNode = ContainerNode | FieldNode

export interface NodeConnection {
  id: string
  sourceNodeId: string
  targetNodeId: string
  relationType: RelationType
}

// ── Input types ───────────────────────────────────────────────────────────────

export interface CreateContainerInput {
  name: string
  parentId: string | null
  positionX?: number
  positionY?: number
}

export interface CreateFieldInput {
  name: string
  parentId: string
  fieldType: FieldType
  isRequired?: boolean
  defaultValue?: string
  relationTargetId?: string
  positionX?: number
  positionY?: number
}

export interface UpdateFieldMetaInput {
  name?: string
  isRequired?: boolean
  fieldType?: FieldType
  defaultValue?: string | null
  config?: FieldConfig
  relationTargetId?: string | null
}

// ── Read models ───────────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  id: string
  name: string
}

export interface NodeTree {
  node: ContainerNode
  children: (NodeTree | FieldNode)[]
}
