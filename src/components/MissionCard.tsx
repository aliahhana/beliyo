import React, { useState } from 'react'
import { X, MapPin, Gift, FileText, Tag, Edit, Trash2 } from 'lucide-react'

interface MissionCardProps {
  avatar: string
  title: string
  description: string
  category: string
  location: string
  reward?: string | null
  notes?: string | null
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
  title,
  description,
  category,
  location,
  reward,
  notes,
  dueDate,
  isAccepted,
  isOwner = false,
  onAccept,
  onQuit,
  onEdit,
  onDelete
}) => {
  const [isNotesExpanded, setIsNotesExpanded] = useState(false)

  const getUserAvatar = (avatarId: string) => {
    // Generate consistent avatar based on avatar ID
    const avatars = ['👨‍💼', '👾', '👩‍💻', '🧑‍🎓', '👨‍🎨', '👩‍🔬']
    const index = avatarId.charCodeAt(0) % avatars.length
    return avatars[index]
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onDelete) {
      onDelete()
    }
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onEdit) {
      onEdit()
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

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const handleReadMoreClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsNotesExpanded(!isNotesExpanded)
  }

  const renderNotes = () => {
    if (!notes) return null

    const maxLength = 150
    const shouldTruncate = notes.length > maxLength
    const displayText = isNotesExpanded || !shouldTruncate ? notes : notes.substring(0, maxLength)

    return (
      <div className="flex flex-col items-center gap-1 mb-3">
        <div className="flex items-start gap-1">
          <FileText className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="text-center">
            <span 
              className={`text-blue-600 text-xs italic transition-all duration-300 ease-in-out ${
                isNotesExpanded ? 'line-clamp-none' : ''
              }`}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: isNotesExpanded ? 'unset' : 3,
                WebkitBoxOrient: 'vertical',
                overflow: isNotesExpanded ? 'visible' : 'hidden',
                wordBreak: 'break-word'
              }}
            >
              {displayText}
              {!isNotesExpanded && shouldTruncate && '...'}
            </span>
            {shouldTruncate && (
              <button
                onClick={handleReadMoreClick}
                className="block mt-1 text-blue-700 hover:text-blue-800 text-xs font-medium underline transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded px-1"
                aria-label={isNotesExpanded ? 'Show less notes' : 'Show more notes'}
                aria-expanded={isNotesExpanded}
                type="button"
              >
                {isNotesExpanded ? 'Read Less' : 'Read More'}
              </button>
            )}
          </div>
        </div>
      </div>
    )
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

      {/* Edit and Delete Buttons - Only for Owner */}
      {isOwner && (
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button
            onClick={handleEditClick}
            className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors shadow-md cursor-pointer"
            title="Edit Mission"
            type="button"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={handleDeleteClick}
            className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors shadow-md cursor-pointer"
            title="Delete Mission"
            type="button"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Content */}
      <div className="relative p-6 pt-16 flex flex-col items-center text-center">
        {/* Avatar */}
        <div className="text-4xl mb-3">
          {getUserAvatar(avatar)}
        </div>
        
        {/* Title */}
        <h3 className="text-gray-900 font-bold text-lg mb-2 min-h-[28px] leading-tight">
          {truncateText(title, 40)}
        </h3>
        
        {/* Category */}
        <div className="flex items-center gap-1 mb-2">
          <Tag className="w-3 h-3 text-gray-500" />
          <span className="text-gray-600 text-xs font-medium">
            {truncateText(category, 20)}
          </span>
        </div>
        
        {/* Location */}
        <div className="flex items-center gap-1 mb-2">
          <MapPin className="w-3 h-3 text-gray-500" />
          <span className="text-gray-600 text-xs">
            {truncateText(location, 25)}
          </span>
        </div>
        
        {/* Reward */}
        {reward && (
          <div className="flex items-center gap-1 mb-2">
            <Gift className="w-3 h-3 text-green-600" />
            <span className="text-green-700 text-xs font-medium">
              {truncateText(reward, 20)}
            </span>
          </div>
        )}
        
        {/* Notes - Enhanced with Read More functionality */}
        {renderNotes()}
        
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
