import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * Legacy Chat Page - Redirects to Unified Chat System
 * 
 * This component handles legacy chat routes and redirects them to the new unified system.
 * Legacy routes like /chat/:productId are converted to proper 1:1 chat routes.
 */
const ChatPage: React.FC = () => {
  const { productId } = useParams<{ productId?: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    // If no productId, redirect to chat list
    if (!productId) {
      navigate('/chat-list', { replace: true })
      return
    }

    // For legacy product chat routes, we need to determine the other user
    // Since we can't determine the other user from the legacy route alone,
    // redirect to the product page where users can initiate proper 1:1 chats
    if (productId) {
      navigate(`/product/${productId}`, { replace: true })
      return
    }

    // Fallback to chat list
    navigate('/chat-list', { replace: true })
  }, [productId, navigate, user])

  // Show loading while redirecting
  return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to updated chat system...</p>
      </div>
    </div>
  )
}

export default ChatPage
