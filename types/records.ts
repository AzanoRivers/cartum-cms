export type RecordValue = string | number | boolean | null

export interface ContentRecord {
  id:        string
  nodeId:    string
  data:      Record<string, RecordValue>
  createdAt: Date
  updatedAt: Date
}

export interface RecordInput {
  data: Record<string, RecordValue>
}

export interface PaginatedRecords {
  records: ContentRecord[]
  total:   number
  page:    number
  limit:   number
}
