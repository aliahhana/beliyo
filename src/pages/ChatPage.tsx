import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ShoppingCart, DollarSign, Target, Plus, Send, MoreHorizontal } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface ChatMessage {
  id: string
  sender: 'user' | 'seller'
  message: string
  timestamp: Date
  type: 'text' | 'system' | 'action'
  channel_id?: string
  user_id?: string
  content?: string
  created_at?: string
}

interface ActionButton {
  id: string
  icon: React.ReactNode
  label: string
  action: string
}

const ChatPage: React.FC = () => {
  const { productId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [channelId, setChannelId] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [showActionButtons, setShowActionButtons] = useState(true)
  
  // Refs for cleanup and scroll management
  const subscriptionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const actionButtons: ActionButton[] = [
    {
      id: 'shop',
      icon: <ShoppingCart className="w-5 h-5" />,
      label: 'Shop for Items',
      action: 'shop'
    },
    {
      id: 'exchange',
      icon: <DollarSign className="w-5 h-5" />,
      label: 'Exchange Money',
      action: 'exchange'
    },
    {
      id: 'mission',
      icon: <Target className="w-5 h-5" />,
      label: 'Do Mission',
      action: 'mission'
    }
  ]

  // Initialize chat and set up real-time subscription
  useEffect(() => {
    if (user) {
      initializeChat()
    }

    // Cleanup function
    return () => {
      cleanupSubscription()
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [productId, user])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const cleanupSubscription = () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
      subscriptionRef.current = null
    }
  }

  const initializeChat = async () => {
    try {
      setConnectionStatus('connecting')
      setError(null)
      setRetryCount(0)

      // Wait a bit for tables to be ready
      await new Promise(resolve => setTimeout(resolve, 1000))

      if (productId) {
        await initializeChatForProduct(productId)
      } else {
        await initializeGeneralChat()
      }
    } catch (error: any) {
      console.error('Error initializing chat:', error)
      handleInitializationError(error)
    }
  }

  const handleInitializationError = (error: any) => {
    console.error('Chat initialization error:', error)
    
    if (error?.code === 'PGRST116' || error?.message?.includes('403') || error?.code === '42P01') {
      setError('Setting up chat system. Please wait...')
      const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000)
      setRetryCount(prev => prev + 1)
      
      if (retryCount < 5) {
        scheduleReconnect(retryDelay)
      } else {
        setError('Chat system is being configured. Please refresh the page.')
      }
    } else {
      setError('Connection issue. Retrying...')
      scheduleReconnect(3000)
    }
    
    setConnectionStatus('disconnected')
  }

  const initializeChatForProduct = async (id: string) => {
    try {
      const channelName = `product_${id}`
      let channel = await getOrCreateChannel(channelName, false)
      
      if (!channel) {
        throw new Error('Failed to create or get channel')
      }

      setChannelId(channel.id)
      
      await loadMessages(channel.id)
      await setupRealtimeSubscription(channel.id)

      setConnectionStatus('connected')
      setError(null)
    } catch (error) {
      console.error('Error initializing product chat:', error)
      throw error
    }
  }

  const initializeGeneralChat = async () => {
    try {
      let channel = await getOrCreateChannel('general', false)
      
      if (!channel) {
        throw new Error('Failed to create or get general channel')
      }

      setChannelId(channel.id)
      
      await loadMessages(channel.id)
      await setupRealtimeSubscription(channel.id)

      setConnectionStatus('connected')
      setError(null)
    } catch (error) {
      console.error('Error initializing general chat:', error)
      throw error
    }
  }

  const getOrCreateChannel = async (name: string, isGroup: boolean = false) => {
    try {
      const { data: existingChannel, error: fetchError } = await supabase
        .from('channels')
        .select('*')
        .eq('name', name)
        .maybeSingle()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching channel:', fetchError)
        return null
      }

      if (existingChannel) {
        await ensureChannelMembership(existingChannel.id)
        return existingChannel
      }

      const { data: newChannel, error: createError } = await supabase
        .from('channels')
        .insert([
          {
            name,
            is_group: isGroup,
            created_by: user?.id
          }
        ])
        .select()
        .single()

      if (createError) {
        if (createError.code === '23505') {
          const { data: retryChannel } = await supabase
            .from('channels')
            .select('*')
            .eq('name', name)
            .maybeSingle()
          
          if (retryChannel) {
            await ensureChannelMembership(retryChannel.id)
            return retryChannel
          }
        }
        console.error('Error creating channel:', createError)
        return null
      }

      if (newChannel) {
        await ensureChannelMembership(newChannel.id)
      }

      return newChannel
    } catch (error) {
      console.error('Error in getOrCreateChannel:', error)
      return null
    }
  }

  const ensureChannelMembership = async (channelId: string) => {
    if (!user) return

    try {
      const { data: existingMembership } = await supabase
        .from('channel_memberships')
        .select('id')
        .eq('channel_id', channelId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!existingMembership) {
        const { error } = await supabase
          .from('channel_memberships')
          .insert([
            {
              channel_id: channelId,
              user_id: user.id
            }
          ])

        if (error && error.code !== '23505') {
          console.error('Error adding channel membership:', error)
        }
      }
    } catch (error) {
      console.error('Error ensuring channel membership:', error)
    }
  }

  const loadMessages = async (channelId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true })

      if (error) {
        if (error.code === 'PGRST116' || error.code === '42P01') {
          console.log('Messages table not ready yet')
          return
        }
        console.error('Error loading messages:', error)
        return
      }

      if (data) {
        const formattedMessages: ChatMessage[] = data.map(msg => ({
          id: msg.id,
          sender: msg.user_id === user?.id ? 'user' : 'seller',
          message: msg.content,
          timestamp: new Date(msg.created_at),
          type: msg.status === 'system' ? 'system' : 'text',
          channel_id: msg.channel_id,
          user_id: msg.user_id
        }))

        setMessages(formattedMessages)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const setupRealtimeSubscription = async (channelId: string) => {
    try {
      cleanupSubscription()

      const subscription = supabase
        .channel(`messages_${channelId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `channel_id=eq.${channelId}`
          },
          (payload) => {
            handleRealtimeMessage(payload.new)
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status)
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected')
            setError(null)
            setRetryCount(0)
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnectionStatus('disconnected')
            setError('Connection lost. Reconnecting...')
            scheduleReconnect(3000)
          }
        })

      subscriptionRef.current = subscription
    } catch (error) {
      console.error('Error setting up real-time subscription:', error)
      setConnectionStatus('disconnected')
      setError('Failed to establish real-time connection')
      scheduleReconnect(3000)
    }
  }

  const handleRealtimeMessage = (messageData: any) => {
    try {
      const newMessage: ChatMessage = {
        id: messageData.id,
        sender: messageData.user_id === user?.id ? 'user' : 'seller',
        message: messageData.content,
        timestamp: new Date(messageData.created_at),
        type: messageData.status === 'system' ? 'system' : 'text',
        channel_id: messageData.channel_id,
        user_id: messageData.user_id
      }

      setMessages(prevMessages => {
        const messageExists = prevMessages.some(msg => msg.id === newMessage.id)
        if (messageExists) {
          return prevMessages
        }
        return [...prevMessages, newMessage]
      })
    } catch (error) {
      console.error('Error handling real-time message:', error)
    }
  }

  const scheduleReconnect = (delay: number = 3000) => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log('Attempting to reconnect...')
      initializeChat()
    }, delay)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !channelId || !user) return

    try {
      const messageContent = newMessage.trim()
      setNewMessage('')

      const { error } = await supabase
        .from('messages')
        .insert([
          {
            channel_id: channelId,
            user_id: user.id,
            content: messageContent,
            status: 'sent'
          }
        ])

      if (error) {
        console.error('Error sending message:', error)
        if (error.code === 'PGRST116' || error.code === '42P01') {
          setError('Message table not ready. Please try again later.')
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleActionClick = (action: string) => {
    setShowActionButtons(false)
    
    // Add system message about the action
    const actionMessage: ChatMessage = {
      id: `action-${Date.now()}`,
      sender: 'user',
      message: `Clicked '${action === 'shop' ? 'Shop for Items' : action === 'exchange' ? 'Exchange Money' : 'Do Mission'}'`,
      timestamp: new Date(),
      type: 'action'
    }
    
    setMessages(prev => [...prev, actionMessage])

    // Simulate seller response
    setTimeout(() => {
      const responseMessage: ChatMessage = {
        id: `response-${Date.now()}`,
        sender: 'seller',
        message: action === 'mission' 
          ? "Mission accepted! Hey, gentel_man. I'm here to help you complete your request – can you share the details?"
          : `Great! Let me help you with ${action === 'shop' ? 'shopping' : 'money exchange'}.`,
        timestamp: new Date(),
        type: 'text'
      }
      setMessages(prev => [...prev, responseMessage])
    }, 1000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-[#B94A5C] to-[#E08A8A]">
      {/* Chat Header */}
      <div className="bg-[#A94354] px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
            <div className="w-10 h-10 bg-[#FFD700] rounded-full flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
          </div>
          <span className="text-white text-lg font-medium">gentel_man</span>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* Action Buttons */}
        {showActionButtons && (
          <div className="space-y-3 mb-6">
            {actionButtons.map((button) => (
              <button
                key={button.id}
                onClick={() => handleActionClick(button.action)}
                className="w-full bg-white rounded-lg px-4 py-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="text-[#FFA500]">{button.icon}</div>
                <span className="text-[#FFA500] font-medium">{button.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="space-y-3">
          {messages.map((message) => (
            <div key={message.id}>
              {message.type === 'action' && (
                <div className="text-center text-white/80 text-sm italic my-2">
                  {message.message}
                </div>
              )}
              {message.type === 'text' && (
                <div className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                      message.sender === 'user'
                        ? 'bg-white/20 text-white'
                        : 'bg-white text-gray-800 shadow-sm'
                    }`}
                  >
                    {message.sender === 'seller' && (
                      <div className="font-semibold text-sm mb-1">gentel_man</div>
                    )}
                    <p className="text-sm leading-relaxed">{message.message}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {/* Typing indicator */}
          {connectionStatus === 'connected' && messages.length > 0 && (
            <div className="flex justify-center">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-[#A94354] px-4 py-3 flex items-center gap-3">
        <button className="text-white p-2 hover:bg-white/10 rounded-full transition-colors">
          <Plus className="w-6 h-6" />
        </button>
        
        <div className="flex-1 relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type something..."
            className="w-full bg-white rounded-full px-4 py-2.5 pr-12 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>
        
        <button 
          onClick={sendMessage}
          className="text-white p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <Send className="w-6 h-6" />
        </button>
      </div>

      {/* Connection Status */}
      {error && (
        <div className="absolute top-16 left-0 right-0 bg-red-500 text-white px-4 py-2 text-center text-sm">
          {error}
        </div>
      )}
    </div>
  )
}

export default ChatPage
