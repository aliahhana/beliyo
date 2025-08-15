import React, { useState, useEffect } from 'react'
import { ArrowDownUp, RefreshCw } from 'lucide-react'
import { currencyService } from '../services/currencyService'

interface CurrencyConverterProps {
  fromAmount: string
  fromCurrency: string
  toAmount: string
  toCurrency: string
  onFromAmountChange: (amount: string) => void
  onFromCurrencyChange: (currency: string) => void
  onToAmountChange: (amount: string) => void
  onToCurrencyChange: (currency: string) => void
  disabled?: boolean
}

const CurrencyConverter: React.FC<CurrencyConverterProps> = ({
  fromAmount,
  fromCurrency,
  toAmount,
  toCurrency,
  onFromAmountChange,
  onFromCurrencyChange,
  onToAmountChange,
  onToCurrencyChange,
  disabled = false
}) => {
  const [exchangeRate, setExchangeRate] = useState<number>(0)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // Load exchange rate on mount and when currencies change
  useEffect(() => {
    loadExchangeRate()
  }, [fromCurrency, toCurrency])

  // Auto-convert when from amount changes
  useEffect(() => {
    if (fromAmount && exchangeRate > 0) {
      const amount = parseFloat(fromAmount)
      if (!isNaN(amount)) {
        const converted = amount * exchangeRate
        onToAmountChange(converted.toFixed(toCurrency === '₩' ? 0 : 2))
      }
    }
  }, [fromAmount, exchangeRate, toCurrency, onToAmountChange])

  const loadExchangeRate = async () => {
    if (fromCurrency === toCurrency) {
      setExchangeRate(1)
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const rate = await currencyService.getExchangeRate(fromCurrency, toCurrency)
      const lastUpdate = await currencyService.getLastUpdated()
      
      setExchangeRate(rate)
      setLastUpdated(lastUpdate)
    } catch (err) {
      console.error('Error loading exchange rate:', err)
      setError('Failed to load exchange rate')
    } finally {
      setLoading(false)
    }
  }

  const handleSwapCurrencies = () => {
    if (disabled) return
    
    // Swap currencies
    onFromCurrencyChange(toCurrency)
    onToCurrencyChange(fromCurrency)
    
    // Swap amounts
    onFromAmountChange(toAmount)
    onToAmountChange(fromAmount)
  }

  const formatLastUpdated = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return 'Unknown'
    }
  }

  return (
    <div className="space-y-4">
      {/* Exchange Rate Display */}
      <div className="bg-white/10 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-medium">
              Exchange Rate
            </span>
            {loading && <RefreshCw className="w-4 h-4 text-white animate-spin" />}
          </div>
          <button
            onClick={loadExchangeRate}
            disabled={loading || disabled}
            className="text-white/70 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        {error ? (
          <p className="text-red-200 text-sm">{error}</p>
        ) : (
          <>
            <p className="text-white text-sm">
              1 {fromCurrency} = {exchangeRate.toFixed(toCurrency === '₩' ? 0 : 4)} {toCurrency}
            </p>
            {lastUpdated && (
              <p className="text-white/70 text-xs mt-1">
                Updated: {formatLastUpdated(lastUpdated)}
              </p>
            )}
          </>
        )}
      </div>

      {/* From Currency */}
      <div className="flex items-center gap-3">
        <input
          type="number"
          value={fromAmount}
          onChange={(e) => onFromAmountChange(e.target.value)}
          className="bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/50 flex-1"
          placeholder="Enter amount"
          min="0"
          step="0.01"
          disabled={disabled}
        />
        <select
          value={fromCurrency}
          onChange={(e) => onFromCurrencyChange(e.target.value)}
          className="bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white"
          disabled={disabled}
        >
          <option value="₩" className="text-black">KRW (₩)</option>
          <option value="RM" className="text-black">MYR (RM)</option>
        </select>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center">
        <button
          onClick={handleSwapCurrencies}
          disabled={disabled}
          className="p-2 text-white hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
        >
          <ArrowDownUp className="w-6 h-6" />
        </button>
      </div>

      {/* To Currency */}
      <div className="flex items-center gap-3">
        <input
          type="number"
          value={toAmount}
          onChange={(e) => onToAmountChange(e.target.value)}
          className="bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/50 flex-1"
          placeholder="Converted amount"
          min="0"
          step="0.01"
          disabled={disabled}
        />
        <select
          value={toCurrency}
          onChange={(e) => onToCurrencyChange(e.target.value)}
          className="bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white"
          disabled={disabled}
        >
          <option value="RM" className="text-black">MYR (RM)</option>
          <option value="₩" className="text-black">KRW (₩)</option>
        </select>
      </div>

      {/* Data Source */}
      <div className="text-center">
        <p className="text-white/60 text-xs">
          Exchange rates from Bank Negara Malaysia
        </p>
      </div>
    </div>
  )
}

export default CurrencyConverter
