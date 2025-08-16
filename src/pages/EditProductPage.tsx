import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { ArrowLeft, MapPin, Upload, CheckCircle, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import LocationPicker from '../components/LocationPicker'

interface Product {
  id: string
  user_id: string
  title: string
  name: string
  description: string
  price: number
  currency: string
  category: string
  image_url?: string
  images?: string[]
  location: any
  latitude?: number
  longitude?: number
  condition: number | string  // Can be either during transition
  status: string
  is_sold: boolean
  created_at: string
  updated_at: string
}

interface LocationData {
  address: string
  coordinates: [number, number]
  verified: boolean
}

const categories = [
  { value: 'clothes', label: 'Clothes' },
  { value: 'electric-electronics', label: 'Electric / Electronics' },
  { value: 'sports-equipments', label: 'Sports Equipments' },
  { value: 'household-supplies', label: 'Household Supplies' },
  { value: 'musical-instruments', label: 'Musical Instruments' },
  { value: 'food-drinks', label: 'Food & Drinks' },
  { value: 'cosmetics', label: 'Cosmetics' },
  { value: 'books', label: 'Books' },
  { value: 'others', label: 'Others' }
]

const EditProductPage: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [markingSold, setMarkingSold] = useState(false)
  const [product, setProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'RM',
    category: 'others',
    location: '',
    latitude: null as number | null,
    longitude: null as number | null,
    condition: 3,
    image: null as File | null,
    imagePreview: ''
  })
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchInput, setSearchInput] = useState('')

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (id && user) {
      fetchProduct(id)
    } else if (!user) {
      navigate('/login')
    }
  }, [id, user])

  const fetchProduct = async (productId: string) => {
    if (!user) {
      alert('Please sign in to edit products')
      navigate('/login')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (error) {
        console.error('Error fetching product:', error)
        throw error
      }

      // Check if user owns this product
      if (data.user_id !== user.id) {
        alert('You are not authorized to edit this product')
        navigate('/my-shop')
        return
      }

      setProduct(data)
      
      // Parse location
      let locationAddress = ''
      let lat = null
      let lng = null
      
      if (data.location) {
        if (typeof data.location === 'object') {
          locationAddress = data.location.address || ''
          lat = data.location.coordinates?.lat || null
          lng = data.location.coordinates?.lng || null
        } else if (typeof data.location === 'string') {
          locationAddress = data.location
        }
      }

      // Parse condition - handle both string and number formats
      let conditionValue = 3
      
      if (typeof data.condition === 'string') {
        // Map string conditions to numbers
        const conditionMap: { [key: string]: number } = {
          'Poor': 1,
          'Fair': 2,
          'Good': 3,
          'Very Good': 4,
          'Excellent': 5
        }
        conditionValue = conditionMap[data.condition] || 3
      } else if (typeof data.condition === 'number') {
        conditionValue = data.condition
      }

      setFormData({
        name: data.title || data.name || '',
        description: data.description || '',
        price: data.price === 0 && data.currency === 'FREE' ? '' : (data.price || 0).toString(),
        currency: data.currency || 'RM',
        category: data.category || 'others',
        location: locationAddress,
        latitude: lat || data.latitude || null,
        longitude: lng || data.longitude || null,
        condition: conditionValue,
        image: null,
        imagePreview: (data.images && Array.isArray(data.images) && data.images.length > 0) 
          ? data.images[0] 
          : data.image_url || ''
      })
    } catch (error) {
      console.error('Error fetching product:', error)
      alert('Failed to load product')
      navigate('/my-shop')
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB')
        return
      }
      setFormData(prev => ({
        ...prev,
        image: file,
        imagePreview: URL.createObjectURL(file)
      }))
    }
  }

  const handleLocationSelect = (locationData: LocationData) => {
    setFormData(prev => ({
      ...prev,
      location: locationData.address,
      latitude: locationData.coordinates[0],
      longitude: locationData.coordinates[1]
    }))
    setShowLocationPicker(false)
  }

  const handleMarkAsSold = async () => {
    if (!user || !product) return

    setMarkingSold(true)
    try {
      const { error } = await supabase
        .from('products')
        .update({
          status: 'sold',
          is_sold: true
        })
        .eq('id', product.id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error marking as sold:', error)
        throw error
      }

      alert('Product marked as sold successfully!')
      navigate('/my-shop')
    } catch (error) {
      console.error('Error marking product as sold:', error)
      alert('Failed to mark product as sold')
    } finally {
      setMarkingSold(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !product) return

    // Validation
    if (!formData.name.trim()) {
      alert('Please enter a product name')
      return
    }

    if (!formData.description.trim()) {
      alert('Please enter a description')
      return
    }

    if (formData.currency !== 'FREE' && (!formData.price || parseFloat(formData.price) < 0)) {
      alert('Please enter a valid price')
      return
    }

    setSaving(true)
    try {
      let imageUrl = product.image_url || ''
      let images = product.images || []

      // Upload new image if provided
      if (formData.image) {
        const fileExt = formData.image.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('product-images')
          .upload(fileName, formData.image)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          throw uploadError
        }

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName)

        imageUrl = publicUrl
        images = [publicUrl]
      }

      // Prepare update data - IMPORTANT: condition should be an integer now
      const updateData: any = {
        name: formData.name.trim(),
        title: formData.name.trim(),
        description: formData.description.trim(),
        price: formData.currency === 'FREE' ? 0 : parseFloat(formData.price) || 0,
        currency: formData.currency,
        category: formData.category,
        condition: formData.condition,  // Send as integer (1-5)
        image_url: imageUrl || null,
        images: Array.isArray(images) ? images : [],
        image_count: Array.isArray(images) ? images.length : 0
      }

      // Add location data if available
      if (formData.location) {
        updateData.location = {
          address: formData.location,
          coordinates: {
            lat: formData.latitude || 0,
            lng: formData.longitude || 0
          }
        }
        updateData.latitude = formData.latitude
        updateData.longitude = formData.longitude
      } else {
        updateData.location = null
        updateData.latitude = null
        updateData.longitude = null
      }

      console.log('Updating product with data:', updateData)
      console.log('Condition value type:', typeof updateData.condition, 'Value:', updateData.condition)

      // Update product
      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', product.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Update error:', error)
        throw error
      }

      console.log('Product updated successfully:', data)
      alert('Product updated successfully!')
      navigate('/my-shop')
    } catch (error: any) {
      console.error('Error updating product:', error)
      alert(`Failed to update product: ${error.message || 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleBeliYoClick = () => {
    navigate('/')
  }

  const handleSearch = (query: string) => {
    if (query.trim()) {
      setShowSearchModal(false)
      navigate(`/shop?search=${encodeURIComponent(query.trim())}`)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      handleSearch(searchInput.trim())
      setSearchInput('')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header variant="shop" />
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading product...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header variant="shop" />
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Sign In Required</h2>
            <p className="text-gray-600 mb-8">
              Please sign in to edit products.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="bg-red-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header variant="shop" />
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Product Not Found</h2>
            <p className="text-gray-600 mb-8">
              The product you're looking for doesn't exist or has been removed.
            </p>
            <button
              onClick={() => navigate('/my-shop')}
              className="bg-red-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Back to My Shop
            </button>
          </div>
        </div>
      </div>
    )
  }

  const getConditionLabel = (value: number): string => {
    const labels: { [key: number]: string } = {
      1: 'Poor',
      2: 'Fair',
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent'
    }
    return labels[value] || 'Good'
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-100">
        {/* Mobile Header */}
        <div className="bg-[#B91C1C] text-white">
          {/* Top bar with logo and search */}
          <div className="flex items-center justify-between p-4">
            <button 
              onClick={handleBeliYoClick}
              className="text-2xl font-bold hover:text-red-200 transition-colors"
            >
              BeliYo!
            </button>
            <div className="text-xl font-medium">EDIT PRODUCT</div>
            <button 
              onClick={() => setShowSearchModal(true)}
              className="hover:text-red-200 transition-colors"
            >
              <Search className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Search Modal */}
        {showSearchModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Search Products</h3>
                  <button
                    onClick={() => {
                      setShowSearchModal(false)
                      setSearchInput('')
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleSearchSubmit}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search for products..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-transparent"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#B91C1C] text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <Search className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-gray-100 pb-20">
          {/* Back Button */}
          <div className="bg-white px-4 py-3 border-b border-gray-200">
            <button
              onClick={() => navigate('/my-shop')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to My Shop
            </button>
          </div>

          {/* Product Status */}
          {product.is_sold && (
            <div className="bg-green-50 border-b border-green-200 px-4 py-3">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">This item has been sold</span>
              </div>
            </div>
          )}

          {product.is_sold ? (
            <div className="bg-white mx-4 mt-4 rounded-lg p-6 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">This item has been sold</h2>
              <p className="text-gray-600 mb-6">This product is no longer available for editing.</p>
              <button
                onClick={() => navigate('/my-shop')}
                className="px-6 py-3 bg-[#B91C1C] text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Back to My Shop
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Product Name */}
              <div className="bg-white rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter product name"
                />
              </div>

              {/* Category */}
              <div className="bg-white rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div className="bg-white rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="RM">RM</option>
                    <option value="₩">₩ (KRW)</option>
                    <option value="FREE">FREE</option>
                  </select>
                  {formData.currency !== 'FREE' && (
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Enter price"
                      min="0"
                      step="0.01"
                    />
                  )}
                </div>
              </div>

              {/* Condition */}
              <div className="bg-white rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Condition
                </label>
                <div className="flex gap-2 mb-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, condition: star }))}
                      className={`text-2xl ${star <= formData.condition ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition-colors`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  {getConditionLabel(formData.condition)}
                </p>
              </div>

              {/* Description */}
              <div className="bg-white rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={4}
                  placeholder="Describe your product"
                />
              </div>

              {/* Location */}
              <div className="bg-white rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Location
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowLocationPicker(true)}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    Pick on Map
                  </button>
                  <div className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm">
                    {formData.location || 'No location selected'}
                  </div>
                </div>
              </div>

              {/* Image Upload */}
              <div className="bg-white rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Image
                </label>
                {formData.imagePreview && (
                  <div className="mb-4">
                    <img
                      src={formData.imagePreview}
                      alt="Preview"
                      className="w-full max-w-md h-48 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=400'
                      }}
                    />
                  </div>
                )}
                <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer w-fit">
                  <Upload className="w-4 h-4" />
                  {formData.imagePreview ? 'Change Image' : 'Upload Image'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">Max file size: 5MB</p>
              </div>

              {/* Submit Buttons */}
              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full px-6 py-3 bg-[#B91C1C] text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={handleMarkAsSold}
                  disabled={markingSold}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  {markingSold ? 'Marking as Sold...' : 'Mark as Sold'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/my-shop')}
                  className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
          <div className="flex justify-around py-2">
            <button 
              onClick={() => navigate('/shop')}
              className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#B91C1C] transition-colors"
            >
              <span className="text-xl mb-1">🏪</span>
              <span className="text-xs font-medium">Shop</span>
            </button>
            <button 
              onClick={() => navigate('/money-exchange')}
              className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#B91C1C] transition-colors"
            >
              <span className="text-xl mb-1">🔄</span>
              <span className="text-xs font-medium">Exchange</span>
            </button>
            <button 
              onClick={() => navigate('/chat')}
              className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#B91C1C] transition-colors"
            >
              <span className="text-xl mb-1">💬</span>
              <span className="text-xs font-medium">Chats</span>
            </button>
            <button 
              onClick={() => navigate('/mission')}
              className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#B91C1C] transition-colors"
            >
              <span className="text-xl mb-1">🎯</span>
              <span className="text-xs font-medium">Mission</span>
            </button>
            <button 
              onClick={() => navigate('/my-page')}
              className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#B91C1C] transition-colors"
            >
              <span className="text-xl mb-1">👤</span>
              <span className="text-xs font-medium">MyPage</span>
            </button>
          </div>
        </div>

        {/* Location Picker Modal */}
        {showLocationPicker && (
          <LocationPicker
            onLocationSelect={handleLocationSelect}
            initialLocation={formData.location}
            isOpen={showLocationPicker}
            onClose={() => setShowLocationPicker(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header variant="shop" />
      
      <div className="max-w-4xl mx-auto p-8">
        <button
          onClick={() => navigate('/my-shop')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to My Shop
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
            {product.is_sold && (
              <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">SOLD</span>
              </div>
            )}
          </div>

          {product.is_sold ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">This item has been sold</h2>
              <p className="text-gray-600 mb-6">This product is no longer available for editing.</p>
              <button
                onClick={() => navigate('/my-shop')}
                className="px-6 py-3 bg-[#B91C1C] text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Back to My Shop
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter product name"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="RM">RM</option>
                    <option value="₩">₩ (KRW)</option>
                    <option value="FREE">FREE</option>
                  </select>
                  {formData.currency !== 'FREE' && (
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Enter price"
                      min="0"
                      step="0.01"
                    />
                  )}
                </div>
              </div>

              {/* Condition */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Condition
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, condition: star }))}
                      className={`text-2xl ${star <= formData.condition ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition-colors`}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {getConditionLabel(formData.condition)}
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={4}
                  placeholder="Describe your product"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Location
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLocationPicker(true)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    Pick on Map
                  </button>
                  <span className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white">
                    {formData.location || 'No location selected'}
                  </span>
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Image
                </label>
                {formData.imagePreview && (
                  <div className="mb-4">
                    <img
                      src={formData.imagePreview}
                      alt="Preview"
                      className="w-full max-w-md h-48 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=400'
                      }}
                    />
                  </div>
                )}
                <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer w-fit">
                  <Upload className="w-4 h-4" />
                  {formData.imagePreview ? 'Change Image' : 'Upload Image'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">Max file size: 5MB</p>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/my-shop')}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleMarkAsSold}
                  disabled={markingSold}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  {markingSold ? 'Marking as Sold...' : 'Mark as Sold'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-[#B91C1C] text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <LocationPicker
          onLocationSelect={handleLocationSelect}
          initialLocation={formData.location}
          isOpen={showLocationPicker}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </div>
  )
}

export default EditProductPage
