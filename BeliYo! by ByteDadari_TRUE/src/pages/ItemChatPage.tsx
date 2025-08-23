import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import UnifiedChat from '../components/UnifiedChat'
import { ChatContext } from '../services/unifiedChatService'
import { toast } from '../components/Toast'

interface ProductInfo {
  id: string
  name: string
  category?: string
  seller_id: string
  image_url?: string
  price?: number
  currency?: string
}

/**
 * Item-Specific Chat Page
 * 
 * Handles chat conversations for specific items using the URL pattern:
 * /chat/item/{encodedItemCode}/{sellerId}
 * 
 * Features:
 * - Decodes item codes to extract product information
 * - Validates seller and product existence
 * - Integrates with unified chat system
 * - Provides proper error handling and loading states
 */
const ItemChatPage: React.FC = () => {
  const { encodedItemCode, sellerId } = useParams<{ 
    encodedItemCode: string
    sellerId: string 
  }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null)
  const [chatContext, setChatContext] = useState<ChatContext | null>(null)

  /**
   * Decode item code to extract product information
   * Format: {productId}_{productName}_{category}
   */
  const decodeItemCode = (encodedCode: string): { productId: string; productName: string; category: string } | null => {
    try {
      const decodedCode = decodeURIComponent(encodedCode)
      const parts = decodedCode.split('_')
      
      if (parts.length < 2) {
        return null
      }

      const productId = parts[0]
      const category = parts[parts.length - 1]
      const productName = parts.slice(1, -1).join('_')

      return {
        productId,
        productName: productName || 'Unknown Item',
        category: category || 'general'
      }
    } catch (error) {
      console.error('Error decoding item code:', error)
      return null
    }
  }

  /**
   * Fetch product information from database
   */
  const fetchProductInfo = async (productId: string): Promise<ProductInfo | null> => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, seller_id, user_id, image_url, price, currency')
        .eq('id', productId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Product not found
        }
        throw error
      }

      return {
        id: data.id,
        name: data.name,
        category: data.category,
        seller_id: data.seller_id || data.user_id,
        image_url: data.image_url,
        price: data.price,
        currency: data.currency
      }
    } catch (error) {
      console.error('Error fetching product info:', error)
      throw error
    }
  }

  /**
   * Validate seller exists and is not the current user
   */
  const validateSeller = async (sellerId: string): Promise<boolean> => {
    try {
      if (!user) return false
      
      if (sellerId === user.id) {
        setError('You cannot chat with yourself')
        return false
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', sellerId)
        .single()

      if (error || !data) {
        setError('Seller not found')
        return false
      }

      return true
    } catch (error) {
      console.error('Error validating seller:', error)
      setError('Failed to validate seller')
      return false
    }
  }

  /**
   * Initialize chat page with product and seller validation
   */
  useEffect(() => {
    const initializeChatPage = async () => {
      try {
        setLoading(true)
        setError(null)

        // Validate required parameters
        if (!encodedItemCode || !sellerId) {
          setError('Invalid chat URL - missing item or seller information')
          return
        }

        // Check authentication
        if (!user) {
          toast.info('Please log in to access chat')
          navigate('/login', { 
            state: { 
              returnTo: location.pathname,
              action: 'item_chat'
            }
          })
          return
        }

        // Decode item code
        const decodedInfo = decodeItemCode(encodedItemCode)
        if (!decodedInfo) {
          setError('Invalid item code format')
          return
        }

        // Validate seller
        const isValidSeller = await validateSeller(sellerId)
        if (!isValidSeller) {
          return // Error already set in validateSeller
        }

        // Fetch product information
        const product = await fetchProductInfo(decodedInfo.productId)
        if (!product) {
          setError('Product not found or no longer available')
          return
        }

        // Verify seller matches product
        if (product.seller_id !== sellerId) {
          setError('Seller mismatch - this seller is not associated with this product')
          return
        }

        // Set product info and create chat context
        setProductInfo(product)
        setChatContext({
          type: 'shop',
          id: product.id,
          title: `Chat about ${product.name}`,
          otherUserId: sellerId,
          metadata: {
            productName: product.name,
            productCategory: product.category,
            itemCode: decodedInfo.productId + '_' + decodedInfo.productName + '_' + decodedInfo.category
          }
        })

      } catch (error) {
        console.error('Error initializing chat page:', error)
        setError('Failed to load chat. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    initializeChatPage()
  }, [encodedItemCode, sellerId, user, navigate, location.pathname])

  /**
   * Handle back navigation
   */
  const handleBack = () => {
    if (productInfo) {
      navigate(`/product/${productInfo.id}`)
    } else {
      navigate('/shop')
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Chat</h2>
          <p className="text-gray-600">Preparing your conversation...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Chat</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={handleBack}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render chat interface
  if (chatContext && productInfo) {
    return (
      <div className="h-screen">
        <UnifiedChat 
          context={chatContext}
          otherUserId={sellerId}
          onBack={handleBack}
          className="h-full"
        />
      </div>
    )
  }

  return null
}

export default ItemChatPage
