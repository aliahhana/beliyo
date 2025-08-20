import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface ChatProps {
  chatId: string
}

const Chat: React.FC<ChatProps> = ({ chatId }) => {
  const { user } = useAuth()
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      if (error) console.error('Error fetching messages:', error)
      else setMessages(data)
    }

    fetchMessages()

    const messageSubscription = supabase
      .from(`messages:chat_id=eq.${chatId}`)
      .on('INSERT', payload => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => {
      supabase.removeSubscription(messageSubscription)
    }
  }, [chatId])

  const handleSendMessage = async () => {
    if (newMessage.trim() === '') return

    const { error } = await supabase
      .from('messages')
      .insert([{ chat_id: chatId, user_id: user?.id, content: newMessage }])

    if (error) console.error('Error sending message:', error)
    else setNewMessage('')
  }

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.user_id === user?.id ? 'sent' : 'received'}`}>
            {msg.content}
          </div>
        ))}
      </div>
      <div className="input-container">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>
    </div>
  )
}

export default Chat
