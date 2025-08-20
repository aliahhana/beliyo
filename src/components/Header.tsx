import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, User, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface HeaderProps {
  variant?: 'home' | 'shop'
}

const Header: React.FC<HeaderProps> = ({ variant = 'home' }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const isShop = location.pathname.includes('/shop') || location.pathname.includes('/product')
  const isMoneyExchange = location.pathname.includes('/money-exchange')
  const isMyPage = location.pathname.includes('/my-page')
  const isMissionBoard = location.pathname.includes('/mission-board')

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Navigate to shop page with search query
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  const handleContactClick = (type: string) => {
    console.log(`Contact type selected: ${type}`)
    setContactDropdownOpen(false)
    // You can add navigation or modal opening logic here
    // For example: navigate(`/contact/${type}`)
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setContactDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <header className="bg-white shadow-sm h-16">
      <div className="flex items-center h-full">
        {/* Logo Section */}
        <Link to="/" className="bg-white px-6 h-full flex items-center border-r">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <span className="text-2xl font-bold text-red-600">BeliYo!</span>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <div className="flex flex-1 h-full">
          {variant === 'home' ? (
            <>
              <Link to="/" className="bg-[#B91C1C] text-white px-8 flex items-center font-medium">
                Home
              </Link>
              <div className="bg-gray-100 px-8 flex items-center font-medium flex-1 text-center justify-center">
                Features Information
              </div>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setContactDropdownOpen(!contactDropdownOpen)}
                  className="bg-gray-100 px-8 h-16 flex items-center font-medium text-center justify-center gap-2 hover:bg-gray-200 transition-colors"
                >
                  Contact Us
                  <ChevronDown className={`w-4 h-4 transition-transform ${contactDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Dropdown Menu */}
                {contactDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 py-2 min-w-[150px] z-50">
                    <button
                      onClick={() => handleContactClick('inquiry')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors capitalize"
                    >
                      Inquiry
                    </button>
                    <button
                      onClick={() => handleContactClick('feedback')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors capitalize"
                    >
                      Feedback
                    </button>
                    <button
                      onClick={() => handleContactClick('report')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors capitalize"
                    >
                      Report
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link 
                to="/shop" 
                className={`px-8 flex items-center font-medium ${isShop ? 'bg-[#B91C1C] text-white' : 'bg-gray-100'}`}
              >
                Shop
              </Link>
              <Link 
                to="/money-exchange" 
                className={`px-8 flex items-center font-medium ${isMoneyExchange ? 'bg-[#B91C1C] text-white' : 'bg-gray-100'}`}
              >
                Money Exchange
              </Link>
              <Link 
                to="/mission-board" 
                className={`px-8 flex items-center font-medium flex-1 text-center justify-center ${isMissionBoard ? 'bg-[#B91C1C] text-white' : 'bg-gray-100'}`}
              >
                Mission Board
              </Link>
            </>
          )}
        </div>

        {/* Right Section */}
        <div className="bg-[#B91C1C] px-6 h-full flex items-center gap-4">
          {/* Direct Search Input */}
          <form onSubmit={handleSearch} className="flex items-center">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="bg-white rounded-md pl-3 pr-10 py-2 w-[200px] text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-red-600"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>
          
          {user ? (
            <div className="flex items-center gap-3">
              <Link 
                to="/my-page"
                className={`text-white text-sm hover:text-red-100 transition-colors ${isMyPage ? 'font-bold' : ''}`}
              >
                <span className="font-medium">{profile?.user_id || 'User'}</span>
              </Link>
              <Link 
                to="/my-page"
                className="bg-black text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-gray-800 transition-colors"
              >
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">MY PAGE</span>
              </Link>
              <button 
                onClick={handleSignOut}
                className="bg-white/20 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-white/30 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">LOGOUT</span>
              </button>
            </div>
          ) : (
            <Link 
              to="/login"
              className="bg-black text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-gray-800 transition-colors"
            >
              <User className="w-4 h-4" />
              <span className="text-sm font-medium">LOGIN</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
