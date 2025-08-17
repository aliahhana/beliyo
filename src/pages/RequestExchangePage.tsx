import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { currencyService } from '../services/currencyService'

const RequestExchangePage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('KRW')
  const [exchangeType, setExchangeType] = useState<'need' | 'have'>('need')
  const [university, setUniversity] = useState('')
  const [customUniversity, setCustomUniversity] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null)

  const universities = [
    'Seoul National University (SNU)',
    'Korea Advanced Institute of Science and Technology (KAIST)',
    'Pohang University of Science and Technology (POSTECH)',
    'Yonsei University',
    'Korea University',
    'Sungkyunkwan University (SKKU)',
    'Hanyang University',
    'Kyung Hee University',
    'Ewha Womans University',
    'Sogang University',
    'Chung-Ang University',
    'Hankuk University of Foreign Studies (HUFS)',
    'Inha University',
    'Ajou University',
    'Konkuk University',
    'Dongguk University',
    'Hongik University',
    'Kookmin University',
    'Sejong University',
    'Dankook University',
    'Others'
  ]

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    // Pre-fill from URL params if available
    const fromTab = searchParams.get('tab')
    if (fromTab === 'exchange') {
      setCurrency('KRW')
    }
  }, [searchParams])

  // Calculate converted amount when amount or currency changes
  useEffect(() => {
    const calculateConversion = async () => {
      if (!amount || isNaN(parseFloat(amount))) {
        setConvertedAmount(null)
        return
      }

      try {
        const fromAmount = parseFloat(amount)
        const fromCurrency = currency
        const toCurrency = currency === 'KRW' ? 'MYR' : 'KRW'
        
        const rate = await currencyService.getExchangeRate(fromCurrency, toCurrency)
        const converted = fromAmount * rate
        setConvertedAmount(Math.round(converted * 100) / 100)
      } catch (error) {
        console.error('Error calculating conversion:', error)
        // Fallback calculation
        const fromAmount = parseFloat(amount)
        let converted = 0
        if (currency === 'KRW') {
          converted = fromAmount * 0.0031 // KRW to MYR
        } else {
          converted = fromAmount * 322.58 // MYR to KRW
        }
        setConvertedAmount(Math.round(converted * 100) / 100)
      }
    }

    calculateConversion()
  }, [amount, currency])

  const handleUniversityChange = (value: string) => {
    setUniversity(value)
    if (value !== 'Others') {
      setCustomUniversity('')
    }
  }

  const handleExchangeTypeToggle = () => {
    setExchangeType(prev => prev === 'need' ? 'have' : 'need')
  }

  const getTargetCurrency = () => {
    return currency === 'KRW' ? 'MYR' : 'KRW'
  }

  const getTargetCurrencySymbol = () => {
    return currency === 'KRW' ? 'RM' : '₩'
  }

  const getCurrentCurrencySymbol = () => {
    return currency === 'KRW' ? '₩' : 'RM'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      navigate('/login')
      return
    }

    if (!amount || !university) {
      alert('Please fill in all required fields')
      return
    }

    if (university === 'Others' && !customUniversity.trim()) {
      alert('Please enter your university name')
      return
    }

    setLoading(true)
    
    try {
      const inputAmount = parseFloat(amount)
      const finalUniversity = university === 'Others' ? customUniversity.trim() : university

      let fromAmount, fromCurrency, toAmount, toCurrency

      if (exchangeType === 'need') {
        // User needs this currency, so they have the other currency
        fromCurrency = currency === 'KRW' ? 'RM' : '₩'
        toCurrency = currency === 'KRW' ? '₩' : 'RM'
        toAmount = inputAmount
        fromAmount = convertedAmount || 0
      } else {
        // User has this currency, so they need the other currency
        fromCurrency = currency === 'KRW' ? '₩' : 'RM'
        toCurrency = currency === 'KRW' ? 'RM' : '₩'
        fromAmount = inputAmount
        toAmount = convertedAmount || 0
      }

      const { error } = await supabase
        .from('money_exchanges')
        .insert({
          user_id: user.id,
          from_amount: fromAmount,
          from_currency: fromCurrency,
          to_amount: toAmount,
          to_currency: toCurrency,
          location: finalUniversity,
          notes: notes || null,
          status: 'pending'
        })

      if (error) throw error

      alert('Exchange request posted successfully!')
      navigate('/money-exchange')
    } catch (error) {
      console.error('Error posting exchange request:', error)
      alert('Failed to post exchange request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Mobile Header */}
        <div className="bg-[#B91C1C] text-white p-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/money-exchange')}
              className="hover:text-red-200 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold">Request Exchange</h1>
          </div>
        </div>

        {/* Form */}
        <div className="p-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Exchange Type Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setExchangeType('need')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  exchangeType === 'need'
                    ? 'bg-[#B91C1C] text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                I need
              </button>
              <button
                type="button"
                onClick={() => setExchangeType('have')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  exchangeType === 'have'
                    ? 'bg-[#B91C1C] text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                I have
              </button>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {exchangeType === 'need' ? 'I need:' : 'I have:'} *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent"
                  required
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent bg-white"
                >
                  <option value="KRW">KRW</option>
                  <option value="MYR">MYR</option>
                </select>
              </div>
            </div>

            {/* Conversion Display */}
            {convertedAmount !== null && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-center gap-3 text-sm">
                  <span className="font-medium">
                    {getCurrentCurrencySymbol()} {amount}
                  </span>
                  <ArrowUpDown className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-600">
                    {getTargetCurrencySymbol()} {convertedAmount.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-600 text-center mt-2">
                  {exchangeType === 'need' 
                    ? `You'll give approximately ${getTargetCurrencySymbol()} ${convertedAmount.toLocaleString()}`
                    : `You'll receive approximately ${getTargetCurrencySymbol()} ${convertedAmount.toLocaleString()}`
                  }
                </p>
              </div>
            )}

            {/* University Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                University: *
              </label>
              <select
                value={university}
                onChange={(e) => handleUniversityChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent bg-white"
                required
              >
                <option value="">Select your university</option>
                {universities.map((uni) => (
                  <option key={uni} value={uni}>{uni}</option>
                ))}
              </select>
            </div>

            {/* Custom University Input */}
            {university === 'Others' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter University Name: *
                </label>
                <input
                  type="text"
                  value={customUniversity}
                  onChange={(e) => setCustomUniversity(e.target.value)}
                  placeholder="Enter your university name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent"
                  required
                />
              </div>
            )}

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any specific requirements or meeting preferences..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#B91C1C] text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Posting Request...' : 'Post Exchange Request'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 py-4">
            <button 
              onClick={() => navigate('/money-exchange')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Request Exchange</h1>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Exchange Type Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setExchangeType('need')}
                className={`flex-1 py-3 px-6 rounded-md text-base font-medium transition-colors ${
                  exchangeType === 'need'
                    ? 'bg-[#B91C1C] text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                I need
              </button>
              <button
                type="button"
                onClick={() => setExchangeType('have')}
                className={`flex-1 py-3 px-6 rounded-md text-base font-medium transition-colors ${
                  exchangeType === 'have'
                    ? 'bg-[#B91C1C] text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                I have
              </button>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {exchangeType === 'need' ? 'I need:' : 'I have:'} *
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent text-lg"
                  required
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent bg-white text-lg"
                >
                  <option value="KRW">KRW</option>
                  <option value="MYR">MYR</option>
                </select>
              </div>
            </div>

            {/* Conversion Display */}
            {convertedAmount !== null && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center justify-center gap-4 text-lg">
                  <span className="font-semibold">
                    {getCurrentCurrencySymbol()} {amount}
                  </span>
                  <ArrowUpDown className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-600">
                    {getTargetCurrencySymbol()} {convertedAmount.toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 text-center mt-3">
                  {exchangeType === 'need' 
                    ? `You'll give approximately ${getTargetCurrencySymbol()} ${convertedAmount.toLocaleString()}`
                    : `You'll receive approximately ${getTargetCurrencySymbol()} ${convertedAmount.toLocaleString()}`
                  }
                </p>
              </div>
            )}

            {/* University Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                University: *
              </label>
              <select
                value={university}
                onChange={(e) => handleUniversityChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent bg-white text-lg"
                required
              >
                <option value="">Select your university</option>
                {universities.map((uni) => (
                  <option key={uni} value={uni}>{uni}</option>
                ))}
              </select>
            </div>

            {/* Custom University Input */}
            {university === 'Others' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter University Name: *
                </label>
                <input
                  type="text"
                  value={customUniversity}
                  onChange={(e) => setCustomUniversity(e.target.value)}
                  placeholder="Enter your university name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent text-lg"
                  required
                />
              </div>
            )}

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any specific requirements or meeting preferences..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#B91C1C] text-white py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {loading ? 'Posting Request...' : 'Post Exchange Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default RequestExchangePage
