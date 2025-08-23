import React, { useState, useEffect } from 'react'
import { X, User, Search, MessageCircle, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Buyer {
  id: string
  email: string
  display_name?: string
  last_contact_at: string
  message_count: number
  inquiry_type: 'message' | 'inquiry' | 'both'
}

interface BuyerSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectBuyer: (buyer: Buyer) => void
  productName: string
  productId?: string
}

const BuyerSelectionModal: React.FC<BuyerSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectBuyer,
  productName,
  productId
}) => {
  const [buyers, setBuyers] = useState<Buyer[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBuyer, setSelectedBuyer] = useState<Buyer | null>(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchAllUsers()
    }
  }, [isOpen])

  const fetchAllUsers = async () => {
    setLoading(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData?.user) {
        console.error('Error fetching current user:', authError)
        setBuyers([])
        return
      }

      const currentUserId = authData.user.id

      // Fetch all users from profiles table
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, email')
        .neq('user_id', currentUserId) // Exclude current user

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
        setBuyers([])
        return
      }

      // Transform profiles into buyer format
      const allUsers: Buyer[] = (profiles || []).map(profile => ({
        id: profile.id,
        email: profile.email || 'No email',
        display_name: profile.user_id || profile.email,
        last_contact_at: new Date().toISOString(), // Default to now since we're showing all users
        message_count: 0, // Default to 0 since we're not syncing from chat
        inquiry_type: 'inquiry' as const
      }))
      
      setBuyers(allUsers)

    } catch (error) {
      console.error('Error fetching all users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectBuyer = async (buyer: Buyer) => {
    setSelectedBuyer(buyer)
    setConfirming(true)
  }

  const confirmSale = async () => {
    if (!selectedBuyer) {
      alert("No buyer selected.");
      return;
    }

    try {
      setLoading(true)

      // Get current user once
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        alert("Unable to get current user.");
        return;
      }
      const sellerId = authData.user.id;
      
      // Update product status to sold
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          status: 'sold',
          updated_at: new Date().toISOString()
        })
        .eq('id', productId)

      if (updateError) {
        console.error('Error updating product status:', updateError)
        return
      }

      // Record the transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([{
          product_id: productId,
          buyer_id: selectedBuyer.id,
          seller_id: sellerId,
          status: 'completed',
          transaction_type: 'sale',
          contact_method: selectedBuyer.inquiry_type,
          notes: `Sale confirmed to ${selectedBuyer.display_name}`
        }])

      if (transactionError) {
        console.error('Error recording transaction:', transactionError)
      }

      // Call the parent callback
      onSelectBuyer(selectedBuyer)
      onClose()
    } catch (error) {
      console.error('Error confirming sale:', error)
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    return time.toLocaleDateString()
  }

  const getInquiryTypeIcon = (type: string) => {
    switch (type) {
      case 'message': return <MessageCircle className="w-4 h-4 text-blue-500" />
      case 'inquiry': return <User className="w-4 h-4 text-green-500" />
      case 'both': return <MessageCircle className="w-4 h-4 text-purple-500" />
      default: return <User className="w-4 h-4 text-gray-500" />
    }
  }

  const filteredBuyers = buyers.filter(buyer =>
    buyer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    buyer.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900">
              {confirming ? 'Confirm Sale' : 'Select Buyer'}
            </h3>
            <button
              onClick={() => {
                setConfirming(false)
                setSelectedBuyer(null)
                onClose()
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-sm text-gray-600">
            {confirming 
              ? `Confirm sale of "${productName}" to ${selectedBuyer?.display_name}?`
              : `Who purchased "${productName}"?`
            }
          </p>
        </div>

        {confirming ? (
          /* Confirmation View */
          <div className="p-6 flex-1">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-red-600" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                {selectedBuyer?.display_name}
              </h4>
              <p className="text-gray-600 mb-4">{selectedBuyer?.email}</p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Contact Method:</span>
                  <div className="flex items-center gap-1">
                    {getInquiryTypeIcon(selectedBuyer?.inquiry_type || '')}
                    <span className="capitalize">{selectedBuyer?.inquiry_type}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-gray-600">User Type:</span>
                  <span>App User</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setConfirming(false)
                    setSelectedBuyer(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={confirmSale}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Confirming...' : 'Confirm Sale'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading users...</p>
                </div>
              ) : filteredBuyers.length === 0 ? (
                <div className="p-8 text-center">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No users found</p>
                  <p className="text-sm text-gray-500">
                    {searchQuery ? 'Try adjusting your search terms' : 'No registered users available'}
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {filteredBuyers.map((buyer) => (
                    <button
                      key={buyer.id}
                      onClick={() => handleSelectBuyer(buyer)}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                    >
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-gray-900">
                            {buyer.display_name}
                          </p>
                          {getInquiryTypeIcon(buyer.inquiry_type)}
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{buyer.email}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>App User</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default BuyerSelectionModal
