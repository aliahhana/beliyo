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
 */
const MoneyExchangeChatPage: React.FC = () => {
  const { exchangeId, otherUserId } = useParams<{ exchangeId: string; otherUserId?: string }>()
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

  // For backward compatibility, if no otherUserId provided, try to determine from exchange
  const resolvedOtherUserId = otherUserId || 'exchange_partner' // In real app, fetch from exchange data

  if (!resolvedOtherUserId || resolvedOtherUserId === 'exchange_partner') {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Unable to determine exchange partner</p>
          <p className="text-sm text-gray-400">1:1 conversations require a specific user</p>
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

  return (
    <div className="h-screen">
      <ChatIntegration 
        context={context}
        otherUserId={resolvedOtherUserId}
        onBack={handleBack}
        className="h-full"
      />
    </div>
  )
}

export default MoneyExchangeChatPage
