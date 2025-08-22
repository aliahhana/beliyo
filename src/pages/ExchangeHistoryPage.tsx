import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Header'
import { Store, ShoppingCart, RefreshCw, Target, MessageCircle, ArrowLeft, Search, X, Calendar, MapPin, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { currencyService } from '../services/currencyService'

interface ExchangeHistoryItem {
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
  updated_at: string
  timeAgo: string
  completedAgo: string
}

const ExchangeHistoryPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isMobile, setIsMobile] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [exchangeHistory, setExchangeHistory] = useState<ExchangeHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login')
    } else {
      fetchExchangeHistory()
    }
  }, [user, navigate])

  const fetchExchangeHistory = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('money_exchanges')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('updated_at', { ascending: false })

      if (error) throw error

      const historyWithTimeAgo = data?.map(item => ({
        ...item,
        timeAgo: getTimeAgo(item.created_at),
        completedAgo: getTimeAgo(item.updated_at)
      })) || []

      setExchangeHistory(historyWithTimeAgo)
    } catch (error) {
      console.error('Error fetching exchange history:', error)
    } finally {
      setLoading(false)
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

  const getExchangeDescription = (item: ExchangeHistoryItem) => {
    if (item.from_currency === '₩' && item.to_currency === 'RM') {
      return 'Exchanged KRW to MYR'
    } else if (item.from_currency === 'RM' && item.to_currency === '₩') {
      return 'Exchanged MYR to KRW'
    }
    return `Exchanged ${item.from_currency} to ${item.to_currency}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const sidebarItems = [
    { icon: Store, label: 'My Shop', path: '/my-shop' },
    { icon: ShoppingCart, label: 'Purchase History', path: '/my-page' },
    { icon: RefreshCw, label: 'Exchange History', path: '/exchange-history', active: true },
    { icon: Target, label: 'Mission', path: '/mission-history' },
    { icon: MessageCircle, label: 'Chat List', path: '/my-page' }
  ]

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

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header variant="shop" />
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <RefreshCw className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Sign In Required</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Please sign in to view your exchange history and completed transactions.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate('/login')}
                className="bg-red-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-100">
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
            <div className="text-xl font-medium">EXCHANGE HISTORY</div>
            <button 
              onClick={() => setShowSearchModal(true)}
              className="hover:text-red-200 transition-colors"
            >
              <Search className="w-6 h-6" />
            </button>
          </div>
          
          {/* Navigation Grid - 2 Rows Structure */}
          <div className="px-4 pb-4">
            <div className="space-y-4 text-sm">
              {/* Row 1 - 3 items */}
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => navigate('/my-shop')}
                  className="flex flex-col items-center gap-2 p-3 text-white hover:bg-red-700 transition-colors"
                >
                  <Store className="w-6 h-6" />
                  <span className="font-medium text-xs">My Shop</span>
                </button>
                
                <button 
                  onClick={() => navigate('/my-page')}
                  className="flex flex-col items-center gap-2 p-3 text-white hover:bg-red-700 transition-colors"
                >
                  <ShoppingCart className="w-6 h-6" />
                  <span className="font-medium text-xs">Purchase History</span>
                </button>
                
                <button className="flex flex-col items-center gap-2 p-3 text-white hover:bg-red-700 transition-colors bg-red-700">
                  <RefreshCw className="w-6 h-6" />
                  <span className="font-medium text-xs">Exchange History</span>
                </button>
              </div>
              
              {/* Row 2 - 2 items */}
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => navigate('/my-page')}
                  className="flex flex-col items-center gap-2 p-3 text-white hover:bg-red-700 transition-colors"
                >
                  <Target className="w-6 h-6" />
                  <span className="font-medium text-xs">Mission</span>
                </button>
                
                <button 
                  onClick={() => navigate('/my-page')}
                  className="flex flex-col items-center gap-2 p-3 text-white hover:bg-red-700 transition-colors"
                >
                  <MessageCircle className="w-6 h-6" />
                  <span className="font-medium text-xs">Chat List</span>
                </button>
              </div>
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

        {/* Main Content */}
        <div className="bg-gray-100 pb-20">
          {/* Exchange History */}
          <div className="p-4">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-gray-500">Loading exchange history...</div>
              </div>
            ) : exchangeHistory.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RefreshCw className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Exchange History</h3>
                <p className="text-gray-600 mb-6">You haven't completed any currency exchanges yet.</p>
                <button
                  onClick={() => navigate('/money-exchange')}
                  className="bg-[#B91C1C] text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Start Exchanging
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {exchangeHistory.map((item) => (
                  <div key={item.id} className="bg-white rounded-lg shadow-sm p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 text-sm mb-1">
                          {getExchangeDescription(item)}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-base font-bold">
                            {currencyService.getCurrencySymbol(item.from_currency)}{item.from_amount.toLocaleString()}
                          </p>
                          <span className="text-gray-400">→</span>
                          <p className="text-base font-bold text-green-600">
                            {currencyService.getCurrencySymbol(item.to_currency)}{item.to_amount.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{item.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Completed {item.completedAgo}</span>
                          </div>
                        </div>
                        {item.notes && (
                          <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            Note: {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
              className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#B91C1C] transition-colors"
            >
              <span className="text-xl mb-1">🔄</span>
              <span className="text-xs font-medium">Exchange</span>
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
    <div className="min-h-screen bg-gray-100">
      <Header variant="shop" />
      
      <div className="flex">
        {/* Red Sidebar */}
        <div className="w-64 bg-[#B91C1C] min-h-screen">
          <div className="p-6">
            <h1 className="text-white text-xl font-bold mb-6">MY PAGE</h1>
            
            <div className="space-y-2">
              {sidebarItems.map((item, index) => {
                const Icon = item.icon
                return (
                  <div
                    key={index}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-3 p-3 text-white hover:bg-red-700 transition-colors cursor-pointer ${
                      item.active ? 'bg-red-700' : ''
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="flex items-center gap-4 mb-8">
            <button 
              onClick={() => navigate('/my-page')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Exchange History</h2>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-gray-500">Loading exchange history...</div>
            </div>
          ) : exchangeHistory.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <RefreshCw className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-4">No Exchange History</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                You haven't completed any currency exchanges yet. Start your first exchange to see your history here.
              </p>
              <button
                onClick={() => navigate('/money-exchange')}
                className="bg-[#B91C1C] text-white px-8 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Start Exchanging
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {exchangeHistory.map((item) => (
                <div key={item.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900 text-lg">
                          {getExchangeDescription(item)}
                        </h3>
                        <span className="text-sm text-gray-500">
                          {formatDate(item.updated_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <p className="text-xl font-bold">
                          {currencyService.getCurrencySymbol(item.from_currency)}{item.from_amount.toLocaleString()}
                        </p>
                        <span className="text-gray-400">→</span>
                        <p className="text-xl font-bold text-green-600">
                          {currencyService.getCurrencySymbol(item.to_currency)}{item.to_amount.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-500 mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{item.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>Completed {item.completedAgo}</span>
                        </div>
                      </div>
                      {item.notes && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Note:</span> {item.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ExchangeHistoryPage
