import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'
import { 
  MessageCircle, 
  Search, 
  Filter, 
  Clock, 
  User, 
  ShoppingCart, 
  DollarSign, 
  ChevronRight,
  X,
  Store,
  Target,
  RefreshCw,
  LogIn,
  Loader
} from 'lucide-react'

interface ChatItem {
  id: string
  conversation_id: string
  type: 'shop' | 'exchange' | 'mission' | 'general'
  title: string
  subtitle: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  isOnline: boolean
  avatar: string
  otherUserId: string
  contextId?: string
  chatPath: string
}

/**
 * Chat List Page - Using conversations table structure
 */
const ChatListPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [chats, setChats] = useState<ChatItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'shop' | 'exchange' | 'mission' | 'general'>('all')
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

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
    if (!user) {
      navigate('/login')
    } else {
      fetchAllChats()
    }
  }, [user, navigate])

  const fetchAllChats = async () => {
    if (!user) return

    try {
      setLoading(true)
      console.log('Fetching chats for user:', user.id)
      
      const allChats: ChatItem[] = []

      // Fetch conversations where user is a participant
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false })

      console.log('Conversations query result:', { conversations, convError })

      if (conversations && conversations.length > 0) {
        for (const conv of conversations) {
          // Determine the other user
          const otherUserId = conv.participant1_id === user.id ? conv.participant2_id : conv.participant1_id
          
          // Get the last message for this conversation
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          // Get unread count
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id)
            .eq('is_read', false)

          // Create appropriate title based on context
          let title = 'Chat'
          let subtitle = ''
          let avatar = '💬'
          let chatPath = ''

          if (conv.context_type === 'shop' && conv.context_id) {
            // Get product info
            const { data: product } = await supabase
              .from('products')
              .select('name')
              .eq('id', conv.context_id)
              .single()
            
            title = product?.name || 'Product Chat'
            subtitle = 'Product Discussion'
            avatar = '🛍️'
            chatPath = `/chat/shop/${conv.context_id}/${otherUserId}`
          } else if (conv.context_type === 'exchange' && conv.context_id) {
            // Get exchange info
            const { data: exchange } = await supabase
              .from('money_exchanges')
              .select('from_currency, to_currency')
              .eq('id', conv.context_id)
              .single()
            
            title = exchange ? `${exchange.from_currency} → ${exchange.to_currency}` : 'Exchange Chat'
            subtitle = 'Currency Exchange'
            avatar = '💱'
            chatPath = `/chat/exchange/${conv.context_id}/${otherUserId}`
          } else if (conv.context_type === 'mission' && conv.context_id) {
            // Get mission info
            const { data: mission } = await supabase
              .from('missions')
              .select('title')
              .eq('id', conv.context_id)
              .single()
            
            title = mission?.title || 'Mission Chat'
            subtitle = 'Mission Discussion'
            avatar = '🎯'
            chatPath = `/chat/mission/${conv.context_id}/${otherUserId}`
          } else {
            title = 'Direct Message'
            subtitle = 'Private Chat'
            avatar = '💬'
            chatPath = `/chat/direct/${otherUserId}`
          }

          allChats.push({
            id: conv.id,
            conversation_id: conv.id,
            type: conv.context_type as 'shop' | 'exchange' | 'mission' | 'general',
            title,
            subtitle,
            lastMessage: lastMsg?.content || conv.last_message || 'No messages yet',
            lastMessageTime: lastMsg?.created_at || conv.last_message_at || conv.created_at,
            unreadCount: unreadCount || 0,
            isOnline: false,
            avatar,
            otherUserId,
            contextId: conv.context_id,
            chatPath
          })
        }
      }

      // Also check for any orphaned product messages (backwards compatibility)
      const { data: userProducts } = await supabase
        .from('products')
        .select('id, name, seller_id')
        .eq('seller_id', user.id)

      if (userProducts && userProducts.length > 0) {
        for (const product of userProducts) {
          // Check if we already have a conversation for this
          const existingChat = allChats.find(chat => 
            chat.type === 'shop' && chat.contextId === product.id
          )
          
          if (!existingChat) {
            // Create a placeholder chat entry for products with potential buyers
            allChats.push({
              id: `product_${product.id}`,
              conversation_id: `product_${product.id}`,
              type: 'shop',
              title: product.name,
              subtitle: 'Your Product',
              lastMessage: 'No messages yet',
              lastMessageTime: new Date().toISOString(),
              unreadCount: 0,
              isOnline: false,
              avatar: '🛍️',
              otherUserId: '',
              contextId: product.id,
              chatPath: `/chat/shop/${product.id}/seller`
            })
          }
        }
      }

      console.log('Total chats found:', allChats.length)
      console.log('All chats:', allChats)
      
      setChats(allChats)
    } catch (error) {
      console.error('Error fetching chats:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         chat.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFilter = filterType === 'all' || chat.type === filterType
    
    return matchesSearch && matchesFilter
  })

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60)
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString()
    }
  }

  const getChatIcon = (type: string) => {
    switch (type) {
      case 'shop':
        return <ShoppingCart className="w-5 h-5 text-blue-600" />
      case 'exchange':
        return <DollarSign className="w-5 h-5 text-green-600" />
      case 'mission':
        return <Target className="w-5 h-5 text-purple-600" />
      case 'general':
        return <MessageCircle className="w-5 h-5 text-gray-600" />
      default:
        return <MessageCircle className="w-5 h-5 text-gray-600" />
    }
  }

  const handleChatClick = (chat: ChatItem) => {
    navigate(chat.chatPath)
  }

  const handleBeliYoClick = () => {
    navigate('/')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header variant="shop" />
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <LogIn className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Sign In Required</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Please sign in to access your chat history.
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

  const sidebarItems = [
    { icon: Store, label: 'My Shop', path: '/my-shop' },
    { icon: ShoppingCart, label: 'Purchase History', path: '/my-page' },
    { icon: RefreshCw, label: 'Exchange History', path: '/exchange-history' },
    { icon: Target, label: 'Mission', path: '/mission-history' },
    { icon: MessageCircle, label: 'Chat List', path: '/chat-list', active: true }
  ]

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-100">
        {/* Mobile Header */}
        <div className="bg-[#B91C1C] text-white">
          <div className="flex items-center justify-between p-4">
            <button 
              onClick={handleBeliYoClick}
              className="text-2xl font-bold hover:text-red-200 transition-colors"
            >
              BeliYo!
            </button>
            <div className="text-xl font-medium">Chat List</div>
            <button 
              onClick={() => setShowFilterModal(true)}
              className="hover:text-red-200 transition-colors"
            >
              <Filter className="w-6 h-6" />
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
                
                <button 
                  onClick={() => navigate('/exchange-history')}
                  className="flex flex-col items-center gap-2 p-3 text-white hover:bg-red-700 transition-colors"
                >
                  <RefreshCw className="w-6 h-6" />
                  <span className="font-medium text-xs">Exchange History</span>
                </button>
              </div>
              
              {/* Row 2 - 2 items */}
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => navigate('/mission-history')}
                  className="flex flex-col items-center gap-2 p-3 text-white hover:bg-red-700 transition-colors"
                >
                  <Target className="w-6 h-6" />
                  <span className="font-medium text-xs">Mission</span>
                </button>
                
                <button 
                  onClick={() => navigate('/chat-list')}
                  className="flex flex-col items-center gap-2 p-3 text-white hover:bg-red-700 transition-colors bg-red-700"
                >
                  <MessageCircle className="w-6 h-6" />
                  <span className="font-medium text-xs">Chat List</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Modal */}
        {showFilterModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Filter Chats</h3>
                  <button
                    onClick={() => setShowFilterModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="space-y-2">
                  {[
                    { value: 'all', label: 'All Chats', icon: MessageCircle },
                    { value: 'shop', label: 'Shop Chats', icon: ShoppingCart },
                    { value: 'exchange', label: 'Exchange Chats', icon: DollarSign },
                    { value: 'mission', label: 'Mission Chats', icon: Target },
                  ].map((filter) => {
                    const Icon = filter.icon
                    return (
                      <button
                        key={filter.value}
                        onClick={() => {
                          setFilterType(filter.value as any)
                          setShowFilterModal(false)
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          filterType === filter.value
                            ? 'bg-[#B91C1C] text-white'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{filter.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white px-4 py-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="bg-gray-100 pb-20">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-[#B91C1C]" />
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="bg-white mx-4 mt-4 rounded-lg p-8 text-center">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Chats Found</h3>
              <p className="text-gray-600 text-sm">
                {searchQuery ? 'Try adjusting your search terms.' : 'Start a conversation to see your chats here.'}
              </p>
            </div>
          ) : (
            <div className="px-4 py-4 space-y-2">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => handleChatClick(chat)}
                  className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 flex-shrink-0">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl">
                        {chat.avatar}
                      </div>
                      {chat.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                      {chat.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getChatIcon(chat.type)}
                        <h3 className="font-semibold text-gray-900 text-sm truncate">{chat.title}</h3>
                      </div>
                      <p className="text-xs text-gray-500 mb-1 truncate">{chat.subtitle}</p>
                      <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-gray-400">{formatTime(chat.lastMessageTime)}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
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
              onClick={() => navigate('/chat-list')}
              className="flex flex-col items-center py-2 px-3 text-[#B91C1C] font-medium"
            >
              <span className="text-xl mb-1">💬</span>
              <span className="text-xs">Chats</span>
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
            <h1 
              onClick={() => navigate('/my-page')}
              className="text-white text-xl font-bold mb-6 cursor-pointer hover:opacity-90 transition-opacity"
            >
              MY PAGE
            </h1>
            
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
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Chat List</h2>
            <p className="text-gray-600">All your conversations in one place</p>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent"
                />
              </div>
              <div className="flex gap-2">
                {[
                  { value: 'all', label: 'All', icon: MessageCircle },
                  { value: 'shop', label: 'Shop', icon: ShoppingCart },
                  { value: 'exchange', label: 'Exchange', icon: DollarSign },
                  { value: 'mission', label: 'Mission', icon: Target }
                ].map((filter) => {
                  const Icon = filter.icon
                  return (
                    <button
                      key={filter.value}
                      onClick={() => setFilterType(filter.value as any)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        filterType === filter.value
                          ? 'bg-[#B91C1C] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{filter.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Chat List */}
          {loading ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Loader className="w-12 h-12 animate-spin text-[#B91C1C] mx-auto mb-4" />
              <p className="text-gray-600">Loading your chats...</p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Chats Found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery ? 'Try adjusting your search terms.' : 'Start a conversation to see your chats here.'}
              </p>
              <button
                onClick={() => navigate('/shop')}
                className="bg-[#B91C1C] text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Browse Products
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              {filteredChats.map((chat, index) => (
                <div
                  key={chat.id}
                  onClick={() => handleChatClick(chat)}
                  className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    index !== filteredChats.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="relative w-14 h-14 flex-shrink-0">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-2xl">
                      {chat.avatar}
                    </div>
                    {chat.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                    {chat.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                        {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getChatIcon(chat.type)}
                      <h3 className="font-semibold text-gray-900 truncate">{chat.title}</h3>
                    </div>
                    <p className="text-sm text-gray-500 mb-1 truncate">{chat.subtitle}</p>
                    <p className="text-gray-600 truncate">{chat.lastMessage}</p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(chat.lastMessageTime)}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
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

export default ChatListPage
