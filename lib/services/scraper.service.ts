// HTTP client para DealerScraper API — sin dependencias Next.js
// Todos los métodos lanzan ScraperApiError en caso de fallo HTTP

import type {
  ScrapeOptions,
  ScrapeJobState,
  ScrapeResult,
  ScraperServerStatus,
} from '@/types/scraper'

const DEFAULT_API_URL = 'https://scraper.azanolabs.com'

/**
 * JSON template sent as `response_schema` to the DealerScraper API.
 * Convention: "..." = string field, null = nullable scalar, ["..."] = string array.
 * The LLM fills this exact shape; the result arrives under result.data.
 */
export const CARTUM_RESPONSE_SCHEMA = {
  business_name: '...',
  business_type: null,
  description:   '...',
  language:      '...',
  address:       null,
  phone:         null,
  email:         null,
  social_links:  ['...'],
  main_topics:   ['...'],
  key_pages: [
    {
      url:        '...',
      title:      '...',
      summary:    '...',
      key_points: ['...'],
    },
  ],
} as const

export class ScraperApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public httpStatus?: number,
  ) {
    super(message)
    this.name = 'ScraperApiError'
  }
}

function buildHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const body = (await res.json()) as { error?: string; message?: string }
      message = body.error ?? body.message ?? message
    } catch {
      /* ignore parse error */
    }
    throw new ScraperApiError(`HTTP_${res.status}`, message, res.status)
  }
  return res.json() as Promise<T>
}

export const scraperService = {
  async getServerStatus(
    apiUrl: string,
    apiKey: string,
  ): Promise<ScraperServerStatus> {
    const url = `${apiUrl || DEFAULT_API_URL}/api/v1/status`
    const res = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(apiKey),
    })
    return handleResponse<ScraperServerStatus>(res)
  },

  async startJob(
    apiUrl: string,
    apiKey: string,
    url: string,
    options?: ScrapeOptions,
  ): Promise<{ job_id: string; status: string }> {
    const endpoint = `${apiUrl || DEFAULT_API_URL}/api/v1/scrape`
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: buildHeaders(apiKey),
      body: JSON.stringify({
        url,
        response_schema: CARTUM_RESPONSE_SCHEMA,
        options: {
          max_pages:       options?.max_pages       ?? 50,
          download_images: options?.download_images ?? false,
          llm_provider:    options?.llm_provider    ?? null,
          llm_model:       options?.llm_model       ?? null,
        },
      }),
    })
    return handleResponse<{ job_id: string; status: string }>(res)
  },

  async getJobStatus(
    apiUrl: string,
    apiKey: string,
    jobId: string,
  ): Promise<ScrapeJobState> {
    const url = `${apiUrl || DEFAULT_API_URL}/api/v1/scrape/${jobId}/status`
    const res = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(apiKey),
    })
    return handleResponse<ScrapeJobState>(res)
  },

  async getJobResult(
    apiUrl: string,
    apiKey: string,
    jobId: string,
  ): Promise<ScrapeResult> {
    const url = `${apiUrl || DEFAULT_API_URL}/api/v1/scrape/${jobId}/result`
    const res = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(apiKey),
    })
    // 425 = job not done yet
    if (res.status === 425) {
      throw new ScraperApiError('JOB_NOT_DONE', 'Job is not done yet', 425)
    }
    return handleResponse<ScrapeResult>(res)
  },

  async cancelJob(
    apiUrl: string,
    apiKey: string,
    jobId: string,
  ): Promise<void> {
    const url = `${apiUrl || DEFAULT_API_URL}/api/v1/scrape/${jobId}`
    const res = await fetch(url, {
      method: 'DELETE',
      headers: buildHeaders(apiKey),
    })
    // 404 is acceptable — job already gone
    if (!res.ok && res.status !== 404) {
      throw new ScraperApiError(`HTTP_${res.status}`, 'Failed to cancel job', res.status)
    }
  },
}
