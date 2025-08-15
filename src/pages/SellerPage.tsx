import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import CurrencyConverter from '../components/CurrencyConverter'
import { Plus, ArrowRightLeft, X, Upload, Star, MapPin, Camera } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import LocationPicker from '../components/LocationPicker'

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

const MAX_IMAGES = 5

interface LocationData {
  address: string
  coordinates: [number, number]
  verified: boolean
}

const SellerPage: React.FC = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<'sell' | 'exchange'>('sell')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    itemName: '',
    category: 'others',
    description: '',
    condition: 5,
    price: '',
    currency: '₩',
    location: '',
    latitude: null as number | null,
    longitude: null as number | null
  })
  const [exchangeData, setExchangeData] = useState({
    fromAmount: '',
    fromCurrency: '₩',
    toAmount: '',
    toCurrency: 'RM',
    notes: ''
  })
  const [showLocationPicker, setShowLocationPicker] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      const totalFiles = selectedFiles.length + files.length
      
      if (totalFiles > MAX_IMAGES) {
        alert(`You can only upload up to ${MAX_IMAGES} images. Please select fewer images.`)
        return
      }
      
      // Validate file sizes (max 5MB each)
      const oversizedFiles = files.filter(file => file.size > 5 * 1024 * 1024)
      if (oversizedFiles.length > 0) {
        alert('Some files are too large. Please select images under 5MB each.')
        return
      }
      
      const newFiles = [...selectedFiles, ...files]
      setSelectedFiles(newFiles)
      
      // Create preview URLs for new files
      const newUrls = files.map(file => URL.createObjectURL(file))
      setPreviewUrls(prev => [...prev, ...newUrls])
    }
  }

  const removeImage = (index: number) => {
    const newFiles = [...selectedFiles]
    newFiles.splice(index, 1)
    setSelectedFiles(newFiles)
    
    const newUrls = [...previewUrls]
    URL.revokeObjectURL(newUrls[index])
    newUrls.splice(index, 1)
    setPreviewUrls(newUrls)
  }

  const uploadImages = async (userId: string) => {
    if (!selectedFiles.length) return []
    
    setUploading(true)
    const uploadedUrls: string[] = []
    
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        const fileExt = file.name.split('.').pop()
        const fileName = `${userId}-${Date.now()}-${i}.${fileExt}`
        const filePath = `product-images/${fileName}`
        
        const { data, error } = await supabase.storage
          .from('product-images')
          .upload(filePath, file)
        
        if (error) throw error
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(data.path)
        
        uploadedUrls.push(publicUrl)
      }
      
      return uploadedUrls
    } catch (error) {
      console.error('Error uploading images:', error)
      throw error
    } finally {
      setUploading(false)
    }
  }

  const handleSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      alert('Please sign in to sell items')
      navigate('/login')
      return
    }

    // Validate required fields
    if (!formData.itemName.trim()) {
      alert('Please enter an item name')
      return
    }

    if (!formData.description.trim()) {
      alert('Please enter a description')
      return
    }

    if (!formData.location.trim()) {
      alert('Please select a location')
      return
    }

    // Validate price for non-free items
    if (formData.currency !== 'FREE') {
      if (!formData.price || parseFloat(formData.price) <= 0) {
        alert('Please enter a valid price')
        return
      }
    }

    setLoading(true)
    
    try {
      // Upload images first
      const imageUrls = await uploadImages(user.id)

      const productData = {
        seller_id: user.id,
        name: formData.itemName.trim(),
        description: formData.description.trim(),
        price: formData.currency === 'FREE' ? 0 : parseFloat(formData.price),
        currency: formData.currency,
        category: formData.category,
        condition: formData.condition,
        location: formData.location.trim(),
        latitude: formData.latitude,
        longitude: formData.longitude,
        image_url: imageUrls[0] || null, // Keep first image for backward compatibility
        images: imageUrls, // Store all images
        image_count: imageUrls.length,
        status: 'available'
      }

      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()

      if (error) throw error

      alert('Item posted successfully!')
      
      // Reset form
      setFormData({
        itemName: '',
        category: 'others',
        description: '',
        condition: 5,
        price: '',
        currency: '₩',
        location: '',
        latitude: null,
        longitude: null
      })
      setSelectedFiles([])
      setPreviewUrls([])
      
      // Force refresh of Shop page
      navigate('/shop', { replace: true })
    } catch (error: any) {
      console.error('Error posting item:', error)
      alert(`Error posting item: ${error.message || 'Please try again.'}`)
    } finally {
      setLoading(false)
    }
  }

  const renderStars = () => {
    return [1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => setFormData({...formData, condition: star})}
        className={`p-1 ${star <= formData.condition ? 'text-yellow-500' : 'text-gray-300'}`}
      >
        <Star className="w-5 h-5 fill-current" />
      </button>
    ))
  }

  const handleLocationSelect = (locationData: LocationData) => {
    console.log('Location selected:', locationData)
    
    try {
      setFormData(prev => ({
        ...prev,
        location: locationData.address,
        latitude: locationData.coordinates[0],
        longitude: locationData.coordinates[1]
      }))
      setShowLocationPicker(false)
    } catch (error) {
      console.error('Error handling location selection:', error)
      alert('Error selecting location. Please try again.')
    }
  }

  const handleCloseLocationPicker = () => {
    console.log('Closing location picker')
    setShowLocationPicker(false)
  }

  const canAddMoreImages = selectedFiles.length < MAX_IMAGES

  return (
    <div className="min-h-screen bg-gray-50">
      <Header variant="shop" />
      
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-[#B91C1C] min-h-screen">
          <div className="p-6">
            <h2 className="text-white text-xl font-bold mb-6">SELLER DASHBOARD</h2>
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('sell')}
                className={`block w-full text-left px-4 py-3 text-white hover:bg-red-700 transition-colors ${
                  activeTab === 'sell' ? 'bg-red-700' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Sell Item</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('exchange')}
                className={`block w-full text-left px-4 py-3 text-white hover:bg-red-700 transition-colors ${
                  activeTab === 'exchange' ? 'bg-red-700' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <ArrowRightLeft className="w-5 h-5" />
                  <span className="font-medium">Currency Exchange</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {activeTab === 'sell' ? (
            <form onSubmit={handleSellSubmit} className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
              <h1 className="text-2xl font-bold mb-6">Sell Your Item</h1>
              
              <div className="space-y-6">
                {/* Item Name */}
                <div>
                  <label htmlFor="itemName" className="block text-gray-700 mb-2">
                    Item Name
                  </label>
                  <input
                    type="text"
                    id="itemName"
                    value={formData.itemName}
                    onChange={(e) => setFormData({...formData, itemName: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter item name"
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="category" className="block text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    rows={4}
                    placeholder="Describe your item in detail..."
                    required
                  />
                </div>

                {/* Condition */}
                <div>
                  <label className="block text-gray-700 mb-2">
                    Condition
                  </label>
                  <div className="flex items-center">
                    {renderStars()}
                    <span className="ml-2 text-gray-600">
                      {formData.condition} {formData.condition === 1 ? 'star' : 'stars'}
                    </span>
                  </div>
                </div>

                {/* Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="price" className="block text-gray-700 mb-2">
                      Price
                    </label>
                    <input
                      type="number"
                      id="price"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="Enter price"
                      min="0"
                      step="0.01"
                      required={formData.currency !== 'FREE'}
                    />
                  </div>
                  <div>
                    <label htmlFor="currency" className="block text-gray-700 mb-2">
                      Currency
                    </label>
                    <select
                      id="currency"
                      value={formData.currency}
                      onChange={(e) => setFormData({...formData, currency: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="₩">KRW (₩)</option>
                      <option value="RM">MYR (RM)</option>
                      <option value="FREE">Free</option>
                    </select>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-gray-700 mb-2">
                    Location
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
                  <label className="block text-gray-700 mb-2">
                    Item Pictures ({selectedFiles.length}/{MAX_IMAGES})
                  </label>
                  
                  {/* Image Grid */}
                  {previewUrls.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                      {previewUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={url} 
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                            {index + 1}
                          </div>
                        </div>
                      ))}
                      
                      {/* Add More Button */}
                      {canAddMoreImages && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Plus className="w-6 h-6 mb-1" />
                          <span className="text-sm">Add More</span>
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Upload Area (shown when no images) */}
                  {previewUrls.length === 0 && (
                    <div 
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-600 font-medium mb-1">Add Item Pictures</p>
                      <p className="text-sm text-gray-500 mb-2">
                        Upload up to {MAX_IMAGES} images to showcase your item
                      </p>
                      <p className="text-xs text-gray-400">
                        JPEG, PNG (max 5MB each) • Click or drag & drop
                      </p>
                    </div>
                  )}
                  
                  {/* File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/jpeg,image/png,image/jpg"
                    multiple
                  />
                  
                  {/* Upload Status */}
                  {uploading && (
                    <div className="mt-2 text-sm text-blue-600 flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      Uploading images...
                    </div>
                  )}
                  
                  {/* Image Guidelines */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      <p>• First image will be used as the main product image</p>
                      <p>• You can reorder images by removing and re-adding them</p>
                    </div>
                  )}
                </div>

                <button 
                  type="submit"
                  disabled={loading || uploading}
                  className="w-full bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? 'Posting Item...' : uploading ? 'Uploading Images...' : 'Post Item'}
                </button>
              </div>
            </form>
          ) : (
            <CurrencyConverter />
          )}
        </div>
      </div>

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <LocationPicker
          onLocationSelect={handleLocationSelect}
          initialLocation={formData.location}
          isOpen={showLocationPicker}
          onClose={handleCloseLocationPicker}
        />
      )}
    </div>
  )
}

export default SellerPage
