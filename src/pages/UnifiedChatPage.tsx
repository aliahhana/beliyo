import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Send, Paperclip, Image, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Header'
import { toast } from '../components/Toast'

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  is_read: boolean
}

interface Conversation {
  id: string
  participant1_id: string
  participant2_id: string
  context_type: 'shop' | 'exchange' | 'mission' | 'general'
  context_id?: string
  last_message?: string
  last_message_at?: string
  created_at: string
  updated_at: string
}

const UnifiedChatPage: React.FC = () => {
  const { id, otherUserId, buyerId } = useParams<{ id?: string; otherUserId?: string; buyerId?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [otherUserName, setOtherUserName] = useState<string>('User')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [contextInfo, setContextInfo] = useState<any>(null)

  // Determine context type from URL path
  const getContextType = (): 'shop' | 'exchange' | 'mission' | 'general' => {
    const path = location.pathname
    if (path.includes('/chat/shop/') || path.includes('/seller-chat/shop/')) return 'shop'
    if (path.includes('/chat/exchange/') || path.includes('/seller-chat/exchange/')) return 'exchange'
    if (path.includes('/chat/mission/') || path.includes('/seller-chat/mission/')) return 'mission'
    return 'general'
  }

  // Determine if this is a seller accessing buyer's chat
  const isSellerView = location.pathname.includes('/seller-chat/')
  
  // Get the actual other user ID (buyer for seller, seller for buyer)
  const actualOtherUserId = isSellerView ? buyerId : otherUserId

  const contextType = getContextType()

  useEffect(() => {
    if (!user || !actualOtherUserId) {
      console.error('Missing user or otherUserId', { user, actualOtherUserId })
      navigate('/chat-list')
      return
    }

    loadOrCreateConversation()
    loadContextInfo()
  }, [user, actualOtherUserId, id, contextType])

  const loadContextInfo = async () => {
    if (!id || contextType === 'general') return

    try {
      let tableName = ''
      switch (contextType) {
        case 'shop':
          tableName = 'products'
          break
        case 'exchange':
          tableName = 'money_exchanges'
          break
        case 'mission':
          tableName = 'missions'
          break
      }

      if (tableName) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', id)
          .single()

        if (!error && data) {
          setContextInfo(data)
        }
      }
    } catch (error) {
      console.error('Error loading context info:', error)
    }
  }

  const loadOrCreateConversation = async () => {
    if (!user || !actualOtherUserId) return

    try {
      setLoading(true)

      // Build query to find existing conversation
      let query = supabase
        .from('conversations')
        .select('*')
        .eq('context_type', contextType)

      // Add context_id condition
      if (id) {
        query = query.eq('context_id', id)
      } else {
        query = query.is('context_id', null)
      }

      // Get all conversations matching context
      const { data: conversations, error: findError } = await query

      // Find conversation with matching participants
      let existingConv = null
      if (conversations && conversations.length > 0) {
        existingConv = conversations.find(conv => 
          (conv.participant1_id === user.id && conv.participant2_id === actualOtherUserId) ||
          (conv.participant1_id === actualOtherUserId && conv.participant2_id === user.id)
        )
      }

      if (existingConv) {
        setConversation(existingConv)
        await loadMessages(existingConv.id)
      } else {
        // Create new conversation
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            participant1_id: user.id,
            participant2_id: actualOtherUserId,
            context_type: contextType,
            context_id: id || null
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating conversation:', createError)
          throw createError
        }

        setConversation(newConv)
        setMessages([])
      }

      // Set other user's name based on view type
      if (isSellerView) {
        setOtherUserName('Buyer')
      } else {
        setOtherUserName('Seller')
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
      toast.error('Failed to load conversation')
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error

      setMessages(data || [])
      scrollToBottom()

      // Mark messages as read
      if (data && data.length > 0) {
        const unreadIds = data
          .filter(m => m.sender_id !== user?.id && !m.is_read)
          .map(m => m.id)

        if (unreadIds.length > 0) {
          await supabase
            .from('messages')
            .update({ is_read: true })
            .in('id', unreadIds)
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !conversation || sending) return

    setSending(true)
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user?.id,
          content: newMessage.trim()
        })
        .select()
        .single()

      if (error) throw error

      setMessages(prev => [...prev, data])
      setNewMessage('')
      scrollToBottom()

      // Update conversation's last message
      await supabase
        .from('conversations')
        .update({
          last_message: newMessage.trim(),
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversation.id)
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Set up real-time subscription
  useEffect(() => {
    if (!conversation) return

    const subscription = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        async (payload) => {
          if (payload.new.sender_id !== user?.id) {
            const newMsg = payload.new as Message
            setMessages(prev => [...prev, newMsg])

            // Mark as read if chat is open
            await supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', payload.new.id)
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [conversation, user])

  const getContextTitle = () => {
    if (contextType === 'shop' && contextInfo) {
      return `Chat about: ${contextInfo.name}`
    }
    if (contextType === 'exchange' && contextInfo) {
      return `Exchange: ${contextInfo.from_currency} to ${contextInfo.to_currency}`
    }
    if (contextType === 'mission' && contextInfo) {
      return `Mission: ${contextInfo.title}`
    }
    return 'Direct Message'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Loading conversation...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <div className="flex-1 max-w-4xl mx-auto w-full bg-white shadow-lg flex flex-col">
        {/* Chat Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-lg font-semibold">{otherUserName}</h2>
                <p className="text-sm text-gray-500">{getContextTitle()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender_id === user?.id
                      ? 'bg-[#B91C1C] text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender_id === user?.id ? 'text-red-100' : 'text-gray-500'
                  }`}>
                    {new Date(message.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={sendMessage} className="border-t bg-white px-6 py-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C]"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-6 py-2 bg-[#B91C1C] text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UnifiedChatPage
