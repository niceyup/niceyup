export const DEFAULT_CURRENCY_CODE = 'USD' as const

export const SUPPORTED_CURRENCY_CODES = ['USD', 'BRL'] as const

export type CurrencyCode = (typeof SUPPORTED_CURRENCY_CODES)[number]

/**
 * Fallback exchange rates used when the provider is unavailable
 */
export const FALLBACK_EXCHANGE_RATES: {
  [BaseCode in CurrencyCode]?: {
    [Code in CurrencyCode]?: {
      code: Code
      value: number
    }
  }
} = {
  USD: {
    BRL: {
      code: 'BRL',
      value: 5.05,
    },
  },
}

/**
 * Safety margin applied to exchange rates to cover fluctuations and processing fees
 */
export const EXCHANGE_RATE_MARKUPS: {
  [Code in CurrencyCode]?: {
    code: Code
    value: number
  }
} = {
  BRL: {
    code: 'BRL',
    value: 1.12,
  },
}
