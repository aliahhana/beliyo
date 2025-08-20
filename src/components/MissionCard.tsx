import React from 'react'
import { X } from 'lucide-react'

interface MissionCardProps {
  avatar: string
  description: string
  dueDate: string
  isAccepted: boolean
  isOwner?: boolean
  onAccept: () => void
  onQuit: () => void
  onEdit?: () => void
  onDelete?: () => void
}

const MissionCard: React.FC<MissionCardProps> = ({
  avatar,
  description,
  dueDate,
  isAccepted,
  isOwner = false,
  onAccept,
  onQuit,
  onEdit,
  onDelete
}) => {
  const getUserAvatar = (avatarId: string) => {
    // Generate consistent avatar based on avatar ID
    const avatars = ['👨‍💼', '👾', '👩‍💻', '🧑‍🎓', '👨‍🎨', '👩‍🔬']
    const index = avatarId.charCodeAt(0) % avatars.length
    return avatars[index]
  }

  const handleCloseClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onDelete) {
      onDelete()
    }
  }

  const handleAcceptClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onAccept()
  }

  const handleQuitClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onQuit()
  }

  return (
    <div className="relative bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Diamond Pattern Background */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, #e5e7eb 0, #e5e7eb 10px, transparent 10px, transparent 20px),
                           repeating-linear-gradient(-45deg, #e5e7eb 0, #e5e7eb 10px, transparent 10px, transparent 20px)`
        }}
      />
      
      {/* Red Diamond Decoration */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
        <div className="w-6 h-6 bg-red-600 transform rotate-45 shadow-md"></div>
      </div>

      {/* Close Button - Only for Requester */}
      {isOwner && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={handleCloseClick}
            className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors shadow-md cursor-pointer"
            title="Close Mission"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Content */}
      <div className="relative p-6 pt-16 flex flex-col items-center text-center">
        {/* Avatar */}
        <div className="text-5xl mb-4">
          {getUserAvatar(avatar)}
        </div>
        
        {/* Title (previously description) */}
        <p className="text-gray-800 font-medium mb-3 min-h-[48px]">
          "{description}"
        </p>
        
        {/* Due Date */}
        <p className="text-gray-600 text-sm mb-4">
          Due <span className={dueDate === 'TODAY' ? 'text-red-600 font-bold' : ''}>{dueDate}</span>
        </p>
        
        {/* Action Button */}
        {isAccepted ? (
          <button
            onClick={handleQuitClick}
            className="bg-gray-600 text-white px-6 py-2 rounded-full font-semibold text-sm uppercase tracking-wide hover:bg-gray-700 transition-colors shadow-md"
          >
            IN PROGRESS
          </button>
        ) : (
          <button
            onClick={handleAcceptClick}
            className="bg-[#B91C1C] text-white px-6 py-2 rounded-full font-semibold text-sm uppercase tracking-wide hover:bg-[#991B1B] transition-colors shadow-md"
          >
            ACCEPT CHALLENGE
          </button>
        )}
      </div>
      
      {/* Bottom Shadow Effect */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-gray-300 to-transparent opacity-30"></div>
    </div>
  )
}

export default MissionCard
