import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { currencyService } from '../services/currencyService'
import Header from '../components/Header'
import { ShoppingCart, MessageCircle, Target, Store, User, LogIn, Package, RefreshCw, Edit, Trash2, Eye, EyeOff, Plus, ChevronDown, AlertTriangle, Search, X } from 'lucide-react'

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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
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

  const handleDeleteProduct = async (product: Product) => {
    setProductToDelete(product)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!productToDelete || !user) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id)
        .eq('user_id', user.id)

      if (error) throw error
      
      // Update will happen via real-time subscription
      // But we can optimistically update the UI
      setProducts(products.filter(p => p.id !== productToDelete.id))
      setSelectedProducts(selectedProducts.filter(id => id !== productToDelete.id))
      setDeleteModalOpen(false)
      setProductToDelete(null)
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

  const handleBulkDelete = () => {
    if (selectedProducts.length === 0) {
      alert('Please select products to delete')
      return
    }
    setBulkDeleteModalOpen(true)
  }

  const confirmBulkDelete = async () => {
    if (!user || selectedProducts.length === 0) return

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', selectedProducts)
        .eq('user_id', user.id)

      if (error) throw error
      
      // Optimistically update the UI
      setProducts(products.filter(p => !selectedProducts.includes(p.id)))
      setSelectedProducts([])
      setBulkDeleteModalOpen(false)
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
    const soldProducts = products.filter(p => p.is_sold)
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
    { icon: RefreshCw, label: 'Exchange History', path: '/exchange-history' },
    { icon: Target, label: 'Mission', path: '/mission-history' },
    { icon: MessageCircle, label: 'Chat List', path: '/chat-list' }
  ]

  const activeProducts = products.filter(p => !p.is_sold)
  const soldProducts = products.filter(p => p.is_sold)
  const displayProducts = activeTab === 'active' ? activeProducts : soldProducts

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
            <div className="text-xl font-medium">My Shop</div>
            <button 
              onClick={() => setShowSearchModal(true)}
              className="hover:text-red-200 transition-colors"
            >
              <Search className="w-6 h-6" />
            </button>
          </div>
          
          {/* Navigation Grid - 2 Rows Structure */}
          <div className="px-4 pb-4">
            <div className="space-y-4 text-sm">
              {/* Row 1 - 3 items */}
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => navigate('/my-shop')}
                  className="flex flex-col items-center gap-2 p-3 text-white hover:bg-red-700 transition-colors bg-red-700"
                >
                  <Store className="w-6 h-6" />
                  <span className="font-medium text-xs">My Shop</span>
                </button>
                
                <button 
                  onClick={() => navigate('/my-page')}
                  className="flex flex-col items-center gap-2 p-3 text-white hover:bg-red-700 transition-colors"
                >
                  <ShoppingCart className="w-6 h-6" />
                  <span className="font-medium text-xs">Purchase History</span>
                </button>
                
                <button 
                  onClick={() => navigate('/my-page')}
                  className="flex flex-col items-center gap-2 p-3 text-white hover:bg-red-700 transition-colors"
                >
                  <RefreshCw className="w-6 h-6" />
                  <span className="font-medium text-xs">Exchange History</span>
                </button>
              </div>
              
              {/* Row 2 - 2 items centered */}
              <div className="flex justify-center gap-2">
                <button 
                  onClick={() => navigate('/my-page')}
                  className="flex flex-col items-center gap-2 p-3 text-white hover:bg-red-700 transition-colors w-1/3"
                >
                  <Target className="w-6 h-6" />
                  <span className="font-medium text-xs">Mission</span>
                </button>
                
                <button 
                  onClick={() => navigate('/my-page')}
                  className="flex flex-col items-center gap-2 p-3 text-white hover:bg-red-700 transition-colors w-1/3"
                >
                  <MessageCircle className="w-6 h-6" />
                  <span className="font-medium text-xs">Chat List</span>
                </button>
              </div>
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

        {/* Main Content */}
        <div className="bg-gray-100 pb-20">
          {/* Stats Cards */}
          <div className="bg-white px-4 py-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-gray-900">{products.length}</div>
                <div className="text-xs text-gray-600">Total Products</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-green-600">{activeProducts.length}</div>
                <div className="text-xs text-gray-600">Active Listings</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-red-600">{soldProducts.length}</div>
                <div className="text-xs text-gray-600">Sold Items</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center relative">
                <div className="text-lg font-bold text-blue-600">
                  {formatTotalSales()}
                </div>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-xs text-gray-600">Total Sales</span>
                  <button
                    onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                    className="text-xs bg-gray-200 hover:bg-gray-300 rounded px-1 transition-colors"
                  >
                    {salesCurrency}
                  </button>
                </div>
                
                {showCurrencyDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                    <button
                      onClick={() => handleCurrencyChange('KRW')}
                      className={`block w-full px-3 py-2 text-left text-xs hover:bg-gray-50 transition-colors ${
                        salesCurrency === 'KRW' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                      }`}
                    >
                      ₩ KRW
                    </button>
                    <button
                      onClick={() => handleCurrencyChange('MYR')}
                      className={`block w-full px-3 py-2 text-left text-xs hover:bg-gray-50 transition-colors ${
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

          {/* Tabs */}
          <div className="bg-white mt-2 px-4 py-4">
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setActiveTab('active')}
                className={`pb-2 px-1 font-medium text-sm transition-colors ${
                  activeTab === 'active'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Active ({activeProducts.length})
              </button>
              <button
                onClick={() => setActiveTab('sold')}
                className={`pb-2 px-1 font-medium text-sm transition-colors ${
                  activeTab === 'sold'
                    ? 'text-red-600 border-b-2 border-red-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sold ({soldProducts.length})
              </button>
            </div>
            
            <div className="flex justify-between items-center">
              {selectedProducts.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">
                    {selectedProducts.length} selected
                  </span>
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              )}
              <button
                onClick={() => navigate('/seller')}
                className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors ml-auto"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </button>
            </div>
          </div>

          {/* Products Grid */}
          <div className="px-4 py-4">
            {loading ? (
              <div className="bg-white rounded-lg p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 text-sm">Loading your products...</p>
              </div>
            ) : displayProducts.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center">
                <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {activeTab === 'active' ? 'No Active Listings' : 'No Sold Items'}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {activeTab === 'active' 
                    ? "You haven't listed any products yet."
                    : "You haven't sold any items yet."}
                </p>
                {activeTab === 'active' && (
                  <button
                    onClick={() => navigate('/seller')}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors"
                  >
                    List Your First Product
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Select All */}
                {displayProducts.length > 0 && (
                  <div className="bg-white rounded-lg p-3">
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

                {displayProducts.map((product) => (
                  <div key={product.id} className="bg-white rounded-lg overflow-hidden shadow-sm">
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

                    {/* Product Content */}
                    <div className="flex p-3 gap-3">
                      {/* Product Image */}
                      <div className="relative w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0">
                        {product.images && product.images.length > 0 ? (
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=400'
                            }}
                          />
                        ) : product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.title}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=400'
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        {product.is_sold && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                            <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
                              SOLD
                            </span>
                          </div>
                        )}
                        {product.image_count > 1 && (
                          <div className="absolute top-1 right-1 bg-black bg-opacity-60 text-white px-1 py-0.5 rounded text-xs">
                            +{product.image_count - 1}
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm truncate mb-1">{product.title}</h3>
                        <p className="text-green-600 font-bold text-lg mb-1">
                          {formatPrice(product.price, product.currency)}
                        </p>
                        <div className="flex gap-1 mb-2">
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-xs truncate">{product.category}</span>
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{product.condition}</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">
                          Listed {new Date(product.created_at).toLocaleDateString()}
                        </p>

                        {/* Action Buttons */}
                        <div className="flex gap-1">
                          <button
                            onClick={() => navigate(`/product/${product.id}`)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1 border border-gray-300 text-gray-700 rounded text-xs hover:bg-gray-50 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </button>
                          <button
                            onClick={() => navigate(`/edit-product/${product.id}`)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1 border border-gray-300 text-gray-700 rounded text-xs hover:bg-gray-50 transition-colors"
                          >
                            <Edit className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleSold(product.id, product.is_sold)}
                            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                              product.is_sold
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-yellow-600 text-white hover:bg-yellow-700'
                            }`}
                          >
                            {product.is_sold ? (
                              <>
                                <Eye className="w-3 h-3" />
                                Unmark
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3 h-3" />
                                Sold
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product)}
                            className="flex items-center justify-center gap-1 px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Navigation - Standardized to match other pages */}
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
              className="flex flex-col items-center py-2 px-3 text-[#B91C1C] font-medium"
            >
              <span className="text-xl mb-1">👤</span>
              <span className="text-xs">MyPage</span>
            </button>
          </div>
        </div>

        {/* Single Delete Confirmation Modal */}
        {deleteModalOpen && productToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Delete Product</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete "<span className="font-semibold">{productToDelete.title}</span>"? 
                This action cannot be undone.
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setDeleteModalOpen(false)
                    setProductToDelete(null)
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Product
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Delete Confirmation Modal */}
        {bulkDeleteModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Delete Multiple Products</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <span className="font-semibold">{selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''}</span>? 
                This action cannot be undone.
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setBulkDeleteModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBulkDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete {selectedProducts.length} Product{selectedProducts.length > 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

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
                      <button
                        onClick={() => handleDeleteProduct(product)}
                        className="flex items-center justify-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Single Delete Confirmation Modal */}
      {deleteModalOpen && productToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Product</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "<span className="font-semibold">{productToDelete.title}</span>"? 
              This action cannot be undone.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setDeleteModalOpen(false)
                  setProductToDelete(null)
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Multiple Products</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-semibold">{selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''}</span>? 
              This action cannot be undone.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setBulkDeleteModalOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete {selectedProducts.length} Product{selectedProducts.length > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyShopPage
