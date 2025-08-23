import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { toast } from './Toast'

interface ChatWithSellerButtonProps {
  /** Product information for chat context */
  product: {
    id: string
    seller_id: string
    user_id: string
    name: string
    category?: string
  }
  /** Button styling variant */
  variant?: 'primary' | 'secondary' | 'outline'
  /** Button size */
  size?: 'sm' | 'md' | 'lg'
  /** Additional CSS classes */
  className?: string
  /** Custom button text */
  children?: React.ReactNode
  /** Callback fired before navigation */
  onBeforeNavigate?: () => void
  /** Callback fired after successful navigation */
  onNavigateSuccess?: () => void
  /** Callback fired on navigation error */
  onNavigateError?: (error: string) => void
}

/**
 * Chat With Seller Button Component
 * 
 * Redirects to the existing unified chat page for product conversations
 */
const ChatWithSellerButton: React.FC<ChatWithSellerButtonProps> = ({
  product,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  onBeforeNavigate,
  onNavigateSuccess,
  onNavigateError
}) => {
  const navigate = useNavigate()
  const [isNavigating, setIsNavigating] = useState(false)
  
  // Use the AuthContext directly
  const { user, loading: authLoading } = useAuth()

  /**
   * Handle chat navigation - redirect to existing chat page
   */
  const handleChatWithSeller = async () => {
    try {
      setIsNavigating(true)
      
      // Fire before navigate callback
      onBeforeNavigate?.()

      // Wait for auth to finish loading
      if (authLoading) {
        toast.info('Please wait while we verify your authentication...')
        setIsNavigating(false)
        return
      }

      // Check if user exists
      if (!user) {
        toast.error('Please log in to chat with sellers')
        navigate('/login', { 
          state: { 
            returnTo: window.location.pathname,
            action: 'chat_with_seller',
            productId: product.id 
          }
        })
        setIsNavigating(false)
        return
      }

      // Validate product data
      if (!product || !product.id) {
        const errorMessage = 'Product information is missing'
        toast.error(errorMessage)
        onNavigateError?.(errorMessage)
        setIsNavigating(false)
        return
      }

      // Get seller ID
      const sellerId = product.seller_id || product.user_id
      if (!sellerId) {
        const errorMessage = 'Seller information is missing'
        toast.error(errorMessage)
        onNavigateError?.(errorMessage)
        setIsNavigating(false)
        return
      }

      // Check if user is trying to chat with themselves
      if (sellerId === user.id) {
        toast.warning('You cannot chat with yourself')
        setIsNavigating(false)
        return
      }

      // Redirect to the existing unified chat page for shop products
      const chatUrl = `/chat/shop/${product.id}/${sellerId}`

      console.log('Navigating to existing chat:', { chatUrl, user: user.id, sellerId })

      // Add small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 300))

      // Navigate to existing chat page
      navigate(chatUrl, {
        state: {
          product: {
            id: product.id,
            name: product.name,
            category: product.category,
            seller_id: sellerId
          },
          context: 'product_chat'
        }
      })

      // Fire success callback
      onNavigateSuccess?.()
      
    } catch (error) {
      console.error('Error navigating to chat:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to open chat'
      toast.error(errorMessage)
      onNavigateError?.(errorMessage)
    } finally {
      setIsNavigating(false)
    }
  }

  // Button styling variants
  const getVariantStyles = () => {
    const base = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
    
    switch (variant) {
      case 'primary':
        return `${base} bg-[#B91C1C] text-white hover:bg-red-700 focus:ring-red-500 shadow-sm hover:shadow-md`
      case 'secondary':
        return `${base} bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 shadow-sm hover:shadow-md`
      case 'outline':
        return `${base} border-2 border-[#B91C1C] text-[#B91C1C] hover:bg-[#B91C1C] hover:text-white focus:ring-red-500`
      default:
        return `${base} bg-[#B91C1C] text-white hover:bg-red-700 focus:ring-red-500`
    }
  }

  // Button size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2 text-sm rounded-md gap-1.5'
      case 'md':
        return 'px-4 py-2.5 text-sm rounded-lg gap-2'
      case 'lg':
        return 'px-6 py-3 text-base rounded-lg gap-2.5'
      default:
        return 'px-4 py-2.5 text-sm rounded-lg gap-2'
    }
  }

  const isDisabled = isNavigating || authLoading || !product?.id

  return (
    <button
      onClick={handleChatWithSeller}
      disabled={isDisabled}
      className={`${getVariantStyles()} ${getSizeStyles()} ${className}`}
      aria-label={`Chat with seller about ${product?.name || 'this item'}`}
      aria-describedby="chat-button-description"
      type="button"
    >
      {isNavigating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Opening Chat...</span>
        </>
      ) : (
        <>
          <MessageCircle className="w-4 h-4" />
          <span>{children || 'CHAT WITH SELLER'}</span>
        </>
      )}
      
      {/* Screen reader description */}
      <span id="chat-button-description" className="sr-only">
        Opens a private chat conversation with the seller of {product?.name || 'this item'}
      </span>
    </button>
  )
}

export default ChatWithSellerButton
