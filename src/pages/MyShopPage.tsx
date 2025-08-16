import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { currencyService } from '../services/currencyService'
import Header from '../components/Header'
import { ShoppingCart, Award, Users, MessageCircle, Target, Store, User, LogIn, Package, RefreshCw, Edit, Trash2, Eye, EyeOff, Plus, ChevronDown } from 'lucide-react'

interface Product {
  id: string
  user_id: string
  title: string
  name: string
  description: string
  price: number
  currency: string
  category: string
  condition: string
  images: string[]
  image_url: string | null
  image_count: number
  is_sold: boolean
  location: {
    address: string
    coordinates: {
      lat: number
      lng: number
    }
  }
  status: string
  created_at: string
  updated_at: string
}

const MyShopPage: React.FC = () => {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'active' | 'sold'>('active')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [salesCurrency, setSalesCurrency] = useState<'KRW' | 'MYR'>('KRW')
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false)
  const [exchangeRate, setExchangeRate] = useState<number>(322.58) // Default KRW to MYR rate

  useEffect(() => {
    if (!user) {
      navigate('/login')
    } else {
      fetchUserProducts()
      fetchExchangeRate()
      // Set up real-time subscription
      const subscription = supabase
        .channel('products_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'products',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            handleRealtimeUpdate(payload)
          }
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [user, navigate])

  const fetchExchangeRate = async () => {
    try {
      const rate = await currencyService.getExchangeRate('₩', 'RM')
      setExchangeRate(rate)
    } catch (error) {
      console.error('Error fetching exchange rate:', error)
      // Use fallback rate
      setExchangeRate(0.0031)
    }
  }

  const fetchUserProducts = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching products:', error)
        throw error
      }

      // Transform the data to ensure consistency
      const transformedProducts = (data || []).map(product => ({
        ...product,
        title: product.title || product.name || 'Untitled Product',
        images: product.images || (product.image_url ? [product.image_url] : []),
        image_count: product.image_count || (product.images ? product.images.length : (product.image_url ? 1 : 0)),
        condition: product.condition || 'Good',
        is_sold: product.is_sold || product.status === 'sold',
        location: product.location || { address: '', coordinates: { lat: 0, lng: 0 } },
        currency: product.currency || '₩'
      }))

      setProducts(transformedProducts)
    } catch (error) {
      console.error('Error fetching products:', error)
      // Show user-friendly error message
      alert('Failed to load your products. Please try refreshing the page.')
    } finally {
      setLoading(false)
    }
  }

  const handleRealtimeUpdate = (payload: any) => {
    if (payload.eventType === 'INSERT') {
      // Add new product to the list
      const newProduct = {
        ...payload.new,
        title: payload.new.title || payload.new.name || 'Untitled Product',
        images: payload.new.images || (payload.new.image_url ? [payload.new.image_url] : []),
        image_count: payload.new.image_count || 0,
        condition: payload.new.condition || 'Good',
        is_sold: payload.new.is_sold || payload.new.status === 'sold',
        location: payload.new.location || { address: '', coordinates: { lat: 0, lng: 0 } }
      }
      setProducts(prev => [newProduct, ...prev])
    } else if (payload.eventType === 'UPDATE') {
      // Update existing product
      setProducts(prev => prev.map(product => 
        product.id === payload.new.id 
          ? {
              ...payload.new,
              title: payload.new.title || payload.new.name || 'Untitled Product',
              images: payload.new.images || (payload.new.image_url ? [payload.new.image_url] : []),
              image_count: payload.new.image_count || 0,
              condition: payload.new.condition || 'Good',
              is_sold: payload.new.is_sold || payload.new.status === 'sold',
              location: payload.new.location || { address: '', coordinates: { lat: 0, lng: 0 } }
            }
          : product
      ))
    } else if (payload.eventType === 'DELETE') {
      // Remove deleted product
      setProducts(prev => prev.filter(product => product.id !== payload.old.id))
      setSelectedProducts(prev => prev.filter(id => id !== payload.old.id))
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('user_id', user?.id)

      if (error) throw error
      
      // Update will happen via real-time subscription
      // But we can optimistically update the UI
      setProducts(products.filter(p => p.id !== productId))
      setSelectedProducts(selectedProducts.filter(id => id !== productId))
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Failed to delete product. Please try again.')
    }
  }

  const handleToggleSold = async (productId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          is_sold: !currentStatus,
          status: !currentStatus ? 'sold' : 'available'
        })
        .eq('id', productId)
        .eq('user_id', user?.id)

      if (error) throw error
      
      // Optimistically update the UI
      setProducts(products.map(p => 
        p.id === productId 
          ? { ...p, is_sold: !currentStatus, status: !currentStatus ? 'sold' : 'available' } 
          : p
      ))
    } catch (error) {
      console.error('Error updating product status:', error)
      alert('Failed to update product status. Please try again.')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) {
      alert('Please select products to delete')
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedProducts.length} product(s)?`)) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', selectedProducts)
        .eq('user_id', user?.id)

      if (error) throw error
      
      // Optimistically update the UI
      setProducts(products.filter(p => !selectedProducts.includes(p.id)))
      setSelectedProducts([])
    } catch (error) {
      console.error('Error deleting products:', error)
      alert('Failed to delete products. Please try again.')
    }
  }

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  const selectAllProducts = () => {
    const filteredProducts = activeTab === 'active' 
      ? products.filter(p => !p.is_sold)
      : products.filter(p => p.is_sold)
    
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([])
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id))
    }
  }

  const formatPrice = (price: number, currency: string) => {
    if (currency === 'FREE') return 'FREE'
    const symbol = currency === '₩' ? '₩' : currency === 'RM' ? 'RM ' : '$'
    return `${symbol}${price.toLocaleString()}`
  }

  // Calculate total sales with currency conversion
  const calculateTotalSales = () => {
    const totalInKRW = soldProducts.reduce((sum, p) => {
      if (p.currency === 'FREE') return sum
      
      // Convert everything to KRW first
      let priceInKRW = p.price
      if (p.currency === 'RM') {
        // Convert MYR to KRW
        priceInKRW = p.price / exchangeRate
      } else if (p.currency === '$') {
        // Assume 1 USD = 1300 KRW for demo
        priceInKRW = p.price * 1300
      }
      
      return sum + priceInKRW
    }, 0)

    // Convert to selected currency
    if (salesCurrency === 'MYR') {
      return totalInKRW * exchangeRate
    }
    
    return totalInKRW
  }

  const formatTotalSales = () => {
    const total = calculateTotalSales()
    
    if (salesCurrency === 'KRW') {
      return `₩${total.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}`
    } else {
      return `RM ${total.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
  }

  const handleCurrencyChange = (currency: 'KRW' | 'MYR') => {
    setSalesCurrency(currency)
    setShowCurrencyDropdown(false)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header variant="shop" />
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <LogIn className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Sign In Required</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Please sign in to access your shop and manage your products.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate('/login')}
                className="bg-red-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const sidebarItems = [
    { icon: Store, label: 'My Shop', path: '/my-shop', active: true },
    { icon: ShoppingCart, label: 'Purchase History', path: '/my-page' },
    { icon: RefreshCw, label: 'Exchange History', path: '/my-page' },
    { icon: Target, label: 'Mission', path: '/my-page' },
    { icon: Award, label: 'Badges', path: '/my-page' },
    { icon: MessageCircle, label: 'Chat List', path: '/my-page' },
    { icon: Users, label: 'Chingu List', path: '/my-page' }
  ]

  const activeProducts = products.filter(p => !p.is_sold)
  const soldProducts = products.filter(p => p.is_sold)
  const displayProducts = activeTab === 'active' ? activeProducts : soldProducts

  return (
    <div className="min-h-screen bg-gray-100">
      <Header variant="shop" />
      
      <div className="flex">
        {/* Red Sidebar */}
        <div className="w-64 bg-[#B91C1C] min-h-screen">
          <div className="p-6">
            <h1 
              onClick={() => navigate('/my-page')}
              className="text-white text-xl font-bold mb-6 cursor-pointer hover:opacity-90 transition-opacity"
            >
              MY PAGE
            </h1>
            
            <div className="space-y-2">
              {sidebarItems.map((item, index) => {
                const Icon = item.icon
                return (
                  <div
                    key={index}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-3 p-3 text-white hover:bg-red-700 transition-colors cursor-pointer ${
                      item.active ? 'bg-red-700' : ''
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">My Shop</h2>
            <p className="text-gray-600">Manage your products and track your sales</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{products.length}</div>
              <div className="text-sm text-gray-600">Total Products</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-green-600">{activeProducts.length}</div>
              <div className="text-sm text-gray-600">Active Listings</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-red-600">{soldProducts.length}</div>
              <div className="text-sm text-gray-600">Sold Items</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm relative">
              <div className="text-2xl font-bold text-blue-600">
                {formatTotalSales()}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Total Sales</span>
                <div className="relative">
                  <button
                    onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                  >
                    <span className="font-medium">{salesCurrency}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  
                  {showCurrencyDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                      <button
                        onClick={() => handleCurrencyChange('KRW')}
                        className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                          salesCurrency === 'KRW' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        ₩ KRW
                      </button>
                      <button
                        onClick={() => handleCurrencyChange('MYR')}
                        className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                          salesCurrency === 'MYR' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        RM MYR
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs and Actions */}
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="border-b border-gray-200">
              <div className="flex items-center justify-between p-4">
                <div className="flex gap-6">
                  <button
                    onClick={() => setActiveTab('active')}
                    className={`pb-2 px-1 font-medium transition-colors ${
                      activeTab === 'active'
                        ? 'text-red-600 border-b-2 border-red-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Active Listings ({activeProducts.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('sold')}
                    className={`pb-2 px-1 font-medium transition-colors ${
                      activeTab === 'sold'
                        ? 'text-red-600 border-b-2 border-red-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Sold Items ({soldProducts.length})
                  </button>
                </div>
                
                <div className="flex items-center gap-3">
                  {selectedProducts.length > 0 && (
                    <>
                      <span className="text-sm text-gray-600">
                        {selectedProducts.length} selected
                      </span>
                      <button
                        onClick={handleBulkDelete}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Selected
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => navigate('/seller')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Product
                  </button>
                </div>
              </div>
            </div>

            {/* Select All Checkbox */}
            {displayProducts.length > 0 && (
              <div className="p-4 border-b border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === displayProducts.length && displayProducts.length > 0}
                    onChange={selectAllProducts}
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-600">Select All</span>
                </label>
              </div>
            )}
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading your products...</p>
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {activeTab === 'active' ? 'No Active Listings' : 'No Sold Items'}
              </h3>
              <p className="text-gray-600 mb-6">
                {activeTab === 'active' 
                  ? "You haven't listed any products yet."
                  : "You haven't sold any items yet."}
              </p>
              {activeTab === 'active' && (
                <button
                  onClick={() => navigate('/seller')}
                  className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  List Your First Product
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {/* Selection Checkbox */}
                  <div className="p-3 border-b border-gray-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => toggleProductSelection(product.id)}
                        className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                      />
                      <span className="text-sm text-gray-600">Select</span>
                    </label>
                  </div>

                  {/* Product Image */}
                  <div className="relative h-48 bg-gray-100">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=400'
                        }}
                      />
                    ) : product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=400'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    {product.is_sold && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-lg">
                          SOLD
                        </span>
                      </div>
                    )}
                    {product.image_count > 1 && (
                      <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
                        +{product.image_count - 1} photos
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1 truncate">{product.title}</h3>
                    <p className="text-green-600 font-bold text-lg mb-2">
                      {formatPrice(product.price, product.currency)}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <span className="bg-gray-100 px-2 py-1 rounded truncate">{product.category}</span>
                      <span className="bg-gray-100 px-2 py-1 rounded">{product.condition}</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                      Listed {new Date(product.created_at).toLocaleDateString()}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/product/${product.id}`)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                      <button
                        onClick={() => navigate(`/edit-product/${product.id}`)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleSold(product.id, product.is_sold)}
                        className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors text-sm ${
                          product.is_sold
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-yellow-600 text-white hover:bg-yellow-700'
                        }`}
                      >
                        {product.is_sold ? (
                          <>
                            <Eye className="w-4 h-4" />
                            Unmark
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-4 h-4" />
                            Sold
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MyShopPage
