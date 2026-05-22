import { cache } from '@workspace/cache'
import { BillingError } from '@workspace/core/errros'
import {
  type CurrencyCode,
  DEFAULT_CURRENCY_CODE,
  EXCHANGE_RATE_MARKUPS,
  FALLBACK_EXCHANGE_RATES,
  SUPPORTED_CURRENCY_CODES,
} from '../lib/currency'
import { env } from '../lib/env'

type CurrencyExchangeRate = Record<
  CurrencyCode,
  { code: CurrencyCode; value: number }
>

function exchangeRateKey(currency: CurrencyCode) {
  return `billing:settings:currency:exchange-rate:${currency.toLowerCase()}`
}

const CACHE_TTL_SECONDS = 12 * 60 * 60 // 12 hours

async function getCachedValue(currency: CurrencyCode) {
  const key = exchangeRateKey(currency)

  const cachedValue = await cache.get(key)

  if (cachedValue === null) {
    return null
  }

  const value = JSON.parse(cachedValue) as CurrencyExchangeRate

  return value
}

async function setCachedValue(
  currency: CurrencyCode,
  value: CurrencyExchangeRate,
) {
  const key = exchangeRateKey(currency)

  await cache.set(key, JSON.stringify(value))
  await cache.expire(key, CACHE_TTL_SECONDS)
}

type ExchangeRatesParams = {
  baseCurrency: CurrencyCode
}

async function exchangeRates(
  params: ExchangeRatesParams = { baseCurrency: DEFAULT_CURRENCY_CODE },
) {
  try {
    const baseCurrency = SUPPORTED_CURRENCY_CODES.find(
      (currency) => currency === params.baseCurrency,
    )

    if (!baseCurrency) {
      throw new Error('Unsupported currency')
    }

    const cachedValue = await getCachedValue(baseCurrency)

    const shouldUseCache = cachedValue !== null

    if (shouldUseCache) {
      return cachedValue
    }

    if (!env.CURRENCY_API_KEY) {
      throw new Error('Currency API key is not configured')
    }

    const searchParams = new URLSearchParams({
      base_currency: baseCurrency,
      type: 'fiat',
    })

    const response = await fetch(
      `https://api.currencyapi.com/v3/latest?${searchParams.toString()}`,
      {
        method: 'GET',
        headers: {
          apikey: env.CURRENCY_API_KEY,
        },
      },
    )

    const { data } = (await response.json()) as { data: CurrencyExchangeRate }

    if (!data) {
      throw new Error('Failed to fetch exchange rates from provider')
    }

    const value = Object.fromEntries(
      SUPPORTED_CURRENCY_CODES.map((currency) => {
        const currencyData = data[currency]

        if (!currencyData) {
          throw new Error(
            `Currency "${currency}" not found in provider response`,
          )
        }

        return [currency, currencyData]
      }),
    ) as CurrencyExchangeRate

    await setCachedValue(baseCurrency, value)

    return value
  } catch {
    throw new BillingError({
      code: 'EXCHANGE_RATE_FETCH_FAILED',
      message: `Failed to fetch exchange rates for "${params.baseCurrency}"`,
    })
  }
}

type ExchangeRateParams = {
  from: CurrencyCode
  to: CurrencyCode
}

async function exchangeRate(params: ExchangeRateParams) {
  try {
    const toCurrency = SUPPORTED_CURRENCY_CODES.find(
      (currency) => currency === params.to,
    )

    if (!toCurrency) {
      throw new Error('Unsupported currency')
    }

    const data = await exchangeRates({ baseCurrency: params.from })

    const providerExchangeRate = data[toCurrency]

    if (!providerExchangeRate) {
      throw new Error('Failed to fetch exchange rate from provider')
    }

    const markupMultiplier = EXCHANGE_RATE_MARKUPS[toCurrency]?.value || 1

    const exchangeRate = providerExchangeRate.value * markupMultiplier

    return {
      code: toCurrency,
      value: exchangeRate,
      baseRate: providerExchangeRate.value,
      markupMultiplier,
    }
  } catch {
    const fallbackExchangeRate =
      FALLBACK_EXCHANGE_RATES[params.from]?.[params.to]

    if (fallbackExchangeRate) {
      const markupMultiplier = EXCHANGE_RATE_MARKUPS[params.to]?.value || 1

      const exchangeRate = fallbackExchangeRate.value * markupMultiplier

      return {
        code: params.to,
        value: exchangeRate,
        baseRate: fallbackExchangeRate.value,
        markupMultiplier,
      }
    }

    throw new BillingError({
      code: 'EXCHANGE_RATE_FETCH_FAILED',
      message: `Failed to fetch exchange rate for "${params.from}" to "${params.to}"`,
    })
  }
}

export const currency = {
  exchangeRates,
  exchangeRate,
}
