import { useState, useEffect, useRef } from 'react'
import { useAuth } from './useAuth'
import { 
  unifiedChatService, 
  UnifiedMessage, 
  ChatContext, 
  ConnectionState, 
  UserPresence 
} from '../services/unifiedChatService'

interface UseUnifiedChatOptions {
  context: ChatContext
  otherUserId: string // Required for 1:1 conversations
  autoConnect?: boolean
}

interface UseUnifiedChatReturn {
  messages: UnifiedMessage[]
  loading: boolean
  connected: boolean
  connectionState: ConnectionState
  userPresence: UserPresence[]
  unreadCount: number
  isTyping: boolean
  otherUserTyping: boolean
  sendMessage: (content: string, messageType?: 'text' | 'system' | 'action') => Promise<void>
  setTyping: (typing: boolean) => Promise<void>
  markAsRead: () => Promise<void>
  reconnect: () => Promise<void>
  disconnect: () => void
}

export const useUnifiedChat = ({ 
  context, 
  otherUserId,
  autoConnect = true 
}: UseUnifiedChatOptions): UseUnifiedChatReturn => {
  const { user } = useAuth()
  const [messages, setMessages] = useState<UnifiedMessage[]>([])
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
  
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize chat when component mounts or context changes
  useEffect(() => {
    if (user && otherUserId && autoConnect) {
      initializeChat()
    }

    // Cleanup on unmount or context change
    return () => {
      disconnect()
    }
  }, [context, user, otherUserId, autoConnect])

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

  const sendMessage = async (content: string, messageType: 'text' | 'system' | 'action' = 'text') => {
    if (!content.trim() || !conversationId || !user) return

    // Clear typing status
    if (isTyping) {
      await setTyping(false)
    }

    try {
      const result = await unifiedChatService.sendMessage(
        conversationId,
        user.id,
        content.trim(),
        context,
        messageType
      )

      if (!result.success) {
        console.error('Failed to send message:', result.error)
        throw new Error(result.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  const setTyping = async (typing: boolean) => {
    if (!conversationId || !user) return

    setIsTyping(typing)
    await unifiedChatService.setTypingStatus(conversationId, user.id, typing, context)

    // Clear typing status after timeout
    if (typing) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      typingTimeoutRef.current = setTimeout(async () => {
        setIsTyping(false)
        await unifiedChatService.setTypingStatus(conversationId, user.id, false, context)
      }, 3000)
    }
  }

  const markAsRead = async () => {
    if (!conversationId || !user) return

    try {
      await unifiedChatService.markMessagesAsRead(conversationId, user.id)
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const reconnect = async () => {
    disconnect()
    await initializeChat()
  }

  const disconnect = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
    setConnectionState({ status: 'disconnected', retryCount: 0 })
  }

  return {
    messages,
    loading,
    connected: connectionState.status === 'connected',
    connectionState,
    userPresence,
    unreadCount,
    isTyping,
    otherUserTyping,
    sendMessage,
    setTyping,
    markAsRead,
    reconnect,
    disconnect
  }
}
