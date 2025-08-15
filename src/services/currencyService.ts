// Bank Negara Malaysia Currency Exchange Service
export interface ExchangeRate {
  currency_code: string
  currency_name: string
  buying_rate: number
  selling_rate: number
  middle_rate: number
  unit: number
  date: string
}

export interface BNMResponse {
  meta: {
    last_updated: string
    next_update: string
  }
  data: {
    [date: string]: ExchangeRate[]
  }
}

class CurrencyService {
  private readonly BNM_API_BASE = 'https://api.bnm.gov.my/public'
  private readonly PROXY_SERVER_URL = 'undefined'
  private readonly ACCESS_TOKEN = import.meta.env.VITE_PROXY_SERVER_ACCESS_TOKEN || 'undefined'
  
  private cache: Map<string, { data: ExchangeRate[], timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

  /**
   * Get current exchange rates from Bank Negara Malaysia
   */
  async getExchangeRates(): Promise<ExchangeRate[]> {
    const cacheKey = 'exchange_rates'
    const cached = this.cache.get(cacheKey)
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }

    try {
      // Use proxy server to access BNM API
      const response = await fetch(this.PROXY_SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.ACCESS_TOKEN}`
        },
        body: JSON.stringify({
          url: `${this.BNM_API_BASE}/exchange-rate`,
          method: 'GET',
          headers: {
            'Accept': 'application/vnd.BNM.API.v1+json'
          },
          body: {}
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data: BNMResponse = await response.json()
      
      // Get the latest date's exchange rates
      const dates = Object.keys(data.data).sort().reverse()
      const latestRates = dates.length > 0 ? data.data[dates[0]] : []

      // Cache the results
      this.cache.set(cacheKey, {
        data: latestRates,
        timestamp: Date.now()
      })

      return latestRates
    } catch (error) {
      console.error('Error fetching exchange rates from BNM:', error)
      
      // Return fallback rates if API fails
      return this.getFallbackRates()
    }
  }

  /**
   * Get exchange rate for a specific currency pair
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) return 1

    try {
      const rates = await this.getExchangeRates()
      
      if (fromCurrency === 'RM' && toCurrency === '₩') {
        // RM to KRW: Find KRW rate and invert
        const krwRate = rates.find(rate => rate.currency_code === 'KRW')
        if (krwRate) {
          // Use middle rate for conversion
          return krwRate.middle_rate * krwRate.unit
        }
      } else if (fromCurrency === '₩' && toCurrency === 'RM') {
        // KRW to RM: Find KRW rate
        const krwRate = rates.find(rate => rate.currency_code === 'KRW')
        if (krwRate) {
          // Use middle rate for conversion
          return 1 / (krwRate.middle_rate * krwRate.unit)
        }
      }

      // Fallback to default rate
      return this.getFallbackRate(fromCurrency, toCurrency)
    } catch (error) {
      console.error('Error getting exchange rate:', error)
      return this.getFallbackRate(fromCurrency, toCurrency)
    }
  }

  /**
   * Convert amount from one currency to another
   */
  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency)
    return amount * rate
  }

  /**
   * Get the latest update time for exchange rates
   */
  async getLastUpdated(): Promise<string> {
    try {
      const response = await fetch(this.PROXY_SERVER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.ACCESS_TOKEN}`
        },
        body: JSON.stringify({
          url: `${this.BNM_API_BASE}/exchange-rate`,
          method: 'GET',
          headers: {
            'Accept': 'application/vnd.BNM.API.v1+json'
          },
          body: {}
        })
      })

      if (response.ok) {
        const data: BNMResponse = await response.json()
        return data.meta.last_updated
      }
    } catch (error) {
      console.error('Error fetching last updated time:', error)
    }
    
    return new Date().toISOString()
  }

  /**
   * Fallback exchange rates when API is unavailable
   */
  private getFallbackRates(): ExchangeRate[] {
    return [
      {
        currency_code: 'KRW',
        currency_name: 'Korean Won',
        buying_rate: 0.0030,
        selling_rate: 0.0032,
        middle_rate: 0.0031,
        unit: 1,
        date: new Date().toISOString().split('T')[0]
      }
    ]
  }

  /**
   * Get fallback rate for currency conversion
   */
  private getFallbackRate(fromCurrency: string, toCurrency: string): number {
    if (fromCurrency === '₩' && toCurrency === 'RM') {
      return 0.0031 // 1 KRW = 0.0031 MYR
    } else if (fromCurrency === 'RM' && toCurrency === '₩') {
      return 322.58 // 1 MYR = 322.58 KRW
    }
    return 1
  }

  /**
   * Format currency amount with proper symbols
   */
  formatCurrency(amount: number, currency: string): string {
    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: currency === '₩' ? 0 : 2,
      maximumFractionDigits: currency === '₩' ? 0 : 2
    })
    
    return `${currency}${formatted}`
  }
}

export const currencyService = new CurrencyService()
