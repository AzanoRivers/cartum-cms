export const RATE_LIMITS = {
  HELP_REPORT: { key: 'help_report', windowSecs: 24 * 3600, maxRequests: 1 },
  EMAIL_TEST:  { key: 'email_test',  windowSecs: 5 * 60,    maxRequests: 3 },
} as const

export type RateLimitKey = keyof typeof RATE_LIMITS
