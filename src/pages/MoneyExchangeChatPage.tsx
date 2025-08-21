import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import ChatIntegration from '../components/ChatIntegration'
import { ChatContext } from '../services/unifiedChatService'

/**
 * Money Exchange Chat Page - Updated to use Unified 1:1 Chat System
 * 
 * This page now uses the unified chat system for money exchange conversations.
 * URL pattern: /chat/exchange/:exchangeId/:otherUserId
 * FIXED: Now properly handles the otherUserId parameter from URL
 */
const MoneyExchangeChatPage: React.FC = () => {
  const { exchangeId, otherUserId } = useParams<{ exchangeId: string; otherUserId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Please sign in to access exchange chat</p>
          <button 
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  if (!exchangeId) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Exchange ID is required</p>
          <button 
            onClick={() => navigate('/money-exchange')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Exchange
          </button>
        </div>
      </div>
    )
  }

  // FIXED: Now properly validates the otherUserId parameter
  if (!otherUserId) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <p className="text-gray-600 mb-2">Exchange partner ID is required</p>
          <p className="text-sm text-gray-400 mb-4">1:1 conversations require a specific user</p>
          <button 
            onClick={() => navigate('/money-exchange')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Exchange
          </button>
        </div>
      </div>
    )
  }

  // FIXED: Prevent users from chatting with themselves
  if (otherUserId === user.id) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-gray-600 mb-2">You cannot chat with yourself</p>
          <p className="text-sm text-gray-400 mb-4">Please select a different exchange request</p>
          <button 
            onClick={() => navigate('/money-exchange')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Exchange
          </button>
        </div>
      </div>
    )
  }

  const context: ChatContext = {
    type: 'exchange',
    id: exchangeId,
    title: 'Exchange Chat'
  }

  const handleBack = () => {
    navigate('/money-exchange')
  }

  console.log('MoneyExchangeChatPage initialized:', {
    exchangeId,
    otherUserId,
    currentUser: user.id,
    context
  })

  return (
    <div className="h-screen">
      <ChatIntegration 
        context={context}
        otherUserId={otherUserId}
        onBack={handleBack}
        className="h-full"
      />
    </div>
  )
}

export default MoneyExchangeChatPage
