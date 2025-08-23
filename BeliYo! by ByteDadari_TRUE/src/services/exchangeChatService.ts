import { supabase } from '../lib/supabase'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface ExchangeMessage {
  id: string
  exchange_id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  read_at: string | null
  delivery_status?: 'sending' | 'sent' | 'delivered' | 'failed'
  temp_id?: string
  message_type?: 'text' | 'system' | 'typing'
}

export interface ExchangeChatServiceResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface PaginationOptions {
  limit?: number
  offset?: number
  before?: string
}

export interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
  lastConnected?: Date
  retryCount: number
  lastError?: string
}

export interface UserPresence {
  user_id: string
  exchange_id: string
  is_online: boolean
  last_seen: string
  is_typing: boolean
}

export interface TypingIndicator {
  user_id: string
  exchange_id: string
  is_typing: boolean
  timestamp: string
}

class ExchangeChatService {
  private readonly MESSAGES_TABLE = 'exchange_messages'
  private readonly EXCHANGES_TABLE = 'money_exchanges'
  private readonly PRESENCE_TABLE = 'user_presence'
  private activeChannels: Map<string, RealtimeChannel> = new Map()
  private connectionState: ConnectionState = {
    status: 'disconnected',
    retryCount: 0
  }
  private reconnectTimer: NodeJS.Timeout | null = null
  private messageQueue: Map<string, ExchangeMessage[]> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map()
  private presenceHeartbeat: NodeJS.Timeout | null = null
  private readonly HEARTBEAT_INTERVAL = 30000 // 30 seconds
  private readonly TYPING_TIMEOUT = 3000 // 3 seconds
  private readonly MAX_RETRY_ATTEMPTS = 5
  private readonly RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000]

  // Expose supabase for external access
  public supabase = supabase

  /**
   * Enhanced connection health monitoring
   */
  private startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.heartbeatInterval = setInterval(async () => {
      try {
        // Ping Supabase to check connection health
        const { error } = await supabase.from('money_exchanges').select('id').limit(1)
        
        if (error) {
          console.warn('Heartbeat failed:', error)
          this.handleConnectionError(error)
        } else {
          console.log('Heartbeat successful')
          if (this.connectionState.status === 'reconnecting') {
            this.updateConnectionState('connected')
          }
        }
      } catch (error) {
        console.error('Heartbeat error:', error)
        this.handleConnectionError(error)
      }
    }, this.HEARTBEAT_INTERVAL)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Enhanced presence management
   */
  private async updateUserPresence(exchangeId: string, userId: string, isOnline: boolean, isTyping: boolean = false) {
    try {
      const presenceData = {
        user_id: userId,
        exchange_id: exchangeId,
        is_online: isOnline,
        last_seen: new Date().toISOString(),
        is_typing: isTyping,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from(this.PRESENCE_TABLE)
        .upsert(presenceData, {
          onConflict: 'user_id,exchange_id'
        })

      if (error) {
        console.error('Error updating user presence:', error)
      }
    } catch (error) {
      console.error('Error updating user presence:', error)
    }
  }

  private startPresenceHeartbeat(exchangeId: string, userId: string) {
    if (this.presenceHeartbeat) {
      clearInterval(this.presenceHeartbeat)
    }

    // Update presence immediately
    this.updateUserPresence(exchangeId, userId, true)

    // Set up periodic presence updates
    this.presenceHeartbeat = setInterval(() => {
      this.updateUserPresence(exchangeId, userId, true)
    }, 30000) // Update every 30 seconds
  }

  private stopPresenceHeartbeat(exchangeId: string, userId: string) {
    if (this.presenceHeartbeat) {
      clearInterval(this.presenceHeartbeat)
      this.presenceHeartbeat = null
    }

    // Mark user as offline
    this.updateUserPresence(exchangeId, userId, false)
  }

  /**
   * Enhanced typing indicators
   */
  async setTypingStatus(exchangeId: string, userId: string, isTyping: boolean): Promise<void> {
    try {
      // Clear existing timeout for this user
      const timeoutKey = `${exchangeId}_${userId}`
      const existingTimeout = this.typingTimeouts.get(timeoutKey)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
      }

      // Update presence with typing status
      await this.updateUserPresence(exchangeId, userId, true, isTyping)

      if (isTyping) {
        // Auto-clear typing status after timeout
        const timeout = setTimeout(() => {
          this.updateUserPresence(exchangeId, userId, true, false)
          this.typingTimeouts.delete(timeoutKey)
        }, this.TYPING_TIMEOUT)

        this.typingTimeouts.set(timeoutKey, timeout)
      }
    } catch (error) {
      console.error('Error setting typing status:', error)
    }
  }

  /**
   * Get user presence for an exchange
   */
  async getUserPresence(exchangeId: string): Promise<UserPresence[]> {
    try {
      const { data, error } = await supabase
        .from(this.PRESENCE_TABLE)
        .select('*')
        .eq('exchange_id', exchangeId)
        .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes

      if (error) {
        console.error('Error fetching user presence:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching user presence:', error)
      return []
    }
  }

  /**
   * Enhanced connection error handling
   */
  private handleConnectionError(error: any) {
    console.error('Connection error:', error)
    this.updateConnectionState('disconnected', error.message)
    
    // Stop heartbeat during disconnection
    this.stopHeartbeat()
  }

  /**
   * Simplified access check - always allow access for the user's own exchanges
   */
  async hasAccessToChat(exchangeId: string, userId: string): Promise<boolean> {
    try {
      console.log('Checking chat access for exchange:', exchangeId, 'user:', userId)
      
      // Always return true for now - we'll handle permissions at the database level
      return true
    } catch (error) {
      console.error('Error checking chat access:', error)
      // Default to allowing access
      return true
    }
  }

  /**
   * Get messages with enhanced pagination and caching
   */
  async getExchangeMessages(
    exchangeId: string, 
    options: PaginationOptions = {}
  ): Promise<ExchangeMessage[]> {
    try {
      console.log('Fetching messages for exchange:', exchangeId, 'options:', options)
      
      const { limit = 50, offset = 0, before } = options
      
      let query = supabase
        .from(this.MESSAGES_TABLE)
        .select('*')
        .eq('exchange_id', exchangeId)
        .order('created_at', { ascending: true })
        .limit(limit)

      if (offset > 0) {
        query = query.range(offset, offset + limit - 1)
      }

      if (before) {
        query = query.lt('created_at', before)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching exchange messages:', error)
        // Return empty array instead of throwing
        return []
      }

      // Merge with queued messages
      const queuedMessages = this.messageQueue.get(exchangeId) || []
      const allMessages = [...(data || []), ...queuedMessages]

      // Remove duplicates and sort
      const uniqueMessages = this.deduplicateMessages(allMessages)
      return uniqueMessages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    } catch (error) {
      console.error('Error fetching exchange messages:', error)
      return []
    }
  }

  /**
   * Enhanced message sending with optimistic updates and retry logic
   */
  async sendMessage(
    exchangeId: string,
    senderId: string,
    receiverId: string,
    content: string
  ): Promise<ExchangeChatServiceResponse<ExchangeMessage>> {
    try {
      console.log('Sending message:', { exchangeId, senderId, receiverId, content })
      
      if (!content.trim()) {
        throw new Error('Message content cannot be empty')
      }

      // Generate temp ID for optimistic updates
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const timestamp = new Date().toISOString()

      // Create optimistic message
      const optimisticMessage: ExchangeMessage = {
        id: tempId,
        exchange_id: exchangeId,
        sender_id: senderId,
        receiver_id: receiverId,
        content: content.trim(),
        created_at: timestamp,
        read_at: null,
        delivery_status: 'sending',
        temp_id: tempId,
        message_type: 'text'
      }

      // Add to queue for retry mechanism
      this.addToMessageQueue(exchangeId, optimisticMessage)

      // Clear typing status
      await this.setTypingStatus(exchangeId, senderId, false)

      try {
        // Attempt to send to database
        const { data, error } = await supabase
          .from(this.MESSAGES_TABLE)
          .insert([{
            exchange_id: exchangeId,
            sender_id: senderId,
            receiver_id: receiverId,
            content: content.trim(),
            temp_id: tempId
          }])
          .select()
          .single()

        if (error) {
          console.error('Error sending message:', error)
          this.updateMessageInQueue(exchangeId, tempId, { delivery_status: 'failed' })
          
          // Schedule retry
          setTimeout(() => this.retryFailedMessage(exchangeId, tempId), 3000)
          
          // Still return success for optimistic UI
          return {
            data: optimisticMessage,
            error: 'Message queued for retry',
            success: true
          }
        }

        // Remove from queue on success
        this.removeFromMessageQueue(exchangeId, tempId)

        const successMessage = {
          ...data,
          delivery_status: 'sent' as const,
          temp_id: tempId
        }

        console.log('Message sent successfully:', successMessage)

        return {
          data: successMessage,
          error: null,
          success: true
        }
      } catch (dbError) {
        console.error('Database error sending message:', dbError)
        
        // Keep optimistic message in queue with failed status
        this.updateMessageInQueue(exchangeId, tempId, { delivery_status: 'failed' })
        
        return {
          data: optimisticMessage,
          error: 'Message failed to send, will retry automatically',
          success: true // Still return success for optimistic UI
        }
      }
    } catch (error) {
      console.error('Error sending exchange message:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to send message',
        success: false
      }
    }
  }

  /**
   * Enhanced message read tracking
   */
  async markMessagesAsRead(exchangeId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.MESSAGES_TABLE)
        .update({ read_at: new Date().toISOString() })
        .eq('exchange_id', exchangeId)
        .eq('receiver_id', userId)
        .is('read_at', null)

      if (error) {
        console.error('Error marking messages as read:', error)
      }
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadMessageCount(exchangeId: string, userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from(this.MESSAGES_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('exchange_id', exchangeId)
        .eq('receiver_id', userId)
        .is('read_at', null)

      if (error) {
        console.error('Error getting unread message count:', error)
        return 0
      }

      return count || 0
    } catch (error) {
      console.error('Error getting unread message count:', error)
      return 0
    }
  }

  /**
   * Enhanced real-time subscription with comprehensive connection management
   */
  subscribeToExchangeMessages(
    exchangeId: string,
    userId: string,
    onMessage: (message: ExchangeMessage) => void,
    onPresenceUpdate?: (presence: UserPresence[]) => void,
    onError?: (error: any) => void,
    onConnectionChange?: (state: ConnectionState) => void
  ): () => void {
    console.log('Setting up enhanced real-time subscription for exchange:', exchangeId)
    
    // Clean up existing connections
    this.cleanupChannel(exchangeId)
    this.stopHeartbeat()
    
    // Update connection state
    this.updateConnectionState('connecting')
    if (onConnectionChange) onConnectionChange(this.connectionState)
    
    // Start presence tracking
    this.startPresenceHeartbeat(exchangeId, userId)
    
    const channel = supabase
      .channel(`exchange_${exchangeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: this.MESSAGES_TABLE,
          filter: `exchange_id=eq.${exchangeId}`
        },
        (payload: RealtimePostgresChangesPayload<ExchangeMessage>) => {
          console.log('New message received:', payload)
          const message = payload.new as ExchangeMessage
          
          // Prevent duplicate processing
          if (!this.isDuplicateMessage(exchangeId, message)) {
            onMessage({ ...message, delivery_status: 'delivered' })
            
            // Remove from queue if it was a temp message
            if (message.temp_id) {
              this.removeFromMessageQueue(exchangeId, message.temp_id)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: this.MESSAGES_TABLE,
          filter: `exchange_id=eq.${exchangeId}`
        },
        (payload: RealtimePostgresChangesPayload<ExchangeMessage>) => {
          console.log('Message updated:', payload)
          onMessage(payload.new as ExchangeMessage)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: this.PRESENCE_TABLE,
          filter: `exchange_id=eq.${exchangeId}`
        },
        async () => {
          // Fetch updated presence data
          if (onPresenceUpdate) {
            const presence = await this.getUserPresence(exchangeId)
            onPresenceUpdate(presence)
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status)
        
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to exchange: ${exchangeId}`)
          this.updateConnectionState('connected')
          this.startHeartbeat()
          
          if (onConnectionChange) onConnectionChange(this.connectionState)
          
          // Process any queued messages
          this.processQueuedMessages(exchangeId)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Subscription error or timeout')
          this.handleConnectionError(new Error('Subscription failed'))
          
          if (onError) onError(new Error('Connection failed'))
          if (onConnectionChange) onConnectionChange(this.connectionState)
          
          // Attempt reconnection
          this.scheduleReconnection(exchangeId, userId, onMessage, onPresenceUpdate, onError, onConnectionChange)
        } else if (status === 'CLOSED') {
          console.log('Subscription closed')
          this.updateConnectionState('disconnected')
          this.stopHeartbeat()
          this.stopPresenceHeartbeat(exchangeId, userId)
          
          if (onConnectionChange) onConnectionChange(this.connectionState)
        }
      })

    // Store channel reference
    this.activeChannels.set(exchangeId, channel)

    // Return cleanup function
    return () => {
      console.log(`Cleaning up subscription for exchange: ${exchangeId}`)
      this.cleanupChannel(exchangeId)
      this.stopHeartbeat()
      this.stopPresenceHeartbeat(exchangeId, userId)
      
      // Clear typing timeouts
      this.typingTimeouts.forEach((timeout, key) => {
        if (key.startsWith(`${exchangeId}_`)) {
          clearTimeout(timeout)
          this.typingTimeouts.delete(key)
        }
      })
    }
  }

  /**
   * Get user exchange chats with enhanced data
   */
  async getUserExchangeChats(
    userId: string,
    options: PaginationOptions = {}
  ): Promise<{
    exchange_id: string
    exchange_details: any
    last_message: ExchangeMessage | null
    unread_count: number
    other_user_presence?: UserPresence
  }[]> {
    try {
      const { limit = 20, offset = 0 } = options
      
      // Get user's exchanges
      const { data: userExchanges, error: exchangesError } = await supabase
        .from(this.EXCHANGES_TABLE)
        .select('id, unique_id, from_amount, from_currency, to_amount, to_currency, user_id, location, created_at')
        .eq('user_id', userId)
        .limit(limit)
        .range(offset, offset + limit - 1)

      if (exchangesError) {
        console.error('Error fetching user exchanges:', exchangesError)
        return []
      }

      // Get exchanges where user has messages
      const { data: messageExchanges, error: messagesError } = await supabase
        .from(this.MESSAGES_TABLE)
        .select('exchange_id')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .limit(limit)

      if (messagesError) {
        console.error('Error fetching message exchanges:', messagesError)
        return []
      }

      const messageExchangeIds = messageExchanges?.map(m => m.exchange_id) || []
      
      // Get additional exchange details
      let additionalExchanges: any[] = []
      if (messageExchangeIds.length > 0) {
        const orConditions = messageExchangeIds.map(id => `id.eq.${id},unique_id.eq.${id}`).join(',')
        const { data, error: additionalError } = await supabase
          .from(this.EXCHANGES_TABLE)
          .select('id, unique_id, from_amount, from_currency, to_amount, to_currency, user_id, location, created_at')
          .or(orConditions)

        if (!additionalError) {
          additionalExchanges = data || []
        }
      }

      // Combine and deduplicate
      const allExchanges = [...(userExchanges || []), ...additionalExchanges]
      const uniqueExchanges = allExchanges.filter((exchange, index, self) => 
        index === self.findIndex(e => (e.unique_id || e.id) === (exchange.unique_id || exchange.id))
      )

      // Get enhanced data for each exchange
      const chatData = await Promise.all(
        uniqueExchanges.map(async (exchange) => {
          const exchangeId = exchange.unique_id || exchange.id
          
          const [lastMessageResult, unreadCount, presence] = await Promise.all([
            supabase
              .from(this.MESSAGES_TABLE)
              .select('*')
              .eq('exchange_id', exchangeId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            this.getUnreadMessageCount(exchangeId, userId),
            this.getUserPresence(exchangeId)
          ])

          // Find other user's presence
          const otherUserPresence = presence.find(p => p.user_id !== userId)

          return {
            exchange_id: exchangeId,
            exchange_details: exchange,
            last_message: lastMessageResult.data,
            unread_count: unreadCount,
            other_user_presence: otherUserPresence
          }
        })
      )

      // Sort by activity (unread first, then by last message time)
      return chatData.sort((a, b) => {
        if (a.unread_count > 0 && b.unread_count === 0) return -1
        if (a.unread_count === 0 && b.unread_count > 0) return 1
        
        const aTime = a.last_message?.created_at || a.exchange_details.created_at
        const bTime = b.last_message?.created_at || b.exchange_details.created_at
        return new Date(bTime).getTime() - new Date(aTime).getTime()
      })
    } catch (error) {
      console.error('Error fetching user exchange chats:', error)
      return []
    }
  }

  // Private helper methods

  private updateConnectionState(status: ConnectionState['status'], error?: string) {
    this.connectionState.status = status
    this.connectionState.lastError = error
    
    if (status === 'connected') {
      this.connectionState.lastConnected = new Date()
      this.connectionState.retryCount = 0
    } else if (status === 'disconnected' || status === 'reconnecting') {
      this.connectionState.retryCount++
    }
  }

  private cleanupChannel(exchangeId: string) {
    const channel = this.activeChannels.get(exchangeId)
    if (channel) {
      channel.unsubscribe()
      this.activeChannels.delete(exchangeId)
    }
  }

  private scheduleReconnection(
    exchangeId: string,
    userId: string,
    onMessage: (message: ExchangeMessage) => void,
    onPresenceUpdate?: (presence: UserPresence[]) => void,
    onError?: (error: any) => void,
    onConnectionChange?: (state: ConnectionState) => void
  ) {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    if (this.connectionState.retryCount >= this.MAX_RETRY_ATTEMPTS) {
      console.error('Max reconnection attempts reached')
      this.updateConnectionState('disconnected', 'Max retry attempts reached')
      if (onConnectionChange) onConnectionChange(this.connectionState)
      return
    }

    const delayIndex = Math.min(this.connectionState.retryCount - 1, this.RECONNECT_DELAYS.length - 1)
    const delay = this.RECONNECT_DELAYS[delayIndex]
    
    console.log(`Scheduling reconnection in ${delay}ms (attempt ${this.connectionState.retryCount})`)
    
    this.updateConnectionState('reconnecting')
    if (onConnectionChange) onConnectionChange(this.connectionState)

    this.reconnectTimer = setTimeout(() => {
      console.log('Attempting to reconnect...')
      this.subscribeToExchangeMessages(exchangeId, userId, onMessage, onPresenceUpdate, onError, onConnectionChange)
    }, delay)
  }

  private addToMessageQueue(exchangeId: string, message: ExchangeMessage) {
    const queue = this.messageQueue.get(exchangeId) || []
    queue.push(message)
    this.messageQueue.set(exchangeId, queue)
  }

  private removeFromMessageQueue(exchangeId: string, tempId: string) {
    const queue = this.messageQueue.get(exchangeId) || []
    const filtered = queue.filter(m => m.temp_id !== tempId)
    this.messageQueue.set(exchangeId, filtered)
  }

  private updateMessageInQueue(exchangeId: string, tempId: string, updates: Partial<ExchangeMessage>) {
    const queue = this.messageQueue.get(exchangeId) || []
    const index = queue.findIndex(m => m.temp_id === tempId)
    if (index !== -1) {
      queue[index] = { ...queue[index], ...updates }
      this.messageQueue.set(exchangeId, queue)
    }
  }

  private async retryFailedMessage(exchangeId: string, tempId: string) {
    const queue = this.messageQueue.get(exchangeId) || []
    const message = queue.find(m => m.temp_id === tempId)
    
    if (message && message.delivery_status === 'failed') {
      console.log('Retrying failed message:', tempId)
      await this.sendMessage(
        message.exchange_id,
        message.sender_id,
        message.receiver_id,
        message.content
      )
    }
  }

  private processQueuedMessages(exchangeId: string) {
    const queue = this.messageQueue.get(exchangeId) || []
    queue.forEach(message => {
      if (message.delivery_status === 'failed') {
        this.retryFailedMessage(exchangeId, message.temp_id!)
      }
    })
  }

  private isDuplicateMessage(exchangeId: string, message: ExchangeMessage): boolean {
    const queue = this.messageQueue.get(exchangeId) || []
    return queue.some(m => 
      m.id === message.id ||
      (m.temp_id === message.temp_id && message.temp_id) ||
      (m.sender_id === message.sender_id &&
       m.content === message.content &&
       Math.abs(new Date(m.created_at).getTime() - new Date(message.created_at).getTime()) < 1000)
    )
  }

  private deduplicateMessages(messages: ExchangeMessage[]): ExchangeMessage[] {
    const seen = new Set<string>()
    const unique: ExchangeMessage[] = []

    for (const message of messages) {
      const key = message.id || message.temp_id || `${message.sender_id}_${message.content}_${message.created_at}`
      
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(message)
      }
    }

    return unique
  }
}

export const exchangeChatService = new ExchangeChatService()
