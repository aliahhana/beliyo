import React, { useState, useEffect, useRef } from 'react'
import { Send, Plus, Phone, Video, MoreVertical, ArrowLeft } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { 
  unifiedChatService, 
  UnifiedMessage, 
  ChatContext, 
  ConnectionState, 
  UserPresence 
} from '../services/unifiedChatService'

interface UnifiedChatProps {
  context: ChatContext
  otherUserId: string // Required for 1:1 conversations
  onBack?: () => void
  className?: string
}

const UnifiedChat: React.FC<UnifiedChatProps> = ({ context, otherUserId, onBack, className = '' }) => {
  const { user } = useAuth()
  const [messages, setMessages] = useState<UnifiedMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    retryCount: 0
  })
  const [userPresence, setUserPresence] = useState<UserPresence[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // FIXED: Add validation for required parameters
  if (!user) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-50 ${className}`}>
        <div className="text-center">
          <p className="text-gray-600 mb-2">Please log in to access chat</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  if (!otherUserId) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-50 ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <p className="text-gray-600 mb-2">Unable to determine chat recipient</p>
          <p className="text-sm text-gray-400 mb-4">1:1 conversations require a specific user</p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    )
  }

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Initialize chat when component mounts or context changes
  useEffect(() => {
    if (user && otherUserId) {
      initializeChat()
    }

    // Cleanup on unmount or context change
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [context, user, otherUserId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const initializeChat = async () => {
    if (!user || !otherUserId) return

    try {
      setLoading(true)
      
      // Get or create 1:1 conversation for this context
      const conversationId = await unifiedChatService.getOrCreateConversation(context, user.id, otherUserId)
      
      if (!conversationId) {
        console.error('Failed to get or create conversation')
        return
      }

      setConversationId(conversationId)
      
      // Load existing messages
      const existingMessages = await unifiedChatService.getMessages(conversationId)
      setMessages(existingMessages)
      
      // Get unread count
      const unread = await unifiedChatService.getUnreadMessageCount(conversationId, user.id)
      setUnreadCount(unread)
      
      // Mark messages as read
      await unifiedChatService.markMessagesAsRead(conversationId, user.id)
      
      // Set up real-time subscription
      const unsubscribe = unifiedChatService.subscribeToConversation(
        conversationId,
        user.id,
        handleNewMessage,
        handlePresenceUpdate,
        handleError,
        handleConnectionChange
      )
      
      unsubscribeRef.current = unsubscribe
      
    } catch (error) {
      console.error('Error initializing unified chat:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNewMessage = (message: UnifiedMessage) => {
    setMessages(prevMessages => {
      // Prevent duplicates
      const exists = prevMessages.some(m => m.id === message.id)
      if (exists) return prevMessages
      
      return [...prevMessages, message]
    })

    // Mark as read if it's not from current user
    if (message.user_id !== user?.id && conversationId) {
      unifiedChatService.markMessagesAsRead(conversationId, user!.id)
    }
  }

  const handlePresenceUpdate = (presence: UserPresence[]) => {
    setUserPresence(presence)
    
    // Check if other user is typing
    const otherUser = presence.find(p => p.user_id === otherUserId)
    setOtherUserTyping(otherUser?.is_typing || false)
  }

  const handleError = (error: any) => {
    console.error('Unified chat error:', error)
  }

  const handleConnectionChange = (state: ConnectionState) => {
    setConnectionState(state)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user) return

    const messageContent = newMessage.trim()
    setNewMessage('')

    // Clear typing status
    if (isTyping) {
      setIsTyping(false)
      await unifiedChatService.setTypingStatus(conversationId, user.id, false, context)
    }

    try {
      const result = await unifiedChatService.sendMessage(
        conversationId,
        user.id,
        messageContent,
        context
      )

      if (!result.success) {
        console.error('Failed to send message:', result.error)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNewMessage(value)

    if (!conversationId || !user) return

    // Handle typing indicators
    if (value.trim() && !isTyping) {
      setIsTyping(true)
      await unifiedChatService.setTypingStatus(conversationId, user.id, true, context)
    } else if (!value.trim() && isTyping) {
      setIsTyping(false)
      await unifiedChatService.setTypingStatus(conversationId, user.id, false, context)
    }

    // Clear typing status after timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(async () => {
      if (isTyping) {
        setIsTyping(false)
        await unifiedChatService.setTypingStatus(conversationId, user.id, false, context)
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

  const isOwnMessage = (message: UnifiedMessage) => {
    return message.user_id === user?.id
  }

  const getContextTitle = () => {
    if (context.title) return context.title
    
    switch (context.type) {
      case 'shop': return context.id ? 'Product Chat' : 'Shop Chat'
      case 'exchange': return context.id ? 'Exchange Chat' : 'Money Exchange'
      case 'mission': return context.id ? 'Mission Chat' : 'Mission Board'
      default: return 'Direct Message'
    }
  }

  const getContextIcon = () => {
    switch (context.type) {
      case 'shop': return '🛍️'
      case 'exchange': return '💱'
      case 'mission': return '🎯'
      default: return '💬'
    }
  }

  const getOtherUserStatus = () => {
    const otherUser = userPresence.find(p => p.user_id === otherUserId)
    if (otherUser?.is_online) {
      return 'Online'
    }
    return 'Offline'
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-50 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversation...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-lg">{getContextIcon()}</span>
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">
                {getContextTitle()}
              </h1>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`}></div>
                <span className="text-xs text-gray-500">
                  {getConnectionStatusText()} • {getOtherUserStatus()}
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
              <span className="text-2xl">{getContextIcon()}</span>
            </div>
            <p className="text-gray-500 mb-2">No messages yet</p>
            <p className="text-sm text-gray-400">Start the conversation about {context.type}!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  message.message_type === 'system'
                    ? 'bg-gray-100 text-gray-600 text-center text-sm'
                    : isOwnMessage(message)
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                {message.message_type !== 'system' && (
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
                )}
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
              placeholder={`Message about ${context.type}...`}
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

export default UnifiedChat
