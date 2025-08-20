import React from 'react'

interface TypingIndicatorProps {
  isVisible: boolean
  userName?: string
  className?: string
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  isVisible, 
  userName = 'Someone',
  className = '' 
}) => {
  if (!isVisible) return null

  return (
    <div className={`flex justify-start ${className}`}>
      <div className="bg-gray-100 px-4 py-3 rounded-lg max-w-xs">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div 
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <div 
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <div 
              className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
          <span className="text-xs text-gray-500">
            {userName} is typing...
          </span>
        </div>
      </div>
    </div>
  )
}

export default TypingIndicator
