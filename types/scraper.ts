export type ScrapeOptions = {
  max_pages?: number
  download_images?: boolean
  llm_provider?: string | null
  llm_model?: string | null
}

export type ScrapeJobStatus =
  | 'queued'
  | 'exploring'
  | 'fetching'
  | 'extracting'
  | 'auditing'
  | 'analyzing'
  | 'packaging'
  | 'done'
  | 'failed'
  | 'expired'

export type ScrapeJobProgress = {
  phase: string
  pages_done: number
  pages_total: number
  percent: number
}

export type ScrapeJobError = {
  code: string
  message: string
  failed_at: string
  retry_after: number | null
}

export type ScrapeJobState = {
  job_id: string
  status: ScrapeJobStatus
  progress: ScrapeJobProgress | null
  ttl_remaining_seconds: number | null
  error: ScrapeJobError | null
  created_at: string
  started_at: string | null
  updated_at: string
  done_at: string | null
  estimated_remaining_seconds: number
}

export type ScrapeResultPageElement = {
  type: string   // semantic identifier: "h1", "h2", "subtitle", "description", etc.
  text: string   // actual scraped text value
}

export type ScrapeResultKeyPage = {
  url:        string
  title:      string
  summary:    string
  key_points: string[]
  elements:   ScrapeResultPageElement[]
}

// Flat LLM output — keys match CARTUM_RESPONSE_SCHEMA sent in the POST body
export type ScrapeResultData = {
  business_name: string | null
  business_type: string | null
  description:   string | null
  language:      string | null
  address:       string | null
  phone:         string | null
  email:         string | null
  social_links:  string[]
  main_topics:   string[]
  key_pages:     ScrapeResultKeyPage[]
}

export type ScrapeResult = {
  job_id:           string
  url:              string
  scraped_at:       string
  llm_provider:     string
  llm_model:        string
  schema_validated: boolean
  data:             ScrapeResultData
  metadata: {
    total_pages_discovered: number
    pages_fetched:          number
    pages_analyzed:         number
    coverage_percent:       number
  }
}

export type ScraperServerStatus = {
  name: string
  version: string
  active_jobs: number
  max_concurrent_jobs: number
  status: 'ok' | 'busy'
}

export type WebMigrationSettings = {
  scraperApiUrl?: string  // default: 'https://scraper.azanolabs.com'
  scraperApiKey?: string
}

// Estrategia de importación elegida por el usuario
export type ImportStrategy = 'business_only' | 'business_and_pages'

export type ImportedSummary = {
  businessNodeId: string
  attrCount:      number
  pagesNodeId?:   string
  pagesCount?:    number
}
