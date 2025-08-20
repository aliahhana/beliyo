import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Plus, Phone, Video, MoreVertical } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { exchangeChatService, ExchangeMessage, ConnectionState, UserPresence } from '../services/exchangeChatService'

const MoneyExchangeChatPage: React.FC = () => {
  const { exchangeId } = useParams<{ exchangeId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [messages, setMessages] = useState<ExchangeMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    retryCount: 0
  })
  const [userPresence, setUserPresence] = useState<UserPresence[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [exchangeDetails, setExchangeDetails] = useState<any>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize chat when component mounts
  useEffect(() => {
    if (exchangeId && user) {
      initializeChat()
    }

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [exchangeId, user])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const initializeChat = async () => {
    if (!exchangeId || !user) return

    try {
      setLoading(true)
      
      // First, get exchange details to understand the context
      await loadExchangeDetails()
      
      // Always allow access for now - we'll validate through the service
      setHasAccess(true)
      
      // Load existing messages
      const existingMessages = await exchangeChatService.getExchangeMessages(exchangeId)
      setMessages(existingMessages)
      
      // Get unread count
      const unread = await exchangeChatService.getUnreadMessageCount(exchangeId, user.id)
      setUnreadCount(unread)
      
      // Mark messages as read
      await exchangeChatService.markMessagesAsRead(exchangeId, user.id)
      
      // Set up real-time subscription
      const unsubscribe = exchangeChatService.subscribeToExchangeMessages(
        exchangeId,
        user.id,
        handleNewMessage,
        handlePresenceUpdate,
        handleError,
        handleConnectionChange
      )
      
      unsubscribeRef.current = unsubscribe
      
    } catch (error) {
      console.error('Error initializing chat:', error)
      // Don't block access due to initialization errors
      setHasAccess(true)
    } finally {
      setLoading(false)
    }
  }

  const loadExchangeDetails = async () => {
    if (!exchangeId) return

    try {
      // Try to load exchange details from the money_exchanges table
      const { data: exchange, error } = await exchangeChatService['supabase']
        ?.from('money_exchanges')
        .select('*')
        .or(`id.eq.${exchangeId},unique_id.eq.${exchangeId}`)
        .maybeSingle()

      if (!error && exchange) {
        setExchangeDetails(exchange)
      }
    } catch (error) {
      console.error('Error loading exchange details:', error)
      // Don't fail if we can't load details
    }
  }

  const handleNewMessage = (message: ExchangeMessage) => {
    setMessages(prevMessages => {
      // Prevent duplicates
      const exists = prevMessages.some(m => m.id === message.id)
      if (exists) return prevMessages
      
      return [...prevMessages, message]
    })

    // Mark as read if it's not from current user
    if (message.sender_id !== user?.id && exchangeId) {
      exchangeChatService.markMessagesAsRead(exchangeId, user!.id)
    }
  }

  const handlePresenceUpdate = (presence: UserPresence[]) => {
    setUserPresence(presence)
    
    // Check if other user is typing
    const otherUser = presence.find(p => p.user_id !== user?.id)
    setOtherUserTyping(otherUser?.is_typing || false)
  }

  const handleError = (error: any) => {
    console.error('Chat error:', error)
  }

  const handleConnectionChange = (state: ConnectionState) => {
    setConnectionState(state)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !exchangeId || !user) return

    const messageContent = newMessage.trim()
    setNewMessage('')

    // Clear typing status
    if (isTyping) {
      setIsTyping(false)
      await exchangeChatService.setTypingStatus(exchangeId, user.id, false)
    }

    try {
      // For now, we'll use a placeholder receiver ID
      // In a real implementation, you'd determine the other party from the exchange
      const receiverId = exchangeDetails?.user_id === user.id 
        ? 'other_user_placeholder' 
        : exchangeDetails?.user_id || 'other_user_placeholder'

      const result = await exchangeChatService.sendMessage(
        exchangeId,
        user.id,
        receiverId,
        messageContent
      )

      if (!result.success) {
        console.error('Failed to send message:', result.error)
        // Optionally show error to user
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNewMessage(value)

    if (!exchangeId || !user) return

    // Handle typing indicators
    if (value.trim() && !isTyping) {
      setIsTyping(true)
      await exchangeChatService.setTypingStatus(exchangeId, user.id, true)
    } else if (!value.trim() && isTyping) {
      setIsTyping(false)
      await exchangeChatService.setTypingStatus(exchangeId, user.id, false)
    }

    // Clear typing status after timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(async () => {
      if (isTyping) {
        setIsTyping(false)
        await exchangeChatService.setTypingStatus(exchangeId, user.id, false)
      }
    }, 3000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getConnectionStatusColor = () => {
    switch (connectionState.status) {
      case 'connected': return 'bg-green-500'
      case 'connecting': return 'bg-yellow-500'
      case 'reconnecting': return 'bg-orange-500'
      default: return 'bg-red-500'
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionState.status) {
      case 'connected': return 'Connected'
      case 'connecting': return 'Connecting...'
      case 'reconnecting': return 'Reconnecting...'
      default: return 'Disconnected'
    }
  }

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const isOwnMessage = (message: ExchangeMessage) => {
    return message.sender_id === user?.id
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    )
  }

  // Always show the chat interface - remove access denial
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/money-exchange')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-sm">
                {exchangeDetails?.from_currency?.[0] || 'EX'}
              </span>
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">
                Exchange Chat
              </h1>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`}></div>
                <span className="text-xs text-gray-500">
                  {getConnectionStatusText()}
                </span>
                {otherUserTyping && (
                  <span className="text-xs text-blue-600 italic">typing...</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Phone className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Video className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-2">No messages yet</p>
            <p className="text-sm text-gray-400">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  isOwnMessage(message)
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <div className={`flex items-center justify-end gap-1 mt-1`}>
                  <span className={`text-xs ${
                    isOwnMessage(message) ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {formatMessageTime(message.created_at)}
                  </span>
                  {isOwnMessage(message) && message.delivery_status && (
                    <span className="text-xs text-blue-100">
                      {message.delivery_status === 'sent' && '✓'}
                      {message.delivery_status === 'delivered' && '✓✓'}
                      {message.delivery_status === 'failed' && '!'}
                      {message.delivery_status === 'sending' && '⏳'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Plus className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full bg-gray-100 rounded-full px-4 py-2 pr-12 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            />
          </div>
          
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Connection Status Banner */}
      {connectionState.status !== 'connected' && (
        <div className={`px-4 py-2 text-center text-white text-sm ${
          connectionState.status === 'connecting' ? 'bg-yellow-600' :
          connectionState.status === 'reconnecting' ? 'bg-orange-600' : 'bg-red-600'
        }`}>
          {getConnectionStatusText()}
          {connectionState.lastError && (
            <span className="ml-2">- {connectionState.lastError}</span>
          )}
        </div>
      )}
    </div>
  )
}

export default MoneyExchangeChatPage
