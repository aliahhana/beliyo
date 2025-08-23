// Currency Exchange Service using exchangerate-api.com
export interface ExchangeRate {
  currency_code: string
  currency_name: string
  rate: number
  unit: number
  date: string
}

class CurrencyService {
  // Using exchangerate-api.com - most reliable free API with 1500 requests/month
  private readonly API_BASE = 'https://api.exchangerate-api.com/v4/latest'
  
  private cache: Map<string, { data: any, timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 10 * 60 * 1000 // 10 minutes cache for real-time rates

  /**
   * Get exchange rate for a specific currency pair
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) return 1

    // Normalize currency codes
    const from = this.normalizeCurrencyCode(fromCurrency)
    const to = this.normalizeCurrencyCode(toCurrency)

    try {
      // Check cache first
      const cacheKey = `${from}_${to}`
      const cached = this.cache.get(cacheKey)
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data.rate
      }

      // Fetch real-time rates from API
      const response = await fetch(`${this.API_BASE}/${from}`)
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.rates || !data.rates[to]) {
        throw new Error(`Exchange rate not found for ${from} to ${to}`)
      }

      const rate = data.rates[to]
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: { rate },
        timestamp: Date.now()
      })

      return rate
    } catch (error) {
      console.error('Error fetching exchange rate:', error)
      return this.getFallbackRate(fromCurrency, toCurrency)
    }
  }

  /**
   * Get current exchange rates for multiple currencies
   */
  async getExchangeRates(): Promise<ExchangeRate[]> {
    try {
      // Fetch rates based on MYR as base currency
      const response = await fetch(`${this.API_BASE}/MYR`)
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.rates) {
        throw new Error('Invalid API response format')
      }

      // Convert to our format
      const currencies = [
        { code: 'KRW', name: 'Korean Won' },
        { code: 'USD', name: 'US Dollar' },
        { code: 'SGD', name: 'Singapore Dollar' },
        { code: 'EUR', name: 'Euro' },
        { code: 'GBP', name: 'British Pound' },
        { code: 'JPY', name: 'Japanese Yen' },
        { code: 'CNY', name: 'Chinese Yuan' },
        { code: 'THB', name: 'Thai Baht' },
        { code: 'IDR', name: 'Indonesian Rupiah' },
        { code: 'VND', name: 'Vietnamese Dong' }
      ]

      return currencies
        .filter(curr => data.rates[curr.code])
        .map(curr => ({
          currency_code: curr.code,
          currency_name: curr.name,
          rate: data.rates[curr.code],
          unit: 1,
          date: data.date || new Date().toISOString().split('T')[0]
        }))
    } catch (error) {
      console.error('Error fetching exchange rates:', error)
      return this.getFallbackRates()
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
      const response = await fetch(`${this.API_BASE}/MYR`)
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }
      
      const data = await response.json()
      return data.date ? `${data.date}T${new Date().toTimeString().split(' ')[0]}` : new Date().toISOString()
    } catch (error) {
      console.error('Error fetching last updated time:', error)
      return new Date().toISOString()
    }
  }

  /**
   * Normalize currency codes for API compatibility
   */
  private normalizeCurrencyCode(currency: string): string {
    const mapping: { [key: string]: string } = {
      '₩': 'KRW',
      'RM': 'MYR',
      '$': 'USD',
      '€': 'EUR',
      '£': 'GBP',
      '¥': 'JPY'
    }
    
    return mapping[currency] || currency.toUpperCase()
  }

  /**
   * Fallback exchange rates when API is unavailable
   */
  private getFallbackRates(): ExchangeRate[] {
    return [
      {
        currency_code: 'KRW',
        currency_name: 'Korean Won',
        rate: 295.32,
        unit: 1,
        date: new Date().toISOString().split('T')[0]
      },
      {
        currency_code: 'USD',
        currency_name: 'US Dollar',
        rate: 0.22,
        unit: 1,
        date: new Date().toISOString().split('T')[0]
      }
    ]
  }

  /**
   * Get fallback rate for currency conversion
   */
  private getFallbackRate(fromCurrency: string, toCurrency: string): number {
    const from = this.normalizeCurrencyCode(fromCurrency)
    const to = this.normalizeCurrencyCode(toCurrency)

    // Common fallback rates (updated to realistic 2024 rates)
    const fallbackRates: { [key: string]: { [key: string]: number } } = {
      'MYR': {
        'KRW': 295.32,
        'USD': 0.22,
        'SGD': 0.30,
        'EUR': 0.20,
        'GBP': 0.17,
        'JPY': 32.45
      },
      'KRW': {
        'MYR': 0.00339,
        'USD': 0.00075,
        'SGD': 0.00102,
        'EUR': 0.00068,
        'GBP': 0.00058,
        'JPY': 0.11
      },
      'USD': {
        'MYR': 4.55,
        'KRW': 1342.50,
        'SGD': 1.36,
        'EUR': 0.91,
        'GBP': 0.78,
        'JPY': 147.50
      }
    }

    if (fallbackRates[from] && fallbackRates[from][to]) {
      return fallbackRates[from][to]
    }

    if (fallbackRates[to] && fallbackRates[to][from]) {
      return 1 / fallbackRates[to][from]
    }
    
    return 1
  }

  /**
   * Format currency amount with proper symbols
   */
  formatCurrency(amount: number, currency: string): string {
    const normalized = this.normalizeCurrencyCode(currency)
    
    const formatOptions: Intl.NumberFormatOptions = {
      minimumFractionDigits: normalized === 'KRW' || normalized === 'JPY' ? 0 : 2,
      maximumFractionDigits: normalized === 'KRW' || normalized === 'JPY' ? 0 : 2
    }
    
    const formatted = amount.toLocaleString('en-US', formatOptions)
    
    const symbols: { [key: string]: string } = {
      'KRW': '₩',
      'MYR': 'RM ',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'SGD': 'S$'
    }
    
    const symbol = symbols[normalized] || currency
    return `${symbol}${formatted}`
  }

  /**
   * Get currency symbol
   */
  getCurrencySymbol(currency: string): string {
    const normalized = this.normalizeCurrencyCode(currency)
    
    const symbols: { [key: string]: string } = {
      'KRW': '₩',
      'MYR': 'RM',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'SGD': 'S$'
    }
    
    return symbols[normalized] || currency
  }

  /**
   * Check if currency is supported
   */
  isSupportedCurrency(currency: string): boolean {
    const supported = ['KRW', 'MYR', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'THB', 'IDR', 'VND', 'CNY']
    const normalized = this.normalizeCurrencyCode(currency)
    return supported.includes(normalized)
  }

  /**
   * Get real-time conversion rate display
   */
  async getRealTimeRate(fromCurrency: string, toCurrency: string): Promise<string> {
    try {
      const rate = await this.getExchangeRate(fromCurrency, toCurrency)
      const fromSymbol = this.getCurrencySymbol(fromCurrency)
      const toSymbol = this.getCurrencySymbol(toCurrency)
      
      if (fromCurrency === '₩' && toCurrency === 'RM') {
        return `1 ${fromSymbol} = ${toSymbol} ${rate.toFixed(6)}`
      } else if (fromCurrency === 'RM' && toCurrency === '₩') {
        return `1 ${fromSymbol} = ${toSymbol} ${rate.toFixed(0)}`
      }
      
      return `1 ${fromSymbol} = ${toSymbol} ${rate.toFixed(4)}`
    } catch (error) {
      console.error('Error getting real-time rate:', error)
      return '1 ₩ = RM 0.0031'
    }
  }
}

export const currencyService = new CurrencyService()
