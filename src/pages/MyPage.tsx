import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Header'
import { Store, ShoppingCart, RefreshCw, Target, Award, MessageCircle, Users, User, LogIn } from 'lucide-react'

const MyPage: React.FC = () => {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

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
