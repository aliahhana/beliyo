import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, User, Menu, X, LogIn, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface HeaderProps {
  variant?: 'default' | 'home'
}

const Header: React.FC<HeaderProps> = ({ variant = 'default' }) => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, signOut } = useAuth()

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleUserIconClick = () => {
    navigate('/my-page')
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const handleAuthClick = async () => {
    if (user) {
      // User is logged in, perform logout
      await signOut()
      navigate('/')
    } else {
      // User is not logged in, navigate to login page
      navigate('/login')
    }
  }

  return (
    <header className="bg-[#B91C1C] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src="https://i.imgur.com/zxuU9XH.png" alt="BeliYo Logo" className="w-10 h-10" />
            <span className="text-2xl font-bold">BeliYo!</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-7">
            <Link to="/" className="hover:text-gray-200 transition-colors font-medium">
              Home
            </Link>
            <Link 
              to="/features-information" 
              className="hover:text-gray-200 transition-colors font-medium"
            >
              Features Information
            </Link>
            <Link to="/shop" className="hover:text-gray-200 transition-colors font-medium">
              Shop
            </Link>
            <Link to="/money-exchange" className="hover:text-gray-200 transition-colors font-medium">
              Money Exchange
            </Link>
            <Link to="/mission-board" className="hover:text-gray-200 transition-colors font-medium">
              Mission Board
            </Link>
            <Link to="/my-page" className="hover:text-gray-200 transition-colors font-medium">
              My Page
            </Link>
          </nav>

          {/* Desktop Search, User, and Auth */}
          <div className="hidden md:flex items-center gap-4">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white text-gray-900 rounded-md pl-4 pr-10 py-2 w-64 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
              <button 
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
            <button 
              onClick={handleUserIconClick}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <User className="w-5 h-5" />
            </button>
            <button 
              onClick={handleAuthClick}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-md hover:bg-white/30 transition-colors font-medium"
            >
              {user ? (
                <>
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </>
              )}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/20 py-4">
            <nav className="flex flex-col space-y-4">
              <Link 
                to="/" 
                className="hover:text-gray-200 transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/features-information" 
                className="hover:text-gray-200 transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Features Information
              </Link>
              <Link 
                to="/shop" 
                className="hover:text-gray-200 transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Shop
              </Link>
              <Link 
                to="/money-exchange" 
                className="hover:text-gray-200 transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Money Exchange
              </Link>
              <Link 
                to="/mission-board" 
                className="hover:text-gray-200 transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Mission Board
              </Link>
              <Link 
                to="/my-page" 
                className="hover:text-gray-200 transition-colors font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                My Page
              </Link>
            </nav>
            
            {/* Mobile Search */}
            <form onSubmit={handleSearchSubmit} className="mt-4 relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white text-gray-900 rounded-md pl-4 pr-10 py-2 w-full placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
              <button 
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>

            {/* Mobile Auth Button */}
            <button 
              onClick={handleAuthClick}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/20 rounded-md hover:bg-white/30 transition-colors font-medium"
            >
              {user ? (
                <>
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Login</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
