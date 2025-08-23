import React from 'react'
import { useParams } from 'react-router-dom'
import ChatIntegration from './ChatIntegration'
import { ChatContext } from '../services/unifiedChatService'

interface ChatProps {
  chatId?: string
  otherUserId?: string
  context?: ChatContext
  onBack?: () => void
}

/**
 * Legacy Chat Component - Now uses Unified Chat System
 * 
 * This component has been updated to use the new unified 1:1 chat system
 * while maintaining backward compatibility with existing usage patterns.
 */
const Chat: React.FC<ChatProps> = ({ 
  chatId, 
  otherUserId, 
  context,
  onBack 
}) => {
  // If no otherUserId provided, try to extract from chatId or show error
  if (!otherUserId) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Unable to start conversation</p>
          <p className="text-sm text-gray-400">Other user ID is required for 1:1 chat</p>
          {onBack && (
            <button 
              onClick={onBack}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    )
  }

  // Default context if none provided
  const chatContext: ChatContext = context || {
    type: 'general',
    id: chatId,
    title: 'Chat'
  }

  return (
    <ChatIntegration 
      context={chatContext}
      otherUserId={otherUserId}
      onBack={onBack}
      className="h-full"
    />
  )
}

export default Chat
