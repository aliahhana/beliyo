import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import CurrencyConverter from '../components/CurrencyConverter'
import { ArrowRightLeft, TrendingUp, Clock, Info, Globe, Shield, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { currencyService } from '../services/currencyService'

interface ExchangeRequest {
  id: string
  user_id: string
  from_amount: number
  from_currency: string
  to_amount: number
  to_currency: string
  notes?: string
  location: string
  status: string
  created_at: string
  timeAgo: string
}

interface ExchangeRate {
  currency_code: string
  currency_name: string
  rate: number
}

const MoneyExchangePage: React.FC = () => {
  const [krwAmount, setKrwAmount] = useState('1000')
  const [myrAmount, setMyrAmount] = useState('3.39')
  const [fromCurrency, setFromCurrency] = useState('₩')
  const [toCurrency, setToCurrency] = useState('RM')
  const [exchangeRequests, setExchangeRequests] = useState<ExchangeRequest[]>([])
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  useEffect(() => {
    fetchExchangeRequests()
    loadExchangeRates()
  }, [])

  const fetchExchangeRequests = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('money_exchanges')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error

      const requestsWithTimeAgo = data?.map(request => ({
        ...request,
        timeAgo: getTimeAgo(request.created_at)
      })) || []

      setExchangeRequests(requestsWithTimeAgo)
    } catch (error) {
      console.error('Error fetching exchange requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadExchangeRates = async () => {
    try {
      const rates = await currencyService.getExchangeRates()
      const lastUpdate = await currencyService.getLastUpdated()
      setExchangeRates(rates.slice(0, 6)) // Show top 6 currencies
      setLastUpdated(lastUpdate)
    } catch (error) {
      console.error('Error loading exchange rates:', error)
    }
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`
    return `${Math.floor(diffInMinutes / 1440)} days ago`
  }

  const getExchangeDescription = (request: ExchangeRequest) => {
    if (request.from_currency === '₩' && request.to_currency === 'RM') {
      return 'I want RM!'
    } else if (request.from_currency === 'RM' && request.to_currency === '₩') {
      return 'I want Korean won'
    }
    return `Exchange ${request.from_currency} to ${request.to_currency}`
  }

  const getRandomAvatar = () => {
    const avatars = ['👨‍💼', '👾', '👩‍💻', '🧑‍🎓', '👨‍🎨', '👩‍🔬']
    return avatars[Math.floor(Math.random() * avatars.length)]
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
      return 'Just now'
    }
  }

  const sidebarItems = [
    { icon: TrendingUp, label: 'Live Rates', active: true },
    { icon: Clock, label: 'Rate History' },
    { icon: Info, label: 'Exchange Info' }
  ]

  const features = [
    { icon: Globe, label: 'Global Coverage', description: '180+ currencies' },
    { icon: Zap, label: 'Real-time', description: 'Live market rates' },
    { icon: Shield, label: 'Secure', description: 'Bank-level security' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Header variant="shop" />
      
      <div className="flex">
        {/* Standardized Sidebar */}
        <div className="w-64 bg-[#B91C1C] min-h-screen">
          <div className="p-6">
            <h2 className="text-white text-xl font-bold mb-2">CURRENCY</h2>
            <h2 className="text-white text-xl font-bold mb-6">EXCHANGE</h2>
            
            {/* Navigation Items */}
            <div className="space-y-2 mb-6">
              {sidebarItems.map((item, index) => {
                const Icon = item.icon
                return (
                  <div
                    key={index}
                    className={`flex items-center gap-3 px-4 py-3 text-white hover:bg-red-700 transition-colors cursor-pointer ${
                      item.active ? 'bg-red-700' : ''
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                )
              })}
            </div>
            
            {/* Features */}
            <div className="space-y-3 mb-6">
              {features.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <div key={index} className="bg-white/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-white" />
                      <span className="text-white text-sm font-medium">{feature.label}</span>
                    </div>
                    <p className="text-white/70 text-xs">{feature.description}</p>
                  </div>
                )
              })}
            </div>

            {/* Currency Converter */}
            <CurrencyConverter
              fromAmount={krwAmount}
              fromCurrency={fromCurrency}
              toAmount={myrAmount}
              toCurrency={toCurrency}
              onFromAmountChange={setKrwAmount}
              onFromCurrencyChange={setFromCurrency}
              onToAmountChange={setMyrAmount}
              onToCurrencyChange={setToCurrency}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Header with Live Rates */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Money Exchange Requests</h1>
                <p className="text-gray-600">
                  Live exchange rates • Updated: {formatLastUpdated(lastUpdated)}
                </p>
              </div>
              <Link
                to="/seller?tab=exchange"
                className="flex items-center gap-2 bg-[#B91C1C] text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <ArrowRightLeft className="w-5 h-5" />
                Request Exchange
              </Link>
            </div>

            {/* Live Exchange Rates Grid */}
            <div className="grid grid-cols-6 gap-3 mb-6">
              {exchangeRates.map((rate) => (
                <div key={rate.currency_code} className="bg-white rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-gray-900">{rate.currency_code}</span>
                    <span className={`text-xs ${Math.random() > 0.5 ? 'text-green-600' : 'text-red-600'}`}>
                      {Math.random() > 0.5 ? '↑' : '↓'} {(Math.random() * 2).toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{rate.currency_name}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {currencyService.formatCurrency(rate.rate, 'MYR')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Exchange Requests */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-gray-500">Loading exchange requests...</div>
            </div>
          ) : exchangeRequests.length === 0 ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="text-gray-500 mb-4">No exchange requests found</div>
                <Link
                  to="/seller?tab=exchange"
                  className="text-[#B91C1C] hover:underline"
                >
                  Be the first to post an exchange request
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {exchangeRequests.map((request) => (
                <div key={request.id} className="bg-white rounded-lg shadow-md p-6 flex items-center justify-between hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{getRandomAvatar()}</div>
                    <div>
                      <h3 className="font-medium text-gray-900">{getExchangeDescription(request)}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-lg font-bold">
                          {currencyService.getCurrencySymbol(request.from_currency)}{request.from_amount.toLocaleString()}
                        </p>
                        <span className="text-gray-400">→</span>
                        <p className="text-lg font-bold text-[#B91C1C]">
                          {currencyService.getCurrencySymbol(request.to_currency)}{request.to_amount.toLocaleString()}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500">
                        {request.location || 'Location not specified'} | {request.timeAgo}
                      </p>
                      {request.notes && (
                        <p className="text-sm text-gray-600 mt-1">
                          Note: {request.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <button className="bg-[#B91C1C] text-white px-6 py-2 rounded-full font-medium hover:bg-red-700 transition-colors">
                    Chat with user
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MoneyExchangePage
