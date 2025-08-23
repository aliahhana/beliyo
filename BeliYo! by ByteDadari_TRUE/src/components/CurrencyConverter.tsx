import React, { useState, useEffect } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { currencyService } from '../services/currencyService'

interface CurrencyConverterProps {
  fromAmount: string
  fromCurrency: string
  toAmount: string
  toCurrency: string
  onFromAmountChange: (value: string) => void
  onFromCurrencyChange: (currency: string) => void
  onToAmountChange: (value: string) => void
  onToCurrencyChange: (currency: string) => void
}

const CurrencyConverter: React.FC<CurrencyConverterProps> = ({
  fromAmount,
  fromCurrency,
  toAmount,
  toCurrency,
  onFromAmountChange,
  onFromCurrencyChange,
  onToAmountChange,
  onToCurrencyChange
}) => {
  const [isConverting, setIsConverting] = useState(false)
  const [realTimeRate, setRealTimeRate] = useState('1 ₩ = RM 0.0031')
  const [lastUpdated, setLastUpdated] = useState('')

  // Update real-time rate display
  useEffect(() => {
    const updateRealTimeRate = async () => {
      try {
        const rate = await currencyService.getRealTimeRate(fromCurrency, toCurrency)
        setRealTimeRate(rate)
        
        const lastUpdate = await currencyService.getLastUpdated()
        const date = new Date(lastUpdate)
        setLastUpdated(date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }))
      } catch (error) {
        console.error('Error updating real-time rate:', error)
      }
    }

    updateRealTimeRate()
    
    // Update every 30 seconds for real-time feel
    const interval = setInterval(updateRealTimeRate, 30000)
    return () => clearInterval(interval)
  }, [fromCurrency, toCurrency])

  // Auto-convert when amount or currencies change
  useEffect(() => {
    const convertAmount = async () => {
      if (!fromAmount || fromAmount === '0' || isNaN(Number(fromAmount))) {
        onToAmountChange('0')
        return
      }

      setIsConverting(true)
      try {
        const converted = await currencyService.convertCurrency(
          Number(fromAmount),
          fromCurrency,
          toCurrency
        )
        onToAmountChange(converted.toFixed(fromCurrency === '₩' && toCurrency === 'RM' ? 4 : 2))
      } catch (error) {
        console.error('Error converting currency:', error)
        // Fallback conversion
        const fallbackRate = fromCurrency === '₩' && toCurrency === 'RM' ? 0.00339 : 295.32
        const converted = Number(fromAmount) * fallbackRate
        onToAmountChange(converted.toFixed(fromCurrency === '₩' && toCurrency === 'RM' ? 4 : 2))
      } finally {
        setIsConverting(false)
      }
    }

    const debounceTimer = setTimeout(convertAmount, 300)
    return () => clearTimeout(debounceTimer)
  }, [fromAmount, fromCurrency, toCurrency])

  const swapCurrencies = () => {
    const tempCurrency = fromCurrency
    const tempAmount = fromAmount
    
    onFromCurrencyChange(toCurrency)
    onToCurrencyChange(tempCurrency)
    onFromAmountChange(toAmount)
    onToAmountChange(tempAmount)
  }

  return (
    <div className="space-y-3">
      {/* Real-time Rate Display */}
      <div className="text-center text-white mb-4">
        <div className="text-lg font-medium mb-1">{realTimeRate}</div>
        <div className="text-sm opacity-90">
          {lastUpdated ? `Updated: ${lastUpdated}` : 'Live rates'}
        </div>
      </div>

      {/* From Currency */}
      <div className="relative">
        <input
          type="number"
          value={fromAmount}
          onChange={(e) => onFromAmountChange(e.target.value)}
          className="w-full bg-white/20 text-white placeholder-white/70 px-4 py-3 rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 text-lg font-medium"
          placeholder="Enter amount"
          min="0"
          step="any"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <select
            value={fromCurrency}
            onChange={(e) => onFromCurrencyChange(e.target.value)}
            className="bg-transparent text-white text-sm font-bold focus:outline-none cursor-pointer"
          >
            <option value="₩" className="bg-[#B91C1C] text-white">₩</option>
            <option value="RM" className="bg-[#B91C1C] text-white">RM</option>
          </select>
        </div>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center">
        <button
          onClick={swapCurrencies}
          className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
          disabled={isConverting}
        >
          <ArrowUpDown className={`w-5 h-5 ${isConverting ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* To Currency */}
      <div className="relative">
        <input
          type="number"
          value={toAmount}
          onChange={(e) => onToAmountChange(e.target.value)}
          className="w-full bg-white/20 text-white placeholder-white/70 px-4 py-3 rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50 text-lg font-medium"
          placeholder="Converted amount"
          readOnly
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <select
            value={toCurrency}
            onChange={(e) => onToCurrencyChange(e.target.value)}
            className="bg-transparent text-white text-sm font-bold focus:outline-none cursor-pointer"
          >
            <option value="₩" className="bg-[#B91C1C] text-white">₩</option>
            <option value="RM" className="bg-[#B91C1C] text-white">RM</option>
          </select>
        </div>
      </div>

      {/* Loading indicator */}
      {isConverting && (
        <div className="text-center text-white/70 text-sm">
          Converting...
        </div>
      )}
    </div>
  )
}

export default CurrencyConverter
