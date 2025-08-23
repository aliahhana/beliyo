import React from 'react'
import { Check, CheckCheck, Loader2, AlertCircle, Clock } from 'lucide-react'

interface MessageDeliveryStatusProps {
  status?: 'sending' | 'sent' | 'delivered' | 'failed'
  timestamp: Date
  isRead?: boolean
  className?: string
}

const MessageDeliveryStatus: React.FC<MessageDeliveryStatusProps> = ({
  status,
  timestamp,
  isRead = false,
  className = ''
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />
      case 'delivered':
        return <CheckCheck className={`w-3 h-3 ${isRead ? 'text-blue-500' : 'text-gray-400'}`} />
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-500" />
      default:
        return <Clock className="w-3 h-3 text-gray-400" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'sending':
        return 'Sending...'
      case 'sent':
        return 'Sent'
      case 'delivered':
        return isRead ? 'Read' : 'Delivered'
      case 'failed':
        return 'Failed to send'
      default:
        return 'Pending'
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className={`flex items-center space-x-1 text-xs ${className}`}>
      <span>{formatTime(timestamp)}</span>
      <div title={getStatusText()}>
        {getStatusIcon()}
      </div>
    </div>
  )
}

export default MessageDeliveryStatus
