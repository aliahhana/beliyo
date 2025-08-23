import React from 'react'
import { Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react'
import { ConnectionState } from '../services/exchangeChatService'

interface ConnectionStatusProps {
  connectionState: ConnectionState
  className?: string
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  connectionState, 
  className = '' 
}) => {
  const getStatusConfig = () => {
    switch (connectionState.status) {
      case 'connected':
        return {
          icon: <Wifi className="w-4 h-4" />,
          text: 'Connected',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        }
      case 'connecting':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          text: 'Connecting...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        }
      case 'reconnecting':
        return {
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          text: `Reconnecting... (${connectionState.retryCount})`,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        }
      case 'disconnected':
        return {
          icon: connectionState.retryCount > 0 ? <AlertTriangle className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />,
          text: connectionState.retryCount > 0 ? 'Connection Failed' : 'Disconnected',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        }
      default:
        return {
          icon: <WifiOff className="w-4 h-4" />,
          text: 'Unknown',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border ${config.bgColor} ${config.borderColor} ${className}`}>
      <div className={config.color}>
        {config.icon}
      </div>
      <span className={`text-sm font-medium ${config.color}`}>
        {config.text}
      </span>
      {connectionState.lastError && connectionState.status === 'disconnected' && (
        <div className="text-xs text-red-500 ml-2" title={connectionState.lastError}>
          ⚠️
        </div>
      )}
    </div>
  )
}

export default ConnectionStatus
