import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { exchangeChatService } from '../services/exchangeChatService'
import { moneyExchangeService } from '../services/moneyExchangeService'
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
  Award,
  Users,
  Target,
  RefreshCw,
  LogIn,
  Loader
} from 'lucide-react'

interface ChatItem {
  id: string
  type: 'product' | 'exchange' | 'general'
  title: string
  subtitle: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  isOnline: boolean
  avatar: string
  productImage?: string
  exchangeDetails?: {
    fromAmount: number
    fromCurrency: string
    toAmount: number
    toCurrency: string
    exchangeId: string
    status: string
  }
  chatPath: string
}

const ChatListPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [chats, setChats] = useState<ChatItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'product' | 'exchange' | 'general'>('all')
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
      const allChats: ChatItem[] = []

      // Fetch product chats
      await fetchProductChats(allChats)
      
      // Fetch exchange chats (both from exchangeChatService and MoneyExchangeChatPage history)
      await fetchExchangeChats(allChats)
      await fetchMoneyExchangeChats(allChats)
      
      // Fetch general chats
      await fetchGeneralChats(allChats)

      // Sort by last message time
      allChats.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime())
      
      setChats(allChats)
    } catch (error) {
      console.error('Error fetching chats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProductChats = async (allChats: ChatItem[]) => {
    try {
      // Get channels that start with 'product_'
      const { data: channels, error: channelsError } = await supabase
        .from('channels')
        .select('*')
        .like('name', 'product_%')

      if (channelsError) {
        console.error('Error fetching product channels:', channelsError)
        return
      }

      if (!channels || channels.length === 0) return

      // Get messages for these channels
      for (const channel of channels) {
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('channel_id', channel.id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (messagesError) continue

        const lastMessage = messages?.[0]
        if (!lastMessage) continue

        // Get product details
        const productId = channel.name.replace('product_', '')
        const { data: product } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single()

        if (product) {
          // Get unread count
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', channel.id)
            .neq('user_id', user.id)
            .is('read_at', null)

          allChats.push({
            id: `product_${productId}`,
            type: 'product',
            title: product.title || product.name || 'Product Chat',
            subtitle: `${product.price ? `${product.currency}${product.price.toLocaleString()}` : 'FREE'} • ${product.category}`,
            lastMessage: lastMessage.content,
            lastMessageTime: lastMessage.created_at,
            unreadCount: unreadCount || 0,
            isOnline: false,
            avatar: '🛍️',
            productImage: product.images?.[0] || product.image_url,
            chatPath: `/chat/${productId}`
          })
        }
      }
    } catch (error) {
      console.error('Error fetching product chats:', error)
    }
  }

  const fetchExchangeChats = async (allChats: ChatItem[]) => {
    try {
      const exchangeChats = await exchangeChatService.getUserExchangeChats(user!.id)
      
      for (const exchangeChat of exchangeChats) {
        if (exchangeChat.last_message) {
          allChats.push({
            id: `exchange_${exchangeChat.exchange_id}`,
            type: 'exchange',
            title: 'Money Exchange',
            subtitle: `${exchangeChat.exchange_details.from_currency}${exchangeChat.exchange_details.from_amount.toLocaleString()} → ${exchangeChat.exchange_details.to_currency}${exchangeChat.exchange_details.to_amount.toLocaleString()}`,
            lastMessage: exchangeChat.last_message.content,
            lastMessageTime: exchangeChat.last_message.created_at,
            unreadCount: exchangeChat.unread_count,
            isOnline: exchangeChat.other_user_presence?.is_online || false,
            avatar: '💱',
            exchangeDetails: {
              fromAmount: exchangeChat.exchange_details.from_amount,
              fromCurrency: exchangeChat.exchange_details.from_currency,
              toAmount: exchangeChat.exchange_details.to_amount,
              toCurrency: exchangeChat.exchange_details.to_currency,
              exchangeId: exchangeChat.exchange_id,
              status: 'active'
            },
            chatPath: `/chat/exchange/${exchangeChat.exchange_id}`
          })
        }
      }
    } catch (error) {
      console.error('Error fetching exchange chats:', error)
    }
  }

  const fetchMoneyExchangeChats = async (allChats: ChatItem[]) => {
    try {
      // Get money exchange requests for the current user
      const exchangeResult = await moneyExchangeService.getExchangeRequests({
        user_id: user!.id,
        limit: 50
      })

      if (!exchangeResult.success || !exchangeResult.data) return

      // Get exchange messages from exchange_messages table
      const { data: exchangeMessages, error: messagesError } = await supabase
        .from('exchange_messages')
        .select(`
          *,
          sender:profiles!exchange_messages_sender_id_fkey(user_id, full_name),
          receiver:profiles!exchange_messages_receiver_id_fkey(user_id, full_name)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (messagesError) {
        console.error('Error fetching exchange messages:', messagesError)
        return
      }

      // Group messages by exchange_id and get the latest message for each
      const exchangeMessageMap = new Map<string, any>()
      
      if (exchangeMessages) {
        for (const message of exchangeMessages) {
          if (!exchangeMessageMap.has(message.exchange_id) || 
              new Date(message.created_at) > new Date(exchangeMessageMap.get(message.exchange_id).created_at)) {
            exchangeMessageMap.set(message.exchange_id, message)
          }
        }
      }

      // Create chat items for exchanges with messages
      for (const exchange of exchangeResult.data) {
        const lastMessage = exchangeMessageMap.get(exchange.unique_id || exchange.id)
        
        if (lastMessage) {
          // Count unread messages for this exchange
          const { count: unreadCount } = await supabase
            .from('exchange_messages')
            .select('*', { count: 'exact', head: true })
            .eq('exchange_id', exchange.unique_id || exchange.id)
            .neq('sender_id', user.id)
            .is('read_at', null)

          // Determine if other user is online (simplified for now)
          const otherUserId = lastMessage.sender_id === user.id ? lastMessage.receiver_id : lastMessage.sender_id
          const { data: presenceData } = await supabase
            .from('user_presence')
            .select('is_online')
            .eq('user_id', otherUserId)
            .single()

          // Check if this exchange chat already exists (avoid duplicates)
          const existingChatIndex = allChats.findIndex(chat => 
            chat.id === `money_exchange_${exchange.unique_id || exchange.id}` ||
            chat.id === `exchange_${exchange.unique_id || exchange.id}`
          )

          if (existingChatIndex === -1) {
            allChats.push({
              id: `money_exchange_${exchange.unique_id || exchange.id}`,
              type: 'exchange',
              title: 'Money Exchange Chat',
              subtitle: `${exchange.from_currency}${exchange.from_amount.toLocaleString()} → ${exchange.to_currency}${exchange.to_amount.toLocaleString()} • ${exchange.status}`,
              lastMessage: lastMessage.content,
              lastMessageTime: lastMessage.created_at,
              unreadCount: unreadCount || 0,
              isOnline: presenceData?.is_online || false,
              avatar: '💰',
              exchangeDetails: {
                fromAmount: exchange.from_amount,
                fromCurrency: exchange.from_currency,
                toAmount: exchange.to_amount,
                toCurrency: exchange.to_currency,
                exchangeId: exchange.unique_id || exchange.id,
                status: exchange.status
              },
              chatPath: `/chat/exchange/${exchange.unique_id || exchange.id}`
            })
          }
        }
      }

      // Also check for any exchange chats where user might be the receiver
      const { data: receivedExchanges, error: receivedError } = await supabase
        .from('exchange_messages')
        .select(`
          exchange_id,
          content,
          created_at,
          sender_id,
          receiver_id
        `)
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })

      if (!receivedError && receivedExchanges) {
        const receivedExchangeIds = [...new Set(receivedExchanges.map(msg => msg.exchange_id))]
        
        for (const exchangeId of receivedExchangeIds) {
          // Skip if we already have this exchange
          if (allChats.some(chat => chat.exchangeDetails?.exchangeId === exchangeId)) continue

          const lastMessage = receivedExchanges.find(msg => msg.exchange_id === exchangeId)
          if (!lastMessage) continue

          // Try to get exchange details
          const exchangeResult = await moneyExchangeService.getExchangeRequestByUniqueId(exchangeId)
          
          if (exchangeResult.success && exchangeResult.data) {
            const exchange = exchangeResult.data

            // Count unread messages
            const { count: unreadCount } = await supabase
              .from('exchange_messages')
              .select('*', { count: 'exact', head: true })
              .eq('exchange_id', exchangeId)
              .neq('sender_id', user.id)
              .is('read_at', null)

            // Check sender's online status
            const { data: presenceData } = await supabase
              .from('user_presence')
              .select('is_online')
              .eq('user_id', lastMessage.sender_id)
              .single()

            allChats.push({
              id: `money_exchange_received_${exchangeId}`,
              type: 'exchange',
              title: 'Money Exchange Chat',
              subtitle: `${exchange.from_currency}${exchange.from_amount.toLocaleString()} → ${exchange.to_currency}${exchange.to_amount.toLocaleString()} • ${exchange.status}`,
              lastMessage: lastMessage.content,
              lastMessageTime: lastMessage.created_at,
              unreadCount: unreadCount || 0,
              isOnline: presenceData?.is_online || false,
              avatar: '💰',
              exchangeDetails: {
                fromAmount: exchange.from_amount,
                fromCurrency: exchange.from_currency,
                toAmount: exchange.to_amount,
                toCurrency: exchange.to_currency,
                exchangeId: exchangeId,
                status: exchange.status
              },
              chatPath: `/chat/exchange/${exchangeId}`
            })
          }
        }
      }
    } catch (error) {
      console.error('Error fetching money exchange chats:', error)
    }
  }

  const fetchGeneralChats = async (allChats: ChatItem[]) => {
    try {
      // Get general channel
      const { data: generalChannel } = await supabase
        .from('channels')
        .select('*')
        .eq('name', 'general')
        .single()

      if (!generalChannel) return

      // Get last message
      const { data: messages } = await supabase
        .from('messages')
        .select('*')
        .eq('channel_id', generalChannel.id)
        .order('created_at', { ascending: false })
        .limit(1)

      const lastMessage = messages?.[0]
      if (!lastMessage) return

      // Get unread count
      const { count: unreadCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', generalChannel.id)
        .neq('user_id', user.id)
        .is('read_at', null)

      allChats.push({
        id: 'general',
        type: 'general',
        title: 'General Chat',
        subtitle: 'Community discussions',
        lastMessage: lastMessage.content,
        lastMessageTime: lastMessage.created_at,
        unreadCount: unreadCount || 0,
        isOnline: true,
        avatar: '💬',
        chatPath: '/chat'
      })
    } catch (error) {
      console.error('Error fetching general chats:', error)
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
      case 'product':
        return <ShoppingCart className="w-5 h-5 text-blue-600" />
      case 'exchange':
        return <DollarSign className="w-5 h-5 text-green-600" />
      case 'general':
        return <MessageCircle className="w-5 h-5 text-purple-600" />
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
    { icon: Target, label: 'Mission', path: '/my-page' },
    { icon: Award, label: 'Badges', path: '/my-page' },
    { icon: MessageCircle, label: 'Chat List', path: '/chat-list', active: true },
    { icon: Users, label: 'Chingu List', path: '/my-page' }
  ]

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-100">
        {/* Mobile Header */}
        <div className="bg-[#B91C1C] text-white">
          {/* Top bar with logo and title */}
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
          
          {/* Navigation Grid - 3 Rows Structure */}
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
              
              {/* Row 2 - 3 items */}
              <div className="grid grid-cols-3 gap-2">
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
                  <Award className="w-6 h-6" />
                  <span className="font-medium text-xs">Badges</span>
                </button>
                
                <button 
                  onClick={() => navigate('/chat-list')}
                  className="flex flex-col items-center gap-2 p-3 text-white hover:bg-red-700 transition-colors bg-red-700"
                >
                  <MessageCircle className="w-6 h-6" />
                  <span className="font-medium text-xs">Chat List</span>
                </button>
              </div>
              
              {/* Row 3 - 1 item centered */}
              <div className="flex justify-center">
                <button 
                  onClick={() => navigate('/my-page')}
                  className="flex flex-col items-center gap-2 p-3 text-white hover:bg-red-700 transition-colors w-1/3"
                >
                  <Users className="w-6 h-6" />
                  <span className="font-medium text-xs">Chingu List</span>
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
                    { value: 'product', label: 'Product Chats', icon: ShoppingCart },
                    { value: 'exchange', label: 'Exchange Chats', icon: DollarSign },
                    { value: 'general', label: 'General Chat', icon: MessageCircle }
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
                    {/* Avatar/Image */}
                    <div className="relative w-12 h-12 flex-shrink-0">
                      {chat.productImage ? (
                        <img
                          src={chat.productImage}
                          alt={chat.title}
                          className="w-12 h-12 rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=100'
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-2xl">
                          {chat.avatar}
                        </div>
                      )}
                      {chat.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                      {chat.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                        </div>
                      )}
                    </div>

                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getChatIcon(chat.type)}
                        <h3 className="font-semibold text-gray-900 text-sm truncate">{chat.title}</h3>
                        {chat.exchangeDetails?.status && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            chat.exchangeDetails.status === 'completed' ? 'bg-green-100 text-green-800' :
                            chat.exchangeDetails.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {chat.exchangeDetails.status}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mb-1 truncate">{chat.subtitle}</p>
                      <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
                    </div>

                    {/* Time and Arrow */}
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
              onClick={() => navigate('/chat')}
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
                  { value: 'product', label: 'Products', icon: ShoppingCart },
                  { value: 'exchange', label: 'Exchange', icon: DollarSign }
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
                  {/* Avatar/Image */}
                  <div className="relative w-14 h-14 flex-shrink-0">
                    {chat.productImage ? (
                      <img
                        src={chat.productImage}
                        alt={chat.title}
                        className="w-14 h-14 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=100'
                        }}
                      />
                    ) : (
                      <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-2xl">
                        {chat.avatar}
                      </div>
                    )}
                    {chat.isOnline && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                    {chat.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                        {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                      </div>
                    )}
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getChatIcon(chat.type)}
                      <h3 className="font-semibold text-gray-900 truncate">{chat.title}</h3>
                      {chat.exchangeDetails?.status && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          chat.exchangeDetails.status === 'completed' ? 'bg-green-100 text-green-800' :
                          chat.exchangeDetails.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {chat.exchangeDetails.status}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-1 truncate">{chat.subtitle}</p>
                    <p className="text-gray-600 truncate">{chat.lastMessage}</p>
                  </div>

                  {/* Time and Arrow */}
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
