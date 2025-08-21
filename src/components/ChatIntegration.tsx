import React from 'react'
import UnifiedChat from './UnifiedChat'
import { ChatContext } from '../services/unifiedChatService'

interface ChatIntegrationProps {
  context: ChatContext
  otherUserId: string
  onBack?: () => void
  className?: string
}

/**
 * ChatIntegration Component - Wrapper for UnifiedChat
 * 
 * This component serves as an integration layer between the application
 * and the unified chat system. It provides a consistent interface for
 * different chat contexts (shop, exchange, mission, etc.)
 * 
 * FIXED: Now properly validates required parameters before rendering
 */
const ChatIntegration: React.FC<ChatIntegrationProps> = ({ 
  context, 
  otherUserId, 
  onBack, 
  className = '' 
}) => {
  // FIXED: Add validation for required parameters
  if (!context) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-50 ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <p className="text-gray-600 mb-2">Chat context is required</p>
          <p className="text-sm text-gray-400">Unable to initialize chat without context</p>
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
          <p className="text-gray-600 mb-2">Chat recipient is required</p>
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

  console.log('ChatIntegration rendering with:', {
    context,
    otherUserId,
    hasOnBack: !!onBack
  })

  // Render the unified chat component
  return (
    <UnifiedChat
      context={context}
      otherUserId={otherUserId}
      onBack={onBack}
      className={className}
    />
  )
}

export default ChatIntegration
