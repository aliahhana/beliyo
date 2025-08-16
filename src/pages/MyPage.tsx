import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Header'
import { Store, ShoppingCart, RefreshCw, Target, Award, MessageCircle, Users, User, LogIn, Search } from 'lucide-react'

const MyPage: React.FC = () => {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])

  // Show login prompt if not authenticated
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
              Please sign in to access your profile, order history, and personalized settings.
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
    { icon: Store, label: 'My Shop', path: '/my-shop' },
    { icon: ShoppingCart, label: 'Purchase History', path: '/my-page', active: true },
    { icon: RefreshCw, label: 'Exchange History', path: '/my-page' },
    { icon: Target, label: 'Mission', path: '/my-page' },
    { icon: Award, label: 'Badges', path: '/my-page' },
    { icon: MessageCircle, label: 'Chat List', path: '/my-page' },
    { icon: Users, label: 'Chingu List', path: '/my-page' }
  ]

  const handleMyPageClick = () => {
    // Navigate to MyPage with correct path
    navigate('/my-page')
  }

  const handleBeliYoClick = () => {
    navigate('/')
  }

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
            <div className="text-xl font-medium">MY PAGE</div>
            <button className="hover:text-red-200 transition-colors">
              <Search className="w-6 h-6" />
            </button>
          </div>
          
          {/* Navigation Grid */}
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {/* Row 1 */}
              <button className="flex items-center gap-3 p-3 text-white hover:bg-red-700 transition-colors">
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7Z"/>
                  </svg>
                </div>
                <span className="font-medium">Purchase<br />History</span>
              </button>
              
              <button className="flex items-center gap-3 p-3 text-white hover:bg-red-700 transition-colors">
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M12 2L15.09 8.26L22 9L15.09 9.74L12 16L8.91 9.74L2 9L8.91 8.26L12 2Z"/>
                  </svg>
                </div>
                <span className="font-medium">Badges</span>
              </button>
              
              <button className="flex items-center gap-3 p-3 text-white hover:bg-red-700 transition-colors">
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z"/>
                  </svg>
                </div>
                <span className="font-medium">Chingu<br />Lists</span>
              </button>
              
              {/* Row 2 */}
              <button className="flex items-center gap-3 p-3 text-white hover:bg-red-700 transition-colors">
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z"/>
                  </svg>
                </div>
                <span className="font-medium">Chat<br />Lists</span>
              </button>
              
              <button className="flex items-center gap-3 p-3 text-white hover:bg-red-700 transition-colors">
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M19 3H18V1H16V3H8V1H6V3H5C3.89 3 3.01 3.9 3.01 5L3 19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V8H19V19ZM7 10H12V15H7V10Z"/>
                  </svg>
                </div>
                <span className="font-medium">Mission</span>
              </button>
              
              <button 
                onClick={() => navigate('/my-shop')}
                className="flex items-center gap-3 p-3 text-white hover:bg-red-700 transition-colors"
              >
                <div className="w-8 h-8 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                    <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2ZM4 14L5 17H7L6 14H4ZM9 14L10 17H12L11 14H9ZM14 14L15 17H17L16 14H14ZM19 14L20 17H22L21 14H19Z"/>
                  </svg>
                </div>
                <span className="font-medium">My Shop</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-gray-100 pb-20">
          {/* User Header */}
          <div className="bg-white px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-black">Hi, *{profile?.user_id || 'user name'}*!</h2>
                  <p className="text-red-600 italic text-sm">"Back on duty - time to be someone's hero!"</p>
                </div>
              </div>
              <div className="flex items-center justify-center w-16 h-16 bg-red-600 rounded-full relative">
                <span className="text-white text-2xl font-bold">16</span>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full"></div>
                <span className="absolute -bottom-2 text-xs text-red-600 font-medium">Badges</span>
              </div>
            </div>
          </div>

          {/* Purchase History */}
          <div className="bg-white mt-2 px-4 py-6">
            <h3 className="text-xl font-bold text-red-600 mb-4">Purchase History</h3>
            <div className="border-b border-gray-200 pb-2 mb-4">
              <p className="font-semibold text-gray-900">13-8-2025 (Order No: 123)</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-20 h-16 bg-gray-800 rounded-lg"></div>
              <div>
                <h4 className="font-semibold text-gray-900">Mouse Pad</h4>
                <p className="text-green-600 font-medium">Free</p>
                <p className="text-sm text-gray-600">Purchase from: id_seller</p>
              </div>
            </div>
          </div>

          {/* Current Accomplishments */}
          <div className="bg-white mt-2 px-4 py-6">
            <h3 className="text-xl font-bold text-red-600 mb-4">Current Accomplishments</h3>
            <div className="border border-gray-300 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">🦸</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-700">Snack Rescuer!</h4>
                  <p className="text-sm text-gray-600">Bought Mamee for fortune_seeker.1</p>
                </div>
              </div>
              <p className="text-red-500 italic text-center text-sm">Add more badges by completing missions!</p>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {/* Chingu Lists */}
            <div className="bg-white px-4 py-6">
              <h3 className="text-xl font-bold text-red-600 mb-4">Chingu Lists</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-400 rounded-full"></div>
                    <span className="font-medium text-gray-900 text-sm">Im_Alive</span>
                  </div>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">Online</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-400 rounded-full"></div>
                    <span className="font-medium text-gray-900 text-sm">Pot@to_Min</span>
                  </div>
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">Offline</span>
                </div>
              </div>
            </div>

            {/* Ongoing Missions */}
            <div className="bg-white px-4 py-6">
              <h3 className="text-xl font-bold text-red-600 mb-4">Ongoing Missions</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-800 rounded-full"></div>
                  <div className="bg-white border-2 border-gray-300 rounded-lg p-2 relative text-xs">
                    <p className="text-gray-700">"Please buy me KA's sambal Nyet"</p>
                    <div className="absolute -bottom-1 left-2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-300"></div>
                  </div>
                </div>
                <button className="bg-red-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-700 transition-colors">
                  CHAT
                </button>
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
    <div className="min-h-screen bg-gray-100">
      <Header variant="shop" />
      
      <div className="flex">
        {/* Red Sidebar */}
        <div className="w-64 bg-[#B91C1C] min-h-screen">
          <div className="p-6">
            <h1 
              onClick={handleMyPageClick}
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
          {/* User Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-black">Hi, *{profile?.user_id || 'user name'}*!</h2>
              <p className="text-red-600 italic">"Back on duty - time to be someone's hero!"</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-8">
              {/* Purchase History */}
              <div>
                <h3 className="text-xl font-bold text-red-600 mb-4">Purchase History</h3>
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="border-b border-gray-200 pb-4 mb-4">
                    <p className="font-semibold text-gray-900">13-8-2025 (Order No: 123)</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-16 bg-gray-800 rounded-lg"></div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Mouse Pad</h4>
                      <p className="text-green-600 font-medium">Free</p>
                      <p className="text-sm text-gray-600">Purchase from: id_seller</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chingu Lists */}
              <div>
                <h3 className="text-xl font-bold text-red-600 mb-4">Chingu Lists</h3>
                <div className="bg-white rounded-lg p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-yellow-400 rounded-full"></div>
                      <span className="font-medium text-gray-900">Nobody_nobody_but_U</span>
                    </div>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">Online</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-400 rounded-full"></div>
                      <span className="font-medium text-gray-900">Pot@to_Min</span>
                    </div>
                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">Offline</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              {/* Current Accomplishments */}
              <div>
                <h3 className="text-xl font-bold text-red-600 mb-4">Current Accomplishments</h3>
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">🦸</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-700">Snack Rescuer!</h4>
                      <p className="text-sm text-gray-600">Bought Mamee for fortune_seeker.1</p>
                    </div>
                  </div>
                  
                  <p className="text-red-500 italic text-center mb-2">Add more badges by completing missions!</p>
                  <p className="text-center font-bold text-lg">OR</p>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <p className="text-red-500 text-sm">Accomplishments: 0, Sass level: 100</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                        <span className="text-sm text-gray-600">It's quiet... too quiet...</span>
                        <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                      </div>
                    </div>
                    <div className="w-16 h-16 bg-orange-400 rounded-lg"></div>
                  </div>
                </div>
              </div>

              {/* Ongoing Missions */}
              <div>
                <h3 className="text-xl font-bold text-red-600 mb-4">Ongoing Missions</h3>
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-800 rounded-full"></div>
                      <div className="bg-white border-2 border-gray-300 rounded-lg p-2 relative">
                        <p className="text-sm text-gray-700">"Please buy me KA's sambal Nyet"</p>
                        <div className="absolute -bottom-2 left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-300"></div>
                      </div>
                    </div>
                    <button className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors">
                      CHAT
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MyPage
