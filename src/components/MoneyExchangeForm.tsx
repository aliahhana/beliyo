import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { currencyService } from '../services/currencyService'

interface MoneyExchangeFormProps {
  onSuccess?: () => void
}

const MoneyExchangeForm: React.FC<MoneyExchangeFormProps> = ({ onSuccess }) => {
  const { user } = useAuth()
  const [fromAmount, setFromAmount] = useState('')
  const [fromCurrency, setFromCurrency] = useState('₩')
  const [toAmount, setToAmount] = useState('')
  const [toCurrency, setToCurrency] = useState('RM')
  const [notes, setNotes] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFromAmountChange = async (value: string) => {
    setFromAmount(value)
    if (value && !isNaN(Number(value))) {
      try {
        const converted = await currencyService.convertCurrency(
          Number(value),
          fromCurrency,
          toCurrency
        )
        setToAmount(converted.toFixed(2))
      } catch (error) {
        console.error('Conversion error:', error)
      }
    } else {
      setToAmount('')
    }
  }

  const handleToAmountChange = async (value: string) => {
    setToAmount(value)
    if (value && !isNaN(Number(value))) {
      try {
        const converted = await currencyService.convertCurrency(
          Number(value),
          toCurrency,
          fromCurrency
        )
        setFromAmount(converted.toFixed(2))
      } catch (error) {
        console.error('Conversion error:', error)
      }
    } else {
      setFromAmount('')
    }
  }

  const swapCurrencies = () => {
    const tempCurrency = fromCurrency
    const tempAmount = fromAmount
    
    setFromCurrency(toCurrency)
    setToCurrency(tempCurrency)
    setFromAmount(toAmount)
    setToAmount(tempAmount)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      setError('You must be logged in to create an exchange request')
      return
    }

    if (!fromAmount || !toAmount || !location.trim()) {
      setError('Please fill in all required fields including location')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: insertError } = await supabase
        .from('money_exchanges')
        .insert({
          user_id: user.id,
          from_amount: Number(fromAmount),
          from_currency: fromCurrency,
          to_amount: Number(toAmount),
          to_currency: toCurrency,
          notes: notes.trim() || null,
          location: location.trim(),
          status: 'pending'
        })

      if (insertError) throw insertError

      // Reset form
      setFromAmount('')
      setToAmount('')
      setNotes('')
      setLocation('')
      
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Error creating exchange request:', error)
      setError('Failed to create exchange request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Request Money Exchange</h2>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* From Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            I have
          </label>
          <div className="flex gap-3">
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
            >
              <option value="₩">₩</option>
              <option value="RM">RM</option>
            </select>
            <input
              type="number"
              value={fromAmount}
              onChange={(e) => handleFromAmountChange(e.target.value)}
              placeholder="Enter amount"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
              required
            />
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={swapCurrencies}
            className="p-2 text-gray-500 hover:text-[#B91C1C] transition-colors"
          >
            ⇅
          </button>
        </div>

        {/* To Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            I want
          </label>
          <div className="flex gap-3">
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
            >
              <option value="₩">₩</option>
              <option value="RM">RM</option>
            </select>
            <input
              type="number"
              value={toAmount}
              onChange={(e) => handleToAmountChange(e.target.value)}
              placeholder="Converted amount"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
              required
            />
          </div>
        </div>

        {/* Location Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Gangnam, Seoul"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Specify your preferred meeting location for the exchange
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional information or preferences..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#B91C1C] text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Request...' : 'Create Exchange Request'}
        </button>
      </form>
    </div>
  )
}

export default MoneyExchangeForm
