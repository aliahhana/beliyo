import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import MapComponent from '../components/MapComponent'
import ChatWithSellerButton from '../components/ChatWithSellerButton'
import { Star, ArrowLeft, ChevronLeft, ChevronRight, Search, ChevronDown, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Product {
  id: string
  seller_id: string
  user_id: string
  name: string
  description: string
  price: number
  currency: string
  category: string
  image_url?: string
  images?: string[]
  image_count?: number
  location: string | { address?: string; coordinates?: any }
  condition: number
  status: string
  created_at: string
}

const categories = [
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

// Image carousel component for product detail page
const ProductDetailImageCarousel: React.FC<{ 
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

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length)
  }

  const goToImage = (index: number) => {
    setCurrentImageIndex(index)
  }

  return (
    <div className={`relative ${className}`}>
      <img 
        src={allImages[currentImageIndex]} 
        alt={`${product.name} - Image ${currentImageIndex + 1}`}
        className="w-full rounded-lg object-cover"
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.src = getDefaultImage(product.category)
        }}
      />
      
      {/* Multiple images indicator and navigation */}
      {allImages.length > 1 && (
        <>
          {/* Navigation arrows */}
          <button
            onClick={prevImage}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          
          {/* Image counter */}
          <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
            {currentImageIndex + 1}/{allImages.length}
          </div>
          
          {/* Thumbnail strip at bottom */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 max-w-xs overflow-x-auto">
            {allImages.map((image, index) => (
              <button
                key={index}
                onClick={() => goToImage(index)}
                className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentImageIndex 
                    ? 'border-white shadow-lg' 
                    : 'border-white border-opacity-50 hover:border-opacity-75'
                }`}
              >
                <img
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const getDefaultImage = (category: string) => {
  const imageMap: { [key: string]: string } = {
    'electric-electronics': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&h=400&fit=crop',
    'clothes': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=400&fit=crop',
    'sports-equipments': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop',
    'household-supplies': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop',
    'musical-instruments': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop',
    'food-drinks': 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&h=400&fit=crop',
    'cosmetics': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&h=400&fit=crop',
    'books': 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=400&fit=crop',
    'others': 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&h=400&fit=crop'
  }
  return imageMap[category] || 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=600&h=400&fit=crop'
}

const ProductDetailPage: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
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

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Product not found')
        } else {
          throw error
        }
        return
      }

      setProduct(data)
    } catch (error) {
      console.error('Error fetching product:', error)
      setError('Failed to load product details')
    } finally {
      setLoading(false)
    }
  }

  const renderStars = (condition: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star 
        key={index} 
        className={`w-5 h-5 ${
          index < condition 
            ? 'fill-yellow-400 text-yellow-400' 
            : 'text-gray-300'
        }`} 
      />
    ))
  }

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return 'Free'
    return `${currency}${price.toLocaleString()}`
  }

  const getCategoryDisplayName = (category: string) => {
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

  const handleBeliYoClick = () => {
    navigate('/')
  }

  const handleShopHeaderClick = () => {
    navigate('/shop')
  }

  const handleCategoryClick = (categoryKey: string) => {
    setShowCategoryDropdown(false)
    navigate(`/shop?category=${categoryKey}`)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header variant="shop" />
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading product details...</div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header variant="shop" />
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="text-gray-500 mb-4">{error || 'Product not found'}</div>
            <button
              onClick={() => navigate('/shop')}
              className="text-[#B91C1C] hover:underline flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Shop
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50 pb-16">
        {/* Mobile Header - Matching ShopPage */}
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
                    product.category === category.key
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
                    product.category === category.key ? 'bg-red-50 text-[#B91C1C] font-medium' : 'text-gray-900'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white">
          {/* Breadcrumb */}
          <div className="px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-[#B91C1C] font-medium">
              <span>{getCategoryDisplayName(product.category)}</span>
              <span className="text-gray-900 uppercase">{product.name}</span>
            </div>
          </div>

          {/* Product Content */}
          <div className="px-4 pb-20">
            {/* Product Image and Details Side by Side */}
            <div className="flex gap-4 mb-6">
              {/* Product Image */}
              <div className="w-32 h-32 flex-shrink-0">
                <ProductDetailImageCarousel 
                  product={product}
                  className="w-full h-full"
                />
              </div>
              
              {/* Product Details */}
              <div className="flex-1">
                <h1 className="text-xl font-bold mb-1">{product.name}</h1>
                <p className={`text-lg font-bold mb-2 ${
                  product.price === 0 ? 'text-green-600' : 'text-gray-900'
                }`}>
                  {formatPrice(product.price, product.currency)}
                </p>
                
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-gray-700 text-sm">Condition</span>
                  <div className="flex items-center gap-1">
                    {renderStars(product.condition)}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3 mb-6 text-gray-700 text-sm">
              {product.description.split('\n').map((paragraph, index) => (
                <p key={index}>
                  {paragraph}
                </p>
              ))}
            </div>

            {/* NEW: Dynamic Chat With Seller Button */}
            <div className="mb-6 flex justify-end">
              <ChatWithSellerButton 
                product={{
                  id: product.id,
                  seller_id: product.seller_id || product.user_id,
                  user_id: product.user_id,
                  name: product.name,
                  category: product.category
                }}
                size="md"
                className="w-auto"
              />
            </div>

            {/* Pickup Point Section with Real Map - Added for Mobile */}
            <div className="border-t pt-6">
              <MapComponent 
                location={formatLocation(product.location)} 
                productName={product.name}
              />
            </div>
          </div>
        </div>

        {/* Mobile Bottom Navigation - Matching ShopPage */}
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
            <Link to="/mission-board" className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#B91C1C] transition-colors">
              <span className="text-xl mb-1">🎯</span>
              <span className="text-xs font-medium">Mission</span>
            </Link>
            <Link to="/my-page" className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#B91C1C] transition-colors">
              <span className="text-xl mb-1">👤</span>
              <span className="text-xs font-medium">MyPage</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header variant="shop" />
      
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-[#B91C1C] min-h-screen">
          <div className="p-6">
            <h2 className="text-white text-xl font-bold mb-6">CATEGORY</h2>
            
            {/* All Products Button - Without bg-white */}
            <Link 
              to="/shop"
              className="block w-full text-left px-4 py-3 mb-4 text-white font-medium hover:bg-red-700 transition-colors"
            >
              All Products
            </Link>
            
            <nav className="space-y-2">
              {categories.map((category) => (
                <Link 
                  key={category.key}
                  to={`/shop?category=${category.key}`}
                  className={`block w-full text-left px-4 py-3 text-white transition-colors ${
                    product.category === category.key ? 'bg-red-700' : 'hover:bg-red-700'
                  }`}
                >
                  {category.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
            <Link to="/shop" className="hover:text-[#B91C1C]">SHOP</Link>
            <span>/</span>
            <Link 
              to={`/shop?category=${product.category}`} 
              className="hover:text-[#B91C1C]"
            >
              {getCategoryDisplayName(product.category)}
            </Link>
            <span>/</span>
            <span className="text-gray-900">{product.name.toUpperCase()}</span>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="grid grid-cols-2 gap-12">
              {/* Product Image Carousel */}
              <div>
                <ProductDetailImageCarousel 
                  product={product}
                  className="aspect-w-4 aspect-h-3 relative"
                />
              </div>

              {/* Product Details */}
              <div>
                <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
                <p className={`text-2xl font-bold mb-4 ${
                  product.price === 0 ? 'text-green-600' : 'text-gray-900'
                }`}>
                  {formatPrice(product.price, product.currency)}
                </p>
                
                <div className="flex items-center gap-1 mb-6">
                  <span className="text-gray-700">Condition</span>
                  {renderStars(product.condition)}
                </div>

                <div className="space-y-4 mb-8">
                  {product.description.split('\n').map((paragraph, index) => (
                    <p key={index} className="text-gray-700">
                      {paragraph}
                    </p>
                  ))}
                </div>

                {/* NEW: Dynamic Chat With Seller Button */}
                <div className="mb-8">
                  <ChatWithSellerButton 
                    product={{
                      id: product.id,
                      seller_id: product.seller_id || product.user_id,
                      user_id: product.user_id,
                      name: product.name,
                      category: product.category
                    }}
                    size="lg"
                    className="w-full"
                  />
                </div>

                {/* Pickup Point Section with Real Map */}
                <MapComponent 
                  location={formatLocation(product.location)} 
                  productName={product.name}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetailPage
