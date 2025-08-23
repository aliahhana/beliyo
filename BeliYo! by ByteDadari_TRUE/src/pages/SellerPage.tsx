import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import LocationPicker from '../components/LocationPicker'
import { MapPin, Upload, X, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

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

const SellerPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
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
    images: [] as File[],
    imagePreviews: [] as string[]
  })
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchInput, setSearchInput] = useState('')

  // Check if mobile on mount and resize
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is larger than 5MB and will be skipped`)
        return false
      }
      return true
    }).slice(0, 5 - formData.images.length)

    if (validFiles.length > 0) {
      const newPreviews = validFiles.map(file => URL.createObjectURL(file))
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...validFiles].slice(0, 5),
        imagePreviews: [...prev.imagePreviews, ...newPreviews].slice(0, 5)
      }))
    }

    if (formData.images.length + validFiles.length >= 5) {
      alert('Maximum 5 images allowed')
    }
  }

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
      imagePreviews: prev.imagePreviews.filter((_, i) => i !== index)
    }))
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      alert('Please sign in to post items')
      navigate('/login')
      return
    }

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

    if (formData.images.length === 0) {
      alert('Please upload at least one image')
      return
    }

    setIsSubmitting(true)

    try {
      // Upload images
      const imageUrls: string[] = []
      
      for (const image of formData.images) {
        const fileExt = image.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}-${Math.random()}.${fileExt}`
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('product-images')
          .upload(fileName, image)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          throw uploadError
        }

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName)

        imageUrls.push(publicUrl)
      }

      // Create product - IMPORTANT: Use user_id instead of seller_id
      const productData = {
        user_id: user.id,  // Changed from seller_id to user_id
        name: formData.name.trim(),
        title: formData.name.trim(),
        description: formData.description.trim(),
        price: formData.currency === 'FREE' ? 0 : parseFloat(formData.price) || 0,
        currency: formData.currency,
        category: formData.category,
        condition: formData.condition,  // Send as integer (1-5)
        image_url: imageUrls[0] || null,
        images: imageUrls,
        image_count: imageUrls.length,
        status: 'available',
        is_sold: false,
        location: formData.location ? {
          address: formData.location,
          coordinates: {
            lat: formData.latitude || 0,
            lng: formData.longitude || 0
          }
        } : null,
        latitude: formData.latitude,
        longitude: formData.longitude
      }

      console.log('Creating product with data:', productData)

      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single()

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      console.log('Product created successfully:', data)
      alert('Product posted successfully!')
      navigate('/shop')
    } catch (error: any) {
      console.error('Error posting product:', error)
      alert(`Failed to post product: ${error.message || 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
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
            <div className="text-xl font-medium">SELL ITEM</div>
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
                Product Images * (Max 5)
              </label>
              
              {/* Image Previews */}
              {formData.imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {formData.imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {formData.images.length < 5 && (
                <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer w-fit">
                  <Upload className="w-4 h-4" />
                  Upload Images ({formData.images.length}/5)
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              )}
              <p className="text-xs text-gray-500 mt-1">Max 5 images, 5MB each</p>
            </div>

            {/* Submit Button */}
            <div className="space-y-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-3 bg-[#B91C1C] text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Posting...' : 'Post Item'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/shop')}
                className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
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
      <Header variant="seller" />
      
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Post Your Item</h1>
        
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-6">
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
              Product Images * (Max 5)
            </label>
            
            {/* Image Previews */}
            {formData.imagePreviews.length > 0 && (
              <div className="grid grid-cols-5 gap-2 mb-4">
                {formData.imagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {formData.images.length < 5 && (
              <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer w-fit">
                <Upload className="w-4 h-4" />
                Upload Images ({formData.images.length}/5)
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
            <p className="text-xs text-gray-500 mt-1">Max 5 images, 5MB each</p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-[#B91C1C] text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Posting...' : 'Post Item'}
            </button>
          </div>
        </form>
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

export default SellerPage
