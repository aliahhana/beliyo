import React, { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { Plus, Edit2, Trash2, CheckCircle, ChevronLeft, ChevronRight, Search, ChevronDown, X } from 'lucide-react'
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
  { key: 'all', label: 'All Products' },
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
  const navigate = useNavigate()
  const categoryFromUrl = searchParams.get('category')
  const searchFromUrl = searchParams.get('search')
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl || 'all')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState(searchFromUrl || '')
  const [isSearching, setIsSearching] = useState(!!searchFromUrl)
  const [isMobile, setIsMobile] = useState(false)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const { user } = useAuth()

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
    setShowCategoryDropdown(false)
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

  const handleSearch = (query: string) => {
    if (query.trim()) {
      setSearchQuery(query.trim())
      setIsSearching(true)
      setSelectedCategory('all')
      setShowSearchModal(false)
      setShowCategoryDropdown(false)
      // Update URL params
      searchParams.delete('category')
      searchParams.set('search', query.trim())
      setSearchParams(searchParams)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) {
      handleSearch(searchInput.trim())
      setSearchInput('')
    }
  }

  const handleBeliYoClick = () => {
    navigate('/')
  }

  const handleShopHeaderClick = () => {
    navigate('/shop')
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

  // Mobile category chips for horizontal scrolling
  const mobileCategoryChips = [
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

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 pb-16">
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
            <button 
              onClick={handleShopHeaderClick}
              className="text-xl font-medium hover:text-red-200 transition-colors"
            >
              Shop
            </button>
            <button 
              onClick={() => setShowSearchModal(true)}
              className="hover:text-red-200 transition-colors"
            >
              <Search className="w-6 h-6" />
            </button>
          </div>
          
          {/* Category dropdown trigger */}
          <div className="px-4 pb-2">
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="flex items-center gap-2 text-white"
            >
              <ChevronRight className="w-5 h-5" />
              <span className="font-medium">CATEGORY</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} />
            </button>
          </div>
          
          {/* Category horizontal scroll */}
          <div className="px-4 pb-4">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide">
              {mobileCategoryChips.map((category) => (
                <button
                  key={category.key}
                  onClick={() => handleCategoryClick(category.key)}
                  className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category.key && !isSearching
                      ? 'bg-white text-[#B91C1C]'
                      : 'bg-red-700 text-white hover:bg-red-600'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
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
                {isSearching && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        Current search: "{searchQuery}"
                      </span>
                      <button
                        onClick={clearSearch}
                        className="text-sm text-[#B91C1C] hover:text-red-700 underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Category dropdown overlay */}
        {showCategoryDropdown && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowCategoryDropdown(false)}>
            <div className="bg-white mt-32 mx-4 rounded-lg shadow-lg max-h-96 overflow-y-auto">
              {categories.map((category) => (
                <button
                  key={category.key}
                  onClick={() => handleCategoryClick(category.key)}
                  className={`block w-full text-left px-4 py-3 hover:bg-gray-50 ${
                    selectedCategory === category.key && !isSearching ? 'bg-red-50 text-[#B91C1C] font-medium' : 'text-gray-900'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sell Items Button - Mobile Only */}
        <div className="px-4 py-3 bg-white border-b border-gray-200">
          <Link
            to="/seller"
            className="flex items-center justify-center gap-2 bg-[#B91C1C] text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors w-full"
          >
            <Plus className="w-5 h-5" />
            SELL ITEMS
          </Link>
        </div>

        {/* Main Content */}
        <div className="p-4">
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
            <div className="grid grid-cols-2 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className={`bg-white rounded-lg shadow-md overflow-hidden relative group ${
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
                    <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        to={`/edit-product/${product.id}`}
                        className="bg-white p-1.5 rounded-lg shadow-md hover:bg-gray-100 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Edit2 className="w-3 h-3 text-gray-600" />
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleDelete(product)
                        }}
                        className="bg-white p-1.5 rounded-lg shadow-md hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </button>
                    </div>
                  )}
                  
                  <Link to={`/product/${product.id}`}>
                    <ProductImageCarousel 
                      product={product} 
                      className="aspect-square relative"
                    />
                    <div className="p-3">
                      <h3 className={`font-medium text-sm line-clamp-2 mb-1 ${
                        product.status === 'sold' ? 'text-gray-500' : 'text-gray-900'
                      }`}>
                        {product.name}
                      </h3>
                      <p className={`font-bold text-lg mb-1 ${
                        product.status === 'sold' 
                          ? 'text-gray-500' 
                          : product.currency === 'FREE' 
                            ? 'text-green-600' 
                            : 'text-gray-900'
                      }`}>
                        {formatPrice(product.price, product.currency)}
                      </p>
                      <div className="flex justify-between items-center text-xs">
                        <span className={`${product.status === 'sold' ? 'text-gray-400' : 'text-gray-500'} truncate flex-1 mr-2`}>
                          {formatLocation(product.location)}
                        </span>
                        <span className={`${product.status === 'sold' ? 'text-gray-400' : 'text-gray-500'} whitespace-nowrap`}>
                          {product.timeAgo}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
          <div className="flex justify-around py-2">
            <Link to="/shop" className="flex flex-col items-center py-2 px-3 text-[#B91C1C] font-medium">
              <span className="text-xl mb-1">🏪</span>
              <span className="text-xs">Shop</span>
            </Link>
            <Link to="/money-exchange" className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#B91C1C] transition-colors">
              <span className="text-xl mb-1">🔄</span>
              <span className="text-xs font-medium">Exchange</span>
            </Link>
            <Link to="/chat" className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#B91C1C] transition-colors">
              <span className="text-xl mb-1">💬</span>
              <span className="text-xs font-medium">Chats</span>
            </Link>
            <Link to="/mission" className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#B91C1C] transition-colors">
              <span className="text-xl mb-1">🎯</span>
              <span className="text-xs font-medium">Mission</span>
            </Link>
            <Link to="/my-page" className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#B91C1C] transition-colors">
              <span className="text-xl mb-1">👤</span>
              <span className="text-xs font-medium">MyPage</span>
            </Link>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Delete Product</h3>
              <p className="text-gray-600 mb-6 text-sm">
                Are you sure you want to delete "{productToDelete?.name}"? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false)
                    setProductToDelete(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
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

  // Desktop version with title display rebuilt
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
            <button 
              onClick={handleBeliYoClick}
              className="hover:text-[#B91C1C] cursor-pointer transition-colors"
            >
              SHOP
            </button>
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
              <div className="flex-1">
                {/* Title Display */}
                <div className="flex items-center gap-3 mb-4">
                  <Search className="w-6 h-6 text-[#B91C1C]" />
                  <h1 className="text-2xl font-bold text-gray-900">
                    {getCurrentCategoryLabel()}
                  </h1>
                </div>
              </div>
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
                <div className="mb-6 text-sm text-gray-600 flex items-center justify-between">
                  <span>
                    {products.length} {products.length === 1 ? 'item' : 'items'} found
                    {isSearching 
                      ? ` for "${searchQuery}"`
                      : selectedCategory !== 'all' 
                        ? ` in ${getCurrentCategoryLabel()}`
                        : ''
                    }
                  </span>
                  {isSearching && (
                    <button
                      onClick={clearSearch}
                      className="text-[#B91C1C] hover:text-red-700 underline"
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
