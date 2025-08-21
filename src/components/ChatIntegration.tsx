import React from 'react'
import UnifiedChat from './UnifiedChat'
import { ChatContext } from '../services/unifiedChatService'

interface ChatIntegrationProps {
  context: ChatContext
  otherUserId: string // Required for 1:1 conversations
  onBack?: () => void
  className?: string
  style?: React.CSSProperties
}

/**
 * Chat Integration Component
 * 
 * This component provides a seamless way to integrate the unified 1:1 chat system
 * into any part of the application. It automatically handles the context
 * and provides a consistent chat experience across all features.
 * 
 * Usage examples:
 * 
 * // For shop product chat between two users
 * <ChatIntegration 
 *   context={{ type: 'shop', id: productId, title: 'Product Chat' }}
 *   otherUserId={sellerId}
 *   onBack={() => navigate('/shop')}
 * />
 * 
 * // For money exchange chat between two users
 * <ChatIntegration 
 *   context={{ type: 'exchange', id: exchangeId, title: 'Exchange Chat' }}
 *   otherUserId={exchangePartnerId}
 *   onBack={() => navigate('/money-exchange')}
 * />
 * 
 * // For mission chat between two users
 * <ChatIntegration 
 *   context={{ type: 'mission', id: missionId, title: 'Mission Chat' }}
 *   otherUserId={missionCreatorId}
 *   onBack={() => navigate('/missions')}
 * />
 * 
 * // For general direct message between two users
 * <ChatIntegration 
 *   context={{ type: 'general' }}
 *   otherUserId={recipientId}
 * />
 */
const ChatIntegration: React.FC<ChatIntegrationProps> = ({ 
  context, 
  otherUserId,
  onBack, 
  className = '',
  style 
}) => {
  if (!otherUserId) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-50 ${className}`} style={style}>
        <div className="text-center">
          <p className="text-gray-600 mb-2">Unable to start conversation</p>
          <p className="text-sm text-gray-400">Other user ID is required for 1:1 chat</p>
        </div>
      </div>
    )
  }

  return (
    <div className={className} style={style}>
      <UnifiedChat 
        context={context}
        otherUserId={otherUserId}
        onBack={onBack}
        className="h-full"
      />
    </div>
  )
}

export default ChatIntegration
