import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { ArrowLeft, MapPin, Upload, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import LocationPicker from '../components/LocationPicker'

interface Product {
  id: string
  seller_id: string
  name: string
  description: string
  price: number
  currency: string
  category: string
  image_url?: string
  location: string
  latitude?: number
  longitude?: number
  condition: number
  status: string
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

  useEffect(() => {
    if (id) {
      fetchProduct(id)
    }
  }, [id])

  const fetchProduct = async (productId: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (error) throw error

      // Check if user owns this product
      if (data.seller_id !== user?.id) {
        alert('You are not authorized to edit this product')
        navigate('/shop')
        return
      }

      setProduct(data)
      setFormData({
        name: data.name,
        description: data.description,
        price: data.price === 0 ? '' : data.price.toString(),
        currency: data.currency,
        category: data.category,
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        condition: data.condition,
        image: null,
        imagePreview: data.image_url || ''
      })
    } catch (error) {
      console.error('Error fetching product:', error)
      alert('Failed to load product')
      navigate('/shop')
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({
        ...prev,
        image: file,
        imagePreview: URL.createObjectURL(file)
      }))
    }
  }

  const handleLocationSelect = (locationData: LocationData) => {
    console.log('Location selected:', locationData)
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
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id)
        .eq('seller_id', user.id)

      if (error) throw error

      alert('Product marked as sold successfully!')
      navigate('/shop')
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

    setSaving(true)
    try {
      let imageUrl = product.image_url

      // Upload new image if provided
      if (formData.image) {
        const fileExt = formData.image.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, formData.image)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName)

        imageUrl = publicUrl
      }

      // Update product
      const { error } = await supabase
        .from('products')
        .update({
          name: formData.name,
          description: formData.description,
          price: formData.currency === 'FREE' ? 0 : parseFloat(formData.price) || 0,
          currency: formData.currency,
          category: formData.category,
          location: formData.location,
          latitude: formData.latitude,
          longitude: formData.longitude,
          condition: formData.condition,
          image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id)
        .eq('seller_id', user.id) // Ensure user can only update their own products

      if (error) throw error

      alert('Product updated successfully!')
      navigate('/shop')
    } catch (error) {
      console.error('Error updating product:', error)
      alert('Failed to update product')
    } finally {
      setSaving(false)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header variant="shop" />
      
      <div className="max-w-4xl mx-auto p-8">
        <button
          onClick={() => navigate('/shop')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Shop
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
            {product?.status === 'sold' && (
              <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">SOLD</span>
              </div>
            )}
          </div>

          {product?.status === 'sold' ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">This item has been sold</h2>
              <p className="text-gray-600 mb-6">This product is no longer available for purchase.</p>
              <button
                onClick={() => navigate('/shop')}
                className="px-6 py-3 bg-[#B91C1C] text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Back to Shop
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
                    <option value="WON">WON</option>
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
                      className={`text-2xl ${star <= formData.condition ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
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
                  Pickup Location *
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
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/shop')}
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
