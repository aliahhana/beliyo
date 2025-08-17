import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import CurrencyConverter from '../components/CurrencyConverter'
import { ArrowRightLeft, Search, X, Edit2, Trash2, ArrowUpDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { currencyService } from '../services/currencyService'
import { useAuth } from '../contexts/AuthContext'

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
  const navigate = useNavigate()
  const { user } = useAuth()
  const [krwAmount, setKrwAmount] = useState('1000')
  const [myrAmount, setMyrAmount] = useState('3.07')
  const [fromCurrency, setFromCurrency] = useState('₩')
  const [toCurrency, setToCurrency] = useState('RM')
  const [exchangeRequests, setExchangeRequests] = useState<ExchangeRequest[]>([])
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [isMobile, setIsMobile] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [isConverting, setIsConverting] = useState(false)
  const [realTimeRate, setRealTimeRate] = useState('1₩ = RM 0.003040')

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    fetchExchangeRequests()
    loadExchangeRates()
    updateRealTimeRate()
  }, [])

  // Update real-time rate display
  useEffect(() => {
    updateRealTimeRate()
    
    // Update every 30 seconds for real-time feel
    const interval = setInterval(updateRealTimeRate, 30000)
    return () => clearInterval(interval)
  }, [fromCurrency, toCurrency])

  // Auto-convert when amount or currencies change
  useEffect(() => {
    const convertAmount = async () => {
      if (!krwAmount || krwAmount === '0' || isNaN(Number(krwAmount))) {
        setMyrAmount('0')
        return
      }

      setIsConverting(true)
      try {
        const converted = await currencyService.convertCurrency(
          Number(krwAmount),
          fromCurrency,
          toCurrency
        )
        setMyrAmount(converted.toFixed(fromCurrency === '₩' && toCurrency === 'RM' ? 4 : 2))
      } catch (error) {
        console.error('Error converting currency:', error)
        // Fallback conversion
        const fallbackRate = fromCurrency === '₩' && toCurrency === 'RM' ? 0.00304 : 328.95
        const converted = Number(krwAmount) * fallbackRate
        setMyrAmount(converted.toFixed(fromCurrency === '₩' && toCurrency === 'RM' ? 4 : 2))
      } finally {
        setIsConverting(false)
      }
    }

    const debounceTimer = setTimeout(convertAmount, 300)
    return () => clearTimeout(debounceTimer)
  }, [krwAmount, fromCurrency, toCurrency])

  const updateRealTimeRate = async () => {
    try {
      const rate = await currencyService.getRealTimeRate(fromCurrency, toCurrency)
      setRealTimeRate(rate)
      
      const lastUpdate = await currencyService.getLastUpdated()
      setLastUpdated(lastUpdate)
    } catch (error) {
      console.error('Error updating real-time rate:', error)
      setRealTimeRate('1₩ = RM 0.003040')
    }
  }

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
      return 'I want Korean won!'
    }
    return `Exchange ${request.from_currency} to ${request.to_currency}`
  }

  const getUserAvatar = (userId: string) => {
    // Generate consistent avatar based on user ID
    const avatars = ['👨‍💼', '👾', '👩‍💻', '🧑‍🎓', '👨‍🎨', '👩‍🔬']
    const index = userId.charCodeAt(0) % avatars.length
    return avatars[index]
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

  const handleBeliYoClick = () => {
    navigate('/')
  }

  const handleSearch = (query: string) => {
    if (query.trim()) {
      setShowSearchModal(false)
      navigate(`/shop?search=${encodeURIComponent(query.trim())}`)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      handleSearch(searchInput.trim())
      setSearchInput('')
    }
  }

  const handleEditRequest = (request: ExchangeRequest) => {
    navigate(`/edit-exchange/${request.id}`)
  }

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this exchange request?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('money_exchanges')
        .delete()
        .eq('id', requestId)

      if (error) throw error

      fetchExchangeRequests()
      alert('Exchange request deleted successfully!')
    } catch (error) {
      console.error('Error deleting exchange request:', error)
      alert('Failed to delete exchange request. Please try again.')
    }
  }

  const isUserRequest = (request: ExchangeRequest) => {
    return user && request.user_id === user.id
  }

  const formatExchangeAmount = (request: ExchangeRequest) => {
    if (request.from_currency === '₩') {
      return `₩${request.from_amount.toLocaleString()}`
    } else if (request.from_currency === 'RM') {
      return `RM${request.from_amount.toLocaleString()}`
    }
    return `${request.from_currency}${request.from_amount.toLocaleString()}`
  }

  const formatMobileExchangeDisplay = (request: ExchangeRequest) => {
    const fromSymbol = currencyService.getCurrencySymbol(request.from_currency)
    const toSymbol = currencyService.getCurrencySymbol(request.to_currency)
    
    return {
      fromAmount: `${fromSymbol}${request.from_amount.toLocaleString()}`,
      toAmount: `${toSymbol}${request.to_amount.toLocaleString()}`
    }
  }

  const swapCurrencies = () => {
    const tempCurrency = fromCurrency
    const tempAmount = krwAmount
    
    setFromCurrency(toCurrency)
    setToCurrency(tempCurrency)
    setKrwAmount(myrAmount)
    setMyrAmount(tempAmount)
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 pb-16">
        {/* Mobile Header */}
        <div className="bg-[#B91C1C] text-white">
          {/* Top bar with logo and search */}
          <div className="flex items-center justify-between p-4">
            <button 
              onClick={handleBeliYoClick}
              className="text-2xl font-bold hover:text-red-200 transition-colors"
            >
              BeliYo!
            </button>
            <div className="text-xl font-medium">Money Exchange</div>
            <button 
              onClick={() => setShowSearchModal(true)}
              className="hover:text-red-200 transition-colors"
            >
              <Search className="w-6 h-6" />
            </button>
          </div>
          
          {/* Currency Exchange Section - Fully Functional */}
          <div className="px-6 pb-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-1">CURRENCY</h2>
              <h2 className="text-2xl font-bold mb-4">EXCHANGE</h2>
              <div className="text-lg mb-2">{realTimeRate}</div>
              <div className="text-sm opacity-90">Updated: {formatLastUpdated(lastUpdated)}</div>
            </div>
            
            {/* Currency Input Fields - Fully Functional */}
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="number"
                  value={krwAmount}
                  onChange={(e) => setKrwAmount(e.target.value)}
                  className="w-full bg-transparent border-2 border-white/50 rounded-lg px-4 py-4 text-white text-xl font-medium placeholder-white/70 focus:outline-none focus:border-white"
                  placeholder="1000"
                  min="0"
                  step="any"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <select
                    value={fromCurrency}
                    onChange={(e) => setFromCurrency(e.target.value)}
                    className="bg-transparent text-white text-lg font-bold focus:outline-none cursor-pointer appearance-none pr-6"
                  >
                    <option value="₩" className="bg-[#B91C1C] text-white">₩</option>
                    <option value="RM" className="bg-[#B91C1C] text-white">RM</option>
                  </select>
                  <svg className="w-4 h-4 text-white absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              
              <div className="flex justify-center">
                <button
                  onClick={swapCurrencies}
                  className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                  disabled={isConverting}
                >
                  <ArrowUpDown className={`w-6 h-6 ${isConverting ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              <div className="relative">
                <input
                  type="number"
                  value={myrAmount}
                  onChange={(e) => {
                    setMyrAmount(e.target.value)
                    // Convert back to from currency
                    if (e.target.value && !isNaN(parseFloat(e.target.value))) {
                      const backConvertRate = toCurrency === 'RM' && fromCurrency === '₩' ? 328.95 : 0.00304
                      const backConverted = parseFloat(e.target.value) * backConvertRate
                      setKrwAmount(backConverted.toFixed(toCurrency === 'RM' && fromCurrency === '₩' ? 0 : 4))
                    }
                  }}
                  className="w-full bg-transparent border-2 border-white/50 rounded-lg px-4 py-4 text-white text-xl font-medium placeholder-white/70 focus:outline-none focus:border-white"
                  placeholder="3.0400"
                  min="0"
                  step="any"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  <select
                    value={toCurrency}
                    onChange={(e) => setToCurrency(e.target.value)}
                    className="bg-transparent text-white text-lg font-bold focus:outline-none cursor-pointer appearance-none pr-6"
                  >
                    <option value="₩" className="bg-[#B91C1C] text-white">₩</option>
                    <option value="RM" className="bg-[#B91C1C] text-white">RM</option>
                  </select>
                  <svg className="w-4 h-4 text-white absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Loading indicator */}
            {isConverting && (
              <div className="text-center text-white/70 text-sm mt-2">
                Converting...
              </div>
            )}

            {/* Request Exchange Button */}
            <div className="mt-6">
              <button
                onClick={() => navigate('/request-exchange?tab=exchange')}
                className="w-full bg-white text-[#B91C1C] py-3 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowRightLeft className="w-5 h-5" />
                Request Exchange
              </button>
            </div>
          </div>
        </div>

        {/* Search Modal */}
        {showSearchModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Search Products</h3>
                  <button
                    onClick={() => {
                      setShowSearchModal(false)
                      setSearchInput('')
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleSearchSubmit}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search for products..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#B91C1C] text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Exchange Requests */}
        <div className="bg-gray-50">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-gray-500">Loading exchange requests...</div>
            </div>
          ) : exchangeRequests.length === 0 ? (
            <div className="flex justify-center items-center h-64 px-4">
              <div className="text-center">
                <div className="text-gray-500 mb-4">No exchange requests found</div>
                <button
                  onClick={() => navigate('/request-exchange?tab=exchange')}
                  className="text-[#B91C1C] hover:underline"
                >
                  Be the first to post an exchange request
                </button>
              </div>
            </div>
          ) : (
            <div>
              {exchangeRequests.map((request) => {
                const exchangeDisplay = formatMobileExchangeDisplay(request)
                return (
                  <div key={request.id} className="bg-white border-b border-gray-200 px-4 py-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="text-3xl flex-shrink-0">{getUserAvatar(request.user_id)}</div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 text-sm mb-2">{getExchangeDescription(request)}</h3>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg font-bold text-gray-900">
                              {exchangeDisplay.fromAmount}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="text-lg font-bold text-[#B91C1C]">
                              {exchangeDisplay.toAmount}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {request.location || 'SKKU'} | {request.timeAgo}
                          </p>
                          {request.notes && (
                            <p className="text-xs text-gray-600 mt-2">
                              Note: {request.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {isUserRequest(request) && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditRequest(request)}
                            className="p-1.5 text-gray-600 hover:text-[#B91C1C] transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRequest(request.id)}
                            className="p-1.5 text-gray-600 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Chat with User Button - Centered in separate row */}
                    <div className="flex justify-center">
                      <button className="bg-[#B91C1C] text-white px-8 py-2 rounded-full text-sm font-medium hover:bg-red-700 transition-colors">
                        Chat with user
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Bottom Navigation - Standardized */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
          <div className="flex justify-around py-2">
            <button 
              onClick={() => navigate('/shop')}
              className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#B91C1C] transition-colors"
            >
              <span className="text-xl mb-1">🏪</span>
              <span className="text-xs font-medium">Shop</span>
            </button>
            <button 
              onClick={() => navigate('/money-exchange')}
              className="flex flex-col items-center py-2 px-3 text-[#B91C1C] font-medium"
            >
              <span className="text-xl mb-1">🔄</span>
              <span className="text-xs">Exchange</span>
            </button>
            <button 
              onClick={() => navigate('/chat')}
              className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#B91C1C] transition-colors"
            >
              <span className="text-xl mb-1">💬</span>
              <span className="text-xs font-medium">Chats</span>
            </button>
            <button 
              onClick={() => navigate('/mission')}
              className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#B91C1C] transition-colors"
            >
              <span className="text-xl mb-1">🎯</span>
              <span className="text-xs font-medium">Mission</span>
            </button>
            <button 
              onClick={() => navigate('/my-page')}
              className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#B91C1C] transition-colors"
            >
              <span className="text-xl mb-1">👤</span>
              <span className="text-xs font-medium">MyPage</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header variant="shop" />
      
      <div className="flex">
        {/* Simplified Sidebar */}
        <div className="w-64 bg-[#B91C1C] min-h-screen">
          <div className="p-6">
            <h2 className="text-white text-xl font-bold mb-2">CURRENCY</h2>
            <h2 className="text-white text-xl font-bold mb-6">EXCHANGE</h2>
            
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
          {/* Exchange Requests */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Recent Exchange Requests</h2>
              <button
                onClick={() => navigate('/request-exchange?tab=exchange')}
                className="flex items-center gap-2 bg-[#B91C1C] text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <ArrowRightLeft className="w-5 h-5" />
                Request Exchange
              </button>
            </div>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-gray-500">Loading exchange requests...</div>
              </div>
            ) : exchangeRequests.length === 0 ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-center">
                  <div className="text-gray-500 mb-4">No exchange requests found</div>
                  <button
                    onClick={() => navigate('/request-exchange?tab=exchange')}
                    className="text-[#B91C1C] hover:underline"
                  >
                    Be the first to post an exchange request
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {exchangeRequests.map((request) => (
                  <div key={request.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="text-3xl">{getUserAvatar(request.user_id)}</div>
                        <div className="flex-1">
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
                      
                      <div className="flex items-center gap-3">
                        {isUserRequest(request) && (
                          <>
                            <button
                              onClick={() => handleEditRequest(request)}
                              className="p-2 text-gray-600 hover:text-[#B91C1C] transition-colors"
                              title="Edit request"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRequest(request.id)}
                              className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                              title="Delete request"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        <button className="bg-[#B91C1C] text-white px-6 py-2 rounded-full font-medium hover:bg-red-700 transition-colors">
                          Chat with user
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MoneyExchangePage
