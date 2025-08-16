import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import MapComponent from '../components/MapComponent'
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

  const handleCategoryClick = (categoryKey: string) => {
    setShowCategoryDropdown(false)
    navigate(`/shop?category=${categoryKey}`)
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
      <div className="min-h-screen bg-gray-50">
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
            <div className="text-xl font-medium">Shop</div>
            <button className="hover:text-red-200 transition-colors">
              <Search className="w-6 h-6" />
            </button>
          </div>
          
          {/* Category Grid */}
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <ChevronRight className="w-5 h-5" />
              <span className="font-medium">CATEGORY</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-sm">
              <button
                onClick={() => handleCategoryClick('clothes')}
                className={`px-3 py-2 rounded text-center transition-colors ${
                  product.category === 'clothes'
                    ? 'bg-white text-[#B91C1C] font-medium'
                    : 'bg-red-700 text-white hover:bg-red-600'
                }`}
              >
                Clothes
              </button>
              <button
                onClick={() => handleCategoryClick('electric-electronics')}
                className={`px-3 py-2 rounded text-center transition-colors ${
                  product.category === 'electric-electronics'
                    ? 'bg-white text-[#B91C1C] font-medium'
                    : 'bg-red-700 text-white hover:bg-red-600'
                }`}
              >
                <div>Electric /</div>
                <div className="underline">Electronics</div>
              </button>
              <button
                onClick={() => handleCategoryClick('sports-equipments')}
                className={`px-3 py-2 rounded text-center transition-colors ${
                  product.category === 'sports-equipments'
                    ? 'bg-white text-[#B91C1C] font-medium'
                    : 'bg-red-700 text-white hover:bg-red-600'
                }`}
              >
                <div>Sports</div>
                <div>Equipments</div>
              </button>
              <button
                onClick={() => handleCategoryClick('household-supplies')}
                className={`px-3 py-2 rounded text-center transition-colors ${
                  product.category === 'household-supplies'
                    ? 'bg-white text-[#B91C1C] font-medium'
                    : 'bg-red-700 text-white hover:bg-red-600'
                }`}
              >
                <div>Household</div>
                <div>Supplies</div>
              </button>
              <button
                onClick={() => handleCategoryClick('musical-instruments')}
                className={`px-3 py-2 rounded text-center transition-colors ${
                  product.category === 'musical-instruments'
                    ? 'bg-white text-[#B91C1C] font-medium'
                    : 'bg-red-700 text-white hover:bg-red-600'
                }`}
              >
                <div>Musical</div>
                <div>Instruments</div>
              </button>
              <button
                onClick={() => handleCategoryClick('food-drinks')}
                className={`px-3 py-2 rounded text-center transition-colors ${
                  product.category === 'food-drinks'
                    ? 'bg-white text-[#B91C1C] font-medium'
                    : 'bg-red-700 text-white hover:bg-red-600'
                }`}
              >
                Food &amp; Drinks
              </button>
              <button
                onClick={() => handleCategoryClick('cosmetics')}
                className={`px-3 py-2 rounded text-center transition-colors ${
                  product.category === 'cosmetics'
                    ? 'bg-white text-[#B91C1C] font-medium'
                    : 'bg-red-700 text-white hover:bg-red-600'
                }`}
              >
                Cosmetics
              </button>
            </div>
          </div>
        </div>

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

            {/* Chat Button */}
            <button className="bg-[#B91C1C] text-white px-6 py-3 rounded font-medium hover:bg-red-700 transition-colors float-right mb-6">
              CHAT WITH SELLER
            </button>
            <div className="clear-both"></div>

            {/* Pickup Point Section */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-[#B91C1C] mb-4">Pickup Point</h3>
              <div className="bg-gray-100 p-4 rounded">
                <div className="mb-2">
                  <div className="text-sm text-gray-700 mb-1">Address: {formatLocation(product.location)}</div>
                  <div className="text-sm text-blue-500">Link to Address: https://kakaomap/xxxx</div>
                </div>
                <MapComponent 
                  location={formatLocation(product.location)} 
                  productName={product.name}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#B91C1C] text-white">
          <div className="flex justify-around items-center py-3">
            <button 
              onClick={() => navigate('/shop')}
              className="flex flex-col items-center gap-1 hover:text-red-200 transition-colors"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M19 7H16V6C16 3.79 14.21 2 12 2S8 3.79 8 6V7H5C3.9 7 3 7.9 3 9V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V9C21 7.9 20.1 7 19 7ZM10 6C10 4.9 10.9 4 12 4S14 4.9 14 6V7H10V6ZM19 20H5V9H7V11C7 11.55 7.45 12 8 12S9 11.55 9 12V11H15V12C15 12.55 15.45 13 16 13S17 12.55 17 12V11H19V20Z"/>
                </svg>
              </div>
              <span className="text-xs">Shop</span>
            </button>
            <button className="flex flex-col items-center gap-1 hover:text-red-200 transition-colors">
              <div className="w-6 h-6 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2ZM4 14L5 17H7L6 14H4ZM9 14L10 17H12L11 14H9ZM14 14L15 17H17L16 14H14ZM19 14L20 17H22L21 14H19Z"/>
                </svg>
              </div>
              <span className="text-xs">Exchange</span>
            </button>
            <button className="flex flex-col items-center gap-1 hover:text-red-200 transition-colors">
              <div className="w-6 h-6 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z"/>
                </svg>
              </div>
              <span className="text-xs">Chats</span>
            </button>
            <button className="flex flex-col items-center gap-1 hover:text-red-200 transition-colors">
              <div className="w-6 h-6 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M19 3H18V1H16V3H8V1H6V3H5C3.89 3 3.01 3.9 3.01 5L3 19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V8H19V19ZM7 10H12V15H7V10Z"/>
                </svg>
              </div>
              <span className="text-xs">Mission</span>
            </button>
            <button 
              onClick={() => navigate('/my-page')}
              className="flex flex-col items-center gap-1 hover:text-red-200 transition-colors"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H9L3 7V9H21ZM12 10C8.69 10 6 12.69 6 16S8.69 22 12 22 18 19.31 18 16 15.31 10 12 10Z"/>
                </svg>
              </div>
              <span className="text-xs">MyPage</span>
            </button>
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
              🔍 All Products
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

                <button className="bg-[#B91C1C] text-white px-8 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors w-full mb-8">
                  CHAT WITH SELLER
                </button>

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
