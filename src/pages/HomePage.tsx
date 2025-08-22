import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { ArrowRight, Search, User } from 'lucide-react'

const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleUserIconClick = () => {
    navigate('/my-page')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Header - Hidden on Mobile */}
      <div className="hidden md:block">
        <Header variant="home" />
      </div>
      
      {/* Mobile Layout */}
      <div className="md:hidden pb-16">
        {/* Mobile Header */}
        <div className="bg-[#B91C1C] px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <img src="https://imgur.com/zxuU9XH" alt="Logo" className="w-8 h-8" />
              </div>
              <span className="text-white text-xl font-bold">BeliYo!</span>
            </div>
            
            {/* Search and Profile */}
            <div className="flex items-center gap-3">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white rounded-md pl-3 pr-10 py-2 w-32 text-sm placeholder-gray-500 focus:outline-none"
                />
                <button 
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 hover:text-gray-700 transition-colors"
                >
                  <Search className="w-4 h-4 text-gray-500" />
                </button>
              </form>
              <button 
                onClick={handleUserIconClick}
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <User className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="bg-white border-b">
          <div className="flex">
            <div className="bg-[#B91C1C] text-white px-6 py-3 text-sm font-medium">
              Home
            </div>
            <div className="bg-gray-100 text-gray-700 px-6 py-3 text-sm font-medium flex-1 text-center">
              Features Information
            </div>
            <div className="bg-gray-100 text-gray-700 px-6 py-3 text-sm font-medium">
              Contact Us
            </div>
          </div>
        </div>

        {/* Mobile Hero Section */}
        <div className="relative">
          <div className="h-64 relative overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&h=600&fit=crop" 
              alt="Money background"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent"></div>
            
            <div className="absolute inset-0 flex flex-col justify-center px-6">
              <h1 className="text-white text-2xl font-bold leading-tight mb-4">
                CURRENCY<br />
                TENGAH NAIK NI<br />
                TUKAR CEPAT !
              </h1>
            </div>
          </div>
          
          {/* CTA Section */}
          <div className="bg-gray-100 px-6 py-4 flex items-center justify-between">
            <span className="text-gray-800 text-sm font-medium">
              Brighten up your style with our bold and fun new arrivals
            </span>
            <Link 
              to="/shop"
              className="bg-[#B91C1C] text-white p-2 hover:bg-red-700 transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Mobile Feature Cards Grid */}
        <div className="p-4 space-y-4">
          {/* Shop and Money Exchange Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Shop Card */}
            <Link to="/shop" className="group relative overflow-hidden rounded-lg shadow-lg aspect-square">
              <img 
                src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop" 
                alt="Shop"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="bg-[#B91C1C] text-white px-4 py-2 flex items-center justify-between group-hover:bg-red-700 transition-colors">
                  <span className="font-bold text-sm">SHOP</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>

            {/* Money Exchange Card */}
            <Link to="/money-exchange" className="group relative overflow-hidden rounded-lg shadow-lg aspect-square">
              <img 
                src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&h=400&fit=crop" 
                alt="Money Exchange"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="bg-[#B91C1C] text-white px-4 py-2 flex items-center justify-between group-hover:bg-red-700 transition-colors">
                  <span className="font-bold text-xs">MONEY EXCHANGE</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </div>

          {/* Mission and My Page Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Mission Card */}
            <Link to="/mission-board" className="group relative overflow-hidden rounded-lg shadow-lg aspect-square">
              <img 
                src="https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=400&h=400&fit=crop" 
                alt="Mission"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="bg-[#B91C1C] text-white px-4 py-2 flex items-center justify-between group-hover:bg-red-700 transition-colors">
                  <span className="font-bold text-sm">MISSION</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>

            {/* My Page Card */}
            <Link to="/my-page" className="group relative overflow-hidden rounded-lg shadow-lg aspect-square">
              <img 
                src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop" 
                alt="My Page"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="bg-[#B91C1C] text-white px-4 py-2 flex items-center justify-between group-hover:bg-red-700 transition-colors">
                  <span className="font-bold text-sm">MY PAGE</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden">
          <div className="flex justify-around py-2">
            <Link to="/shop" className="flex flex-col items-center py-2 px-3 text-gray-600 hover:text-[#B91C1C] transition-colors">
              <span className="text-xl mb-1">🏪</span>
              <span className="text-xs font-medium">Shop</span>
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

      {/* Desktop Layout - Hidden on Mobile */}
      <div className="hidden md:flex h-[calc(100vh-64px)]">
        {/* Left Section - Hero */}
        <div className="w-1/2 relative">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://apicms.thestar.com.my/uploads/images/2024/10/22/2978595.webp" 
              alt="Money background"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent"></div>
          </div>
          
          <div className="relative z-10 h-full flex flex-col justify-center px-12">
            <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
              CARI. <br />
              JUAL. <br />
              BELIYO!
            </h1>
            <p className="text-white text-lg mb-8 max-w-md">
              From students, to students. 
            </p>
            <Link 
              to="/shop"
              className="self-start bg-[#B91C1C] text-white p-4 hover:bg-red-700 transition-colors"
            >
              <ArrowRight className="w-8 h-8" />
            </Link>
          </div>
        </div>

        {/* Right Section - Feature Cards Grid */}
        <div className="w-1/2 bg-white p-8">
          <div className="grid grid-cols-2 gap-6 h-full">
            {/* Shop Card */}
            <Link to="/shop" className="group relative overflow-hidden rounded-lg shadow-lg">
              <img 
                src="https://pixabay.com/photos/squirrel-shopping-hazelnut-8132645/" 
                alt="Shop"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <button className="bg-[#B91C1C] text-white px-6 py-3 w-full font-medium flex items-center justify-between group-hover:bg-red-700 transition-colors">
                  SHOP
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </Link>

            {/* Money Exchange Card */}
            <Link to="/money-exchange" className="group relative overflow-hidden rounded-lg shadow-lg">
              <img 
                src="https://pixabay.com/photos/don-saved-payment-money-tax-gold-1264858/" 
                alt="Money Exchange"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <button className="bg-[#B91C1C] text-white px-6 py-3 w-full font-medium flex items-center justify-between group-hover:bg-red-700 transition-colors">
                  MONEY EXCHANGE
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </Link>

            {/* Mission Card */}
            <Link to="/mission-board" className="group relative overflow-hidden rounded-lg shadow-lg">
              <img 
                src="https://pixabay.com/photos/arrows-quiver-archery-bow-4082046/" 
                alt="Mission"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <button className="bg-[#B91C1C] text-white px-6 py-3 w-full font-medium flex items-center justify-between group-hover:bg-red-700 transition-colors">
                  MISSION
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </Link>

            {/* My Page Card */}
            <Link to="/my-page" className="group relative overflow-hidden rounded-lg shadow-lg">
              <img 
                src="https://pixabay.com/photos/black-red-suit-tie-clothing-2597198/" 
                alt="My Page"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <button className="bg-[#B91C1C] text-white px-6 py-3 w-full font-medium flex items-center justify-between group-hover:bg-red-700 transition-colors">
                  MY PAGE
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage
