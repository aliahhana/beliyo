import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import { Plus, Edit2, Trash2, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface Product {
  id: string
  name: string
  price: number
  currency: string
  seller_id: string
  timeAgo: string
  image_url?: string
  images?: string[]
  image_count?: number
  description: string
  category: string
  status: string
  location: string | { address?: string; coordinates?: any }
  created_at: string
}

const categories = [
  { key: 'all', label: '🔍 All Products' },
  { key: 'clothes', label: 'Clothes' },
  { key: 'electric-electronics', label: 'Electric / Electronics' },
  { key: 'sports-equipments', label: 'Sports Equipments' },
  { key: 'household-supplies', label: 'Household Supplies' },
  { key: 'musical-instruments', label: 'Musical Instruments' },
  { key: 'food-drinks', label: 'Food & Drinks' },
  { key: 'cosmetics', label: 'Cosmetics' },
  { key: 'books', label: 'Books' },
  { key: 'others', label: 'Others' }
]

// Function to map category keys to possible database values
const getCategoryDatabaseValues = (categoryKey: string): string[] => {
  const categoryMap: { [key: string]: string[] } = {
    'clothes': ['clothes', 'Clothes'],
    'electric-electronics': ['electric-electronics', 'Electric / Electronics', 'Electronics', 'electronics'],
    'sports-equipments': ['sports-equipments', 'Sports Equipments', 'sports equipments'],
    'household-supplies': ['household-supplies', 'Household Supplies', 'Home & Garden', 'household supplies'],
    'musical-instruments': ['musical-instruments', 'Musical Instruments', 'musical instruments'],
    'food-drinks': ['food-drinks', 'Food & Drinks', 'food drinks'],
    'cosmetics': ['cosmetics', 'Cosmetics'],
    'books': ['books', 'Books'],
    'others': ['others', 'Others']
  }
  return categoryMap[categoryKey] || [categoryKey]
}

// Helper function to format location display
const formatLocation = (location: string | { address?: string; coordinates?: any } | null | undefined): string => {
  if (!location) return 'Location not specified'
  
  // If it's already a string, check if it's JSON
  if (typeof location === 'string') {
    // Try to parse if it looks like JSON
    if (location.startsWith('{')) {
      try {
        const parsed = JSON.parse(location)
        return parsed.address || 'Location not specified'
      } catch {
        // If parsing fails, return as is (might be a plain address string)
        return location
      }
    }
    // Plain string address
    return location
  }
  
  // If it's an object with address property
  if (typeof location === 'object' && location.address) {
    return location.address
  }
  
  return 'Location not specified'
}

// Image carousel component for products with multiple images
const ProductImageCarousel: React.FC<{ 
  product: Product, 
  className?: string 
}> = ({ product, className = '' }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  
  // Get all available images
  const allImages = React.useMemo(() => {
    const images: string[] = []
    
    // Add images from the images array (new format)
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      images.push(...product.images)
    }
    
    // Add single image_url if it exists and not already in images array
    if (product.image_url && !images.includes(product.image_url)) {
      images.unshift(product.image_url) // Add to beginning for backward compatibility
    }
    
    // If no images, use default
    if (images.length === 0) {
      images.push(getDefaultImage(product.category))
    }
    
    return images
  }, [product.images, product.image_url, product.category])

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length)
  }

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length)
  }

  const goToImage = (index: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentImageIndex(index)
  }

  return (
    <div className={`relative ${className}`}>
      <img 
        src={allImages[currentImageIndex]} 
        alt={`${product.name} - Image ${currentImageIndex + 1}`}
        className={`w-full h-48 object-cover ${product.status === 'sold' ? 'grayscale' : ''}`}
      />
      
      {/* Multiple images indicator and navigation */}
      {allImages.length > 1 && (
        <>
          {/* Navigation arrows */}
          <button
            onClick={prevImage}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-70 transition-opacity"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-70 transition-opacity"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          
          {/* Image counter */}
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-xs">
            {currentImageIndex + 1}/{allImages.length}
          </div>
          
          {/* Dot indicators */}
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
            {allImages.map((_, index) => (
              <button
                key={index}
                onClick={(e) => goToImage(index, e)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentImageIndex 
                    ? 'bg-white' 
                    : 'bg-white bg-opacity-50'
                }`}
              />
            ))}
          </div>
        </>
      )}
      
      {product.status === 'sold' && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
          <div className="bg-white bg-opacity-90 px-4 py-2 rounded-lg">
            <span className="text-gray-800 font-semibold">SOLD OUT</span>
          </div>
        </div>
      )}
    </div>
  )
}

const getDefaultImage = (category: string) => {
  const imageMap: { [key: string]: string } = {
    'electric-electronics': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop',
    'clothes': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
    'sports-equipments': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop',
    'household-supplies': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop',
    'musical-instruments': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
    'food-drinks': 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop',
    'cosmetics': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop',
    'books': 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop',
    'others': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop'
  }
  return imageMap[category] || 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop'
}

const ShopPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryFromUrl = searchParams.get('category')
  const searchFromUrl = searchParams.get('search')
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl || 'all')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState(searchFromUrl || '')
  const [isSearching, setIsSearching] = useState(!!searchFromUrl)
  const { user } = useAuth()

  useEffect(() => {
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl)
      setIsSearching(false)
      setSearchQuery('')
    } else if (searchFromUrl) {
      setSearchQuery(searchFromUrl)
      setIsSearching(true)
      setSelectedCategory('all')
    }
  }, [categoryFromUrl, searchFromUrl])

  useEffect(() => {
    fetchProducts()
  }, [selectedCategory, isSearching, searchQuery])

  const fetchProducts = async () => {
    setLoading(true)
    
    try {
      let query = supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply search filter if searching
      if (isSearching && searchQuery.trim()) {
        // Use ilike for case-insensitive search on name and description
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      } else if (!isSearching && selectedCategory !== 'all') {
        // Apply category filter only when not searching
        const possibleCategoryValues = getCategoryDatabaseValues(selectedCategory)
        query = query.in('category', possibleCategoryValues)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching products:', error)
        throw error
      }

      const productsWithTimeAgo = data?.map(product => ({
        ...product,
        timeAgo: getTimeAgo(product.created_at)
      })) || []

      setProducts(productsWithTimeAgo)

    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setIsSearching(false)
    // Remove search param from URL
    searchParams.delete('search')
    setSearchParams(searchParams)
  }

  const handleCategoryClick = (categoryKey: string) => {
    setSelectedCategory(categoryKey)
    setSearchQuery('')
    setIsSearching(false)
    // Update URL params
    searchParams.delete('search')
    if (categoryKey !== 'all') {
      searchParams.set('category', categoryKey)
    } else {
      searchParams.delete('category')
    }
    setSearchParams(searchParams)
  }

  const handleDelete = async (product: Product) => {
    setProductToDelete(product)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!productToDelete) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id)
        .eq('user_id', user?.id) // Changed from seller_id to user_id

      if (error) throw error

      // Refresh products list
      fetchProducts()
      setDeleteModalOpen(false)
      setProductToDelete(null)
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Failed to delete product')
    }
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`
    return `${Math.floor(diffInMinutes / 1440)} days ago`
  }

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'FREE') return 'FREE'
    return `${currency}${price.toLocaleString()}`
  }

  const getCurrentCategoryLabel = () => {
    if (isSearching) {
      return `Search Results for "${searchQuery}"`
    }
    const category = categories.find(cat => cat.key === selectedCategory)
    return category ? category.label : selectedCategory
  }

  const getCategoryBadgeColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      'clothes': 'bg-purple-100 text-purple-800',
      'Clothes': 'bg-purple-100 text-purple-800',
      'electric-electronics': 'bg-blue-100 text-blue-800',
      'Electric / Electronics': 'bg-blue-100 text-blue-800',
      'Electronics': 'bg-blue-100 text-blue-800',
      'sports-equipments': 'bg-green-100 text-green-800',
      'Sports Equipments': 'bg-green-100 text-green-800',
      'household-supplies': 'bg-yellow-100 text-yellow-800',
      'Household Supplies': 'bg-yellow-100 text-yellow-800',
      'Home & Garden': 'bg-yellow-100 text-yellow-800',
      'musical-instruments': 'bg-pink-100 text-pink-800',
      'Musical Instruments': 'bg-pink-100 text-pink-800',
      'food-drinks': 'bg-orange-100 text-orange-800',
      'Food & Drinks': 'bg-orange-100 text-orange-800',
      'cosmetics': 'bg-red-100 text-red-800',
      'Cosmetics': 'bg-red-100 text-red-800',
      'books': 'bg-indigo-100 text-indigo-800',
      'Books': 'bg-indigo-100 text-indigo-800',
      'others': 'bg-gray-100 text-gray-800',
      'Others': 'bg-gray-100 text-gray-800'
    }
    return colorMap[category] || 'bg-gray-100 text-gray-800'
  }

  const getCategoryDisplayName = (categoryKey: string) => {
    return categoryKey
  }

  const getCategoryDisplayNameForBreadcrumb = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      'clothes': 'CLOTHES',
      'electric-electronics': 'ELECTRIC/ELECTRONICS',
      'sports-equipments': 'SPORTS EQUIPMENTS',
      'household-supplies': 'HOUSEHOLD SUPPLIES',
      'musical-instruments': 'MUSICAL INSTRUMENTS',
      'food-drinks': 'FOOD & DRINKS',
      'cosmetics': 'COSMETICS',
      'books': 'BOOKS',
      'others': 'OTHERS'
    }
    return categoryMap[category] || category.toUpperCase()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header variant="shop" />
      
      <div className="flex">
        {/* Standardized Sidebar - Matching ProductDetailPage */}
        <div className="w-64 bg-[#B91C1C] min-h-screen">
          <div className="p-6">
            <h2 className="text-white text-xl font-bold mb-6">CATEGORY</h2>
            <nav className="space-y-2">
              {categories.map((category) => (
                <button
                  key={category.key}
                  onClick={() => handleCategoryClick(category.key)}
                  className={`block w-full text-left px-4 py-3 transition-colors font-medium ${
                    selectedCategory === category.key && !isSearching ? 'bg-red-700 text-white' : ''
                  } ${category.key === 'all' ? 'text-white hover:bg-red-700 mb-4' : 'text-white hover:bg-red-700'}`}
                >
                  {category.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content - Matching ProductDetailPage Layout */}
        <div className="flex-1 p-8">
          {/* Breadcrumb - Matching ProductDetailPage Style */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
            <span className="hover:text-[#B91C1C] cursor-pointer">SHOP</span>
            {!isSearching && selectedCategory !== 'all' && (
              <>
                <span>/</span>
                <span className="text-gray-900">{getCategoryDisplayNameForBreadcrumb(selectedCategory)}</span>
              </>
            )}
            {isSearching && (
              <>
                <span>/</span>
                <span className="text-gray-900">SEARCH RESULTS</span>
              </>
            )}
          </div>

          {/* Content Container - Matching ProductDetailPage */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900">
                {getCurrentCategoryLabel()}
              </h1>
              <Link
                to="/seller"
                className="flex items-center gap-2 bg-[#B91C1C] text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                SELL ITEM
              </Link>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-gray-500">Loading products...</div>
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-64">
                <div className="text-gray-500 text-lg mb-2">
                  {isSearching 
                    ? `No products found for "${searchQuery}"`
                    : selectedCategory === 'all' 
                      ? 'No products found' 
                      : `No products found in ${getCurrentCategoryLabel()}`
                  }
                </div>
                <p className="text-gray-400 text-sm">
                  {isSearching 
                    ? 'Try searching with different keywords'
                    : 'Be the first to sell an item!'
                  }
                </p>
                {isSearching && (
                  <button
                    onClick={clearSearch}
                    className="mt-4 text-[#B91C1C] hover:text-red-700 underline"
                  >
                    Clear search and browse all products
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="mb-6 text-sm text-gray-600">
                  {products.length} {products.length === 1 ? 'item' : 'items'} found
                  {isSearching 
                    ? ` for "${searchQuery}"`
                    : selectedCategory !== 'all' 
                      ? ` in ${getCurrentCategoryLabel()}`
                      : ''
                  }
                  {isSearching && (
                    <button
                      onClick={clearSearch}
                      className="ml-4 text-[#B91C1C] hover:text-red-700 underline"
                    >
                      Clear search
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow relative group border ${
                        product.status === 'sold' ? 'opacity-75' : ''
                      }`}
                    >
                      {/* Sold Badge */}
                      {product.status === 'sold' && (
                        <div className="absolute top-2 left-2 z-20 bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          SOLD
                        </div>
                      )}

                      {/* Edit/Delete buttons for product owner */}
                      {user?.id === product.seller_id && (
                        <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            to={`/edit-product/${product.id}`}
                            className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-100 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </Link>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleDelete(product)
                            }}
                            className="bg-white p-2 rounded-lg shadow-md hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      )}
                      
                      <Link to={`/product/${product.id}`}>
                        <ProductImageCarousel 
                          product={product} 
                          className="aspect-w-4 aspect-h-3 relative"
                        />
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className={`font-medium line-clamp-2 flex-1 ${
                              product.status === 'sold' ? 'text-gray-500' : 'text-gray-900'
                            }`}>
                              {product.name}
                            </h3>
                            <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getCategoryBadgeColor(product.category)} whitespace-nowrap`}>
                              {getCategoryDisplayName(product.category)}
                            </span>
                          </div>
                          <p className={`font-bold text-lg ${
                            product.status === 'sold' 
                              ? 'text-gray-500' 
                              : product.currency === 'FREE' 
                                ? 'text-green-600' 
                                : 'text-gray-900'
                          }`}>
                            {formatPrice(product.price, product.currency)}
                          </p>
                          <div className="flex justify-between items-center mt-2">
                            <span className={`text-sm ${product.status === 'sold' ? 'text-gray-400' : 'text-gray-500'}`}>
                              {formatLocation(product.location)}
                            </span>
                            <span className={`text-sm ${product.status === 'sold' ? 'text-gray-400' : 'text-gray-500'}`}>
                              {product.timeAgo}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Delete Product</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{productToDelete?.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setDeleteModalOpen(false)
                  setProductToDelete(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShopPage
