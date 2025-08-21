import { supabase } from '../lib/supabase'
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export interface UnifiedMessage {
  id: string
  conversation_id: string
  user_id: string
  content: string
  created_at: string
  read_at: string | null
  message_type: 'text' | 'system' | 'action'
  context_type: 'shop' | 'exchange' | 'mission' | 'general'
  context_id?: string
  sender_name?: string
  delivery_status?: 'sending' | 'sent' | 'delivered' | 'failed'
  temp_id?: string
}

export interface ChatContext {
  type: 'shop' | 'exchange' | 'mission' | 'general'
  id?: string
  title?: string
  metadata?: any
  otherUserId?: string // Required for 1:1 conversations
}

export interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
  lastConnected?: Date
  retryCount: number
  lastError?: string
}

export interface UserPresence {
  user_id: string
  conversation_id: string
  is_online: boolean
  last_seen: string
  is_typing: boolean
  context_type: string
  context_id?: string
}

class UnifiedChatService {
  private readonly MESSAGES_TABLE = 'unified_messages'
  private readonly CONVERSATIONS_TABLE = 'unified_conversations'
  private readonly PRESENCE_TABLE = 'unified_user_presence'
  
  private activeConversations: Map<string, RealtimeChannel> = new Map()
  private connectionState: ConnectionState = {
    status: 'disconnected',
    retryCount: 0
  }
  private messageQueue: Map<string, UnifiedMessage[]> = new Map()
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map()
  private presenceHeartbeat: NodeJS.Timeout | null = null
  private readonly TYPING_TIMEOUT = 3000
  private readonly MAX_RETRY_ATTEMPTS = 5
  private readonly RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000]

  public supabase = supabase

  /**
   * Get or create a 1:1 conversation between two users for any context
   */
  async getOrCreateConversation(context: ChatContext, userId: string, otherUserId: string): Promise<string | null> {
    try {
      if (!otherUserId) {
        console.error('otherUserId is required for 1:1 conversations')
        return null
      }

      const conversationName = this.generateConversationName(userId, otherUserId, context)
      
      // Check if conversation exists
      const { data: existingConversation, error: fetchError } = await supabase
        .from(this.CONVERSATIONS_TABLE)
        .select('*')
        .eq('name', conversationName)
        .maybeSingle()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching conversation:', fetchError)
        return null
      }

      if (existingConversation) {
        return existingConversation.id
      }

      // Create new 1:1 conversation
      const { data: newConversation, error: createError } = await supabase
        .from(this.CONVERSATIONS_TABLE)
        .insert([{
          name: conversationName,
          user1_id: userId < otherUserId ? userId : otherUserId, // Consistent ordering
          user2_id: userId < otherUserId ? otherUserId : userId,
          context_type: context.type,
          context_id: context.id,
          title: context.title || this.getDefaultTitle(context),
          metadata: context.metadata || {},
          created_by: userId
        }])
        .select()
        .single()

      if (createError) {
        console.error('Error creating conversation:', createError)
        return null
      }

      return newConversation?.id || null
    } catch (error) {
      console.error('Error in getOrCreateConversation:', error)
      return null
    }
  }

  /**
   * Send a message to the 1:1 conversation
   */
  async sendMessage(
    conversationId: string,
    userId: string,
    content: string,
    context: ChatContext,
    messageType: 'text' | 'system' | 'action' = 'text'
  ): Promise<{ success: boolean; data?: UnifiedMessage; error?: string }> {
    try {
      if (!content.trim()) {
        throw new Error('Message content cannot be empty')
      }

      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const timestamp = new Date().toISOString()

      // Create optimistic message
      const optimisticMessage: UnifiedMessage = {
        id: tempId,
        conversation_id: conversationId,
        user_id: userId,
        content: content.trim(),
        created_at: timestamp,
        read_at: null,
        message_type: messageType,
        context_type: context.type,
        context_id: context.id,
        delivery_status: 'sending',
        temp_id: tempId
      }

      // Add to queue for retry mechanism
      this.addToMessageQueue(conversationId, optimisticMessage)

      try {
        // Send to database
        const { data, error } = await supabase
          .from(this.MESSAGES_TABLE)
          .insert([{
            conversation_id: conversationId,
            user_id: userId,
            content: content.trim(),
            message_type: messageType,
            context_type: context.type,
            context_id: context.id,
            temp_id: tempId
          }])
          .select()
          .single()

        if (error) {
          console.error('Error sending message:', error)
          this.updateMessageInQueue(conversationId, tempId, { delivery_status: 'failed' })
          
          return {
            success: true, // Still return success for optimistic UI
            data: optimisticMessage,
            error: 'Message queued for retry'
          }
        }

        // Remove from queue on success
        this.removeFromMessageQueue(conversationId, tempId)

        const successMessage = {
          ...data,
          delivery_status: 'sent' as const,
          temp_id: tempId
        }

        return {
          success: true,
          data: successMessage
        }
      } catch (dbError) {
        console.error('Database error sending message:', dbError)
        this.updateMessageInQueue(conversationId, tempId, { delivery_status: 'failed' })
        
        return {
          success: true, // Still return success for optimistic UI
          data: optimisticMessage,
          error: 'Message failed to send, will retry automatically'
        }
      }
    } catch (error) {
      console.error('Error sending unified message:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message'
      }
    }
  }

  /**
   * Get messages for a conversation with pagination
   */
  async getMessages(
    conversationId: string,
    options: { limit?: number; offset?: number; before?: string } = {}
  ): Promise<UnifiedMessage[]> {
    try {
      const { limit = 50, offset = 0, before } = options
      
      let query = supabase
        .from(this.MESSAGES_TABLE)
        .select('*')
        .eq('conversation_id', conversationId)
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
        console.error('Error fetching messages:', error)
        return []
      }

      // Merge with queued messages
      const queuedMessages = this.messageQueue.get(conversationId) || []
      const allMessages = [...(data || []), ...queuedMessages]

      // Remove duplicates and sort
      const uniqueMessages = this.deduplicateMessages(allMessages)
      return uniqueMessages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    } catch (error) {
      console.error('Error fetching messages:', error)
      return []
    }
  }

  /**
   * Subscribe to real-time messages for a conversation
   */
  subscribeToConversation(
    conversationId: string,
    userId: string,
    onMessage: (message: UnifiedMessage) => void,
    onPresenceUpdate?: (presence: UserPresence[]) => void,
    onError?: (error: any) => void,
    onConnectionChange?: (state: ConnectionState) => void
  ): () => void {
    console.log('Setting up unified chat subscription for conversation:', conversationId)
    
    // Clean up existing connections
    this.cleanupConversation(conversationId)
    
    // Update connection state
    this.updateConnectionState('connecting')
    if (onConnectionChange) onConnectionChange(this.connectionState)
    
    // Start presence tracking
    this.startPresenceHeartbeat(conversationId, userId)
    
    const channel = supabase
      .channel(`unified_chat_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: this.MESSAGES_TABLE,
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload: RealtimePostgresChangesPayload<UnifiedMessage>) => {
          console.log('New unified message received:', payload)
          const message = payload.new as UnifiedMessage
          
          // Prevent duplicate processing
          if (!this.isDuplicateMessage(conversationId, message)) {
            onMessage({ ...message, delivery_status: 'delivered' })
            
            // Remove from queue if it was a temp message
            if (message.temp_id) {
              this.removeFromMessageQueue(conversationId, message.temp_id)
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
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload: RealtimePostgresChangesPayload<UnifiedMessage>) => {
          console.log('Unified message updated:', payload)
          onMessage(payload.new as UnifiedMessage)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: this.PRESENCE_TABLE,
          filter: `conversation_id=eq.${conversationId}`
        },
        async () => {
          if (onPresenceUpdate) {
            const presence = await this.getUserPresence(conversationId)
            onPresenceUpdate(presence)
          }
        }
      )
      .subscribe((status) => {
        console.log('Unified chat subscription status:', status)
        
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to unified conversation: ${conversationId}`)
          this.updateConnectionState('connected')
          
          if (onConnectionChange) onConnectionChange(this.connectionState)
          
          // Process any queued messages
          this.processQueuedMessages(conversationId)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Unified chat subscription error or timeout')
          this.handleConnectionError(new Error('Subscription failed'))
          
          if (onError) onError(new Error('Connection failed'))
          if (onConnectionChange) onConnectionChange(this.connectionState)
          
          // Attempt reconnection
          this.scheduleReconnection(conversationId, userId, onMessage, onPresenceUpdate, onError, onConnectionChange)
        } else if (status === 'CLOSED') {
          console.log('Unified chat subscription closed')
          this.updateConnectionState('disconnected')
          this.stopPresenceHeartbeat(conversationId, userId)
          
          if (onConnectionChange) onConnectionChange(this.connectionState)
        }
      })

    // Store conversation reference
    this.activeConversations.set(conversationId, channel)

    // Return cleanup function
    return () => {
      console.log(`Cleaning up unified chat subscription for conversation: ${conversationId}`)
      this.cleanupConversation(conversationId)
      this.stopPresenceHeartbeat(conversationId, userId)
      
      // Clear typing timeouts
      this.typingTimeouts.forEach((timeout, key) => {
        if (key.startsWith(`${conversationId}_`)) {
          clearTimeout(timeout)
          this.typingTimeouts.delete(key)
        }
      })
    }
  }

  /**
   * Set typing status for a user in a conversation
   */
  async setTypingStatus(conversationId: string, userId: string, isTyping: boolean, context: ChatContext): Promise<void> {
    try {
      const timeoutKey = `${conversationId}_${userId}`
      const existingTimeout = this.typingTimeouts.get(timeoutKey)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
      }

      // Update presence with typing status
      await this.updateUserPresence(conversationId, userId, true, isTyping, context)

      if (isTyping) {
        // Auto-clear typing status after timeout
        const timeout = setTimeout(() => {
          this.updateUserPresence(conversationId, userId, true, false, context)
          this.typingTimeouts.delete(timeoutKey)
        }, this.TYPING_TIMEOUT)

        this.typingTimeouts.set(timeoutKey, timeout)
      }
    } catch (error) {
      console.error('Error setting typing status:', error)
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from(this.MESSAGES_TABLE)
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .neq('user_id', userId)
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
  async getUnreadMessageCount(conversationId: string, userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from(this.MESSAGES_TABLE)
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .neq('user_id', userId)
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
   * Get user's active 1:1 conversations across all contexts
   */
  async getUserConversations(userId: string): Promise<{
    conversation_id: string
    context_type: string
    context_id?: string
    title: string
    other_user_id: string
    last_message?: UnifiedMessage
    unread_count: number
    other_user_presence?: UserPresence
  }[]> {
    try {
      // Get user's conversations (where they are either user1 or user2)
      const { data: conversations, error: conversationsError } = await supabase
        .from(this.CONVERSATIONS_TABLE)
        .select('*')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)

      if (conversationsError) {
        console.error('Error fetching user conversations:', conversationsError)
        return []
      }

      // Get enhanced data for each conversation
      const conversationData = await Promise.all(
        (conversations || []).map(async (conversation: any) => {
          const conversationId = conversation.id
          const otherUserId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id
          
          const [lastMessageResult, unreadCount, presence] = await Promise.all([
            supabase
              .from(this.MESSAGES_TABLE)
              .select('*')
              .eq('conversation_id', conversationId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            this.getUnreadMessageCount(conversationId, userId),
            this.getUserPresence(conversationId)
          ])

          // Find other user's presence
          const otherUserPresence = presence.find(p => p.user_id === otherUserId)

          return {
            conversation_id: conversationId,
            context_type: conversation.context_type,
            context_id: conversation.context_id,
            title: conversation.title,
            other_user_id: otherUserId,
            last_message: lastMessageResult.data,
            unread_count: unreadCount,
            other_user_presence: otherUserPresence
          }
        })
      )

      // Sort by activity (unread first, then by last message time)
      return conversationData.sort((a, b) => {
        if (a.unread_count > 0 && b.unread_count === 0) return -1
        if (a.unread_count === 0 && b.unread_count > 0) return 1
        
        const aTime = a.last_message?.created_at || '1970-01-01'
        const bTime = b.last_message?.created_at || '1970-01-01'
        return new Date(bTime).getTime() - new Date(aTime).getTime()
      })
    } catch (error) {
      console.error('Error fetching user conversations:', error)
      return []
    }
  }

  // Private helper methods

  private generateConversationName(userId1: string, userId2: string, context: ChatContext): string {
    // Create consistent naming regardless of user order
    const sortedUsers = [userId1, userId2].sort()
    const contextSuffix = context.id ? `_${context.id}` : ''
    return `${context.type}_${sortedUsers[0]}_${sortedUsers[1]}${contextSuffix}`
  }

  private getDefaultTitle(context: ChatContext): string {
    switch (context.type) {
      case 'shop': return context.id ? `Product Chat` : 'Shop Chat'
      case 'exchange': return context.id ? `Exchange Chat` : 'Money Exchange Chat'
      case 'mission': return context.id ? `Mission Chat` : 'Mission Board Chat'
      default: return 'Direct Message'
    }
  }

  private async updateUserPresence(
    conversationId: string, 
    userId: string, 
    isOnline: boolean, 
    isTyping: boolean = false,
    context: ChatContext
  ) {
    try {
      const presenceData = {
        user_id: userId,
        conversation_id: conversationId,
        is_online: isOnline,
        last_seen: new Date().toISOString(),
        is_typing: isTyping,
        context_type: context.type,
        context_id: context.id,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from(this.PRESENCE_TABLE)
        .upsert(presenceData, {
          onConflict: 'user_id,conversation_id'
        })

      if (error) {
        console.error('Error updating user presence:', error)
      }
    } catch (error) {
      console.error('Error updating user presence:', error)
    }
  }

  private async getUserPresence(conversationId: string): Promise<UserPresence[]> {
    try {
      const { data, error } = await supabase
        .from(this.PRESENCE_TABLE)
        .select('*')
        .eq('conversation_id', conversationId)
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

  private startPresenceHeartbeat(conversationId: string, userId: string) {
    if (this.presenceHeartbeat) {
      clearInterval(this.presenceHeartbeat)
    }

    // Set up periodic presence updates
    this.presenceHeartbeat = setInterval(() => {
      // We need context for presence updates, but for heartbeat we'll use general
      this.updateUserPresence(conversationId, userId, true, false, { type: 'general' })
    }, 30000) // Update every 30 seconds
  }

  private stopPresenceHeartbeat(conversationId: string, userId: string) {
    if (this.presenceHeartbeat) {
      clearInterval(this.presenceHeartbeat)
      this.presenceHeartbeat = null
    }

    // Mark user as offline
    this.updateUserPresence(conversationId, userId, false, false, { type: 'general' })
  }

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

  private handleConnectionError(error: any) {
    console.error('Unified chat connection error:', error)
    this.updateConnectionState('disconnected', error.message)
  }

  private cleanupConversation(conversationId: string) {
    const channel = this.activeConversations.get(conversationId)
    if (channel) {
      channel.unsubscribe()
      this.activeConversations.delete(conversationId)
    }
  }

  private scheduleReconnection(
    conversationId: string,
    userId: string,
    onMessage: (message: UnifiedMessage) => void,
    onPresenceUpdate?: (presence: UserPresence[]) => void,
    onError?: (error: any) => void,
    onConnectionChange?: (state: ConnectionState) => void
  ) {
    if (this.connectionState.retryCount >= this.MAX_RETRY_ATTEMPTS) {
      console.error('Max reconnection attempts reached for unified chat')
      this.updateConnectionState('disconnected', 'Max retry attempts reached')
      if (onConnectionChange) onConnectionChange(this.connectionState)
      return
    }

    const delayIndex = Math.min(this.connectionState.retryCount - 1, this.RECONNECT_DELAYS.length - 1)
    const delay = this.RECONNECT_DELAYS[delayIndex]
    
    console.log(`Scheduling unified chat reconnection in ${delay}ms (attempt ${this.connectionState.retryCount})`)
    
    this.updateConnectionState('reconnecting')
    if (onConnectionChange) onConnectionChange(this.connectionState)

    setTimeout(() => {
      console.log('Attempting to reconnect unified chat...')
      this.subscribeToConversation(conversationId, userId, onMessage, onPresenceUpdate, onError, onConnectionChange)
    }, delay)
  }

  private addToMessageQueue(conversationId: string, message: UnifiedMessage) {
    const queue = this.messageQueue.get(conversationId) || []
    queue.push(message)
    this.messageQueue.set(conversationId, queue)
  }

  private removeFromMessageQueue(conversationId: string, tempId: string) {
    const queue = this.messageQueue.get(conversationId) || []
    const filtered = queue.filter(m => m.temp_id !== tempId)
    this.messageQueue.set(conversationId, filtered)
  }

  private updateMessageInQueue(conversationId: string, tempId: string, updates: Partial<UnifiedMessage>) {
    const queue = this.messageQueue.get(conversationId) || []
    const index = queue.findIndex(m => m.temp_id === tempId)
    if (index !== -1) {
      queue[index] = { ...queue[index], ...updates }
      this.messageQueue.set(conversationId, queue)
    }
  }

  private processQueuedMessages(conversationId: string) {
    const queue = this.messageQueue.get(conversationId) || []
    queue.forEach(message => {
      if (message.delivery_status === 'failed') {
        // Retry failed messages
        this.sendMessage(
          message.conversation_id,
          message.user_id,
          message.content,
          { type: message.context_type, id: message.context_id },
          message.message_type
        )
      }
    })
  }

  private isDuplicateMessage(conversationId: string, message: UnifiedMessage): boolean {
    const queue = this.messageQueue.get(conversationId) || []
    return queue.some(m => 
      m.id === message.id ||
      (m.temp_id === message.temp_id && message.temp_id) ||
      (m.user_id === message.user_id &&
       m.content === message.content &&
       Math.abs(new Date(m.created_at).getTime() - new Date(message.created_at).getTime()) < 1000)
    )
  }

  private deduplicateMessages(messages: UnifiedMessage[]): UnifiedMessage[] {
    const seen = new Set<string>()
    const unique: UnifiedMessage[] = []

    for (const message of messages) {
      const key = message.id || message.temp_id || `${message.user_id}_${message.content}_${message.created_at}`
      
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(message)
      }
    }

    return unique
  }
}

export const unifiedChatService = new UnifiedChatService()
