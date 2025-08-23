import React from 'react'
import { Circle, Users } from 'lucide-react'
import { UserPresence } from '../services/exchangeChatService'

interface UserPresenceIndicatorProps {
  presence: UserPresence[]
  currentUserId: string
  className?: string
}

const UserPresenceIndicator: React.FC<UserPresenceIndicatorProps> = ({
  presence,
  currentUserId,
  className = ''
}) => {
  const otherUsers = presence.filter(p => p.user_id !== currentUserId)
  const onlineUsers = otherUsers.filter(p => p.is_online)
  const typingUsers = otherUsers.filter(p => p.is_typing)

  if (otherUsers.length === 0) {
    return null
  }

  return (
    <div className={`flex items-center space-x-2 text-sm text-gray-500 ${className}`}>
      <div className="flex items-center space-x-1">
        <Users className="w-4 h-4" />
        <span>{onlineUsers.length} online</span>
      </div>
      
      {onlineUsers.map((user) => (
        <div key={user.user_id} className="flex items-center space-x-1">
          <Circle 
            className={`w-2 h-2 ${user.is_online ? 'text-green-500 fill-current' : 'text-gray-300'}`} 
          />
          <span className="text-xs">
            User {user.user_id.slice(0, 8)}
            {user.is_typing && ' (typing...)'}
          </span>
        </div>
      ))}
      
      {typingUsers.length > 0 && (
        <div className="text-xs text-blue-500">
          {typingUsers.length === 1 
            ? `User ${typingUsers[0].user_id.slice(0, 8)} is typing...`
            : `${typingUsers.length} users are typing...`
          }
        </div>
      )}
    </div>
  )
}

export default UserPresenceIndicator
