import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ShoppingBag, RefreshCw, Target, MessageCircle, User, Shield, Clock, Heart } from 'lucide-react'

const FeaturesInformationPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="md:hidden bg-[#B91C1C] px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-white hover:text-gray-200 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold">Features Information</h1>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block bg-[#B91C1C] px-8 py-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-white hover:text-gray-200 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-2xl font-bold">Features Information</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 md:px-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src="https://i.imgur.com/zxuU9XH.png" alt="BeliYo Logo" className="w-12 h-12" />
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800">BeliYo!</h2>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            From students, to students. A comprehensive marketplace platform designed to help students buy, sell, exchange, and connect with each other.
          </p>
          <p className="text-xl font-semibold text-[#B91C1C] mt-4">#KitaJagaKita</p>
        </div>

        {/* Main Features Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Shop Feature */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#B91C1C] rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Shop</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Browse and purchase items from fellow students. From textbooks to electronics, find everything you need at student-friendly prices.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#B91C1C] rounded-full"></div>
                Browse products by category
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#B91C1C] rounded-full"></div>
                Search and filter functionality
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#B91C1C] rounded-full"></div>
                Direct chat with sellers
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#B91C1C] rounded-full"></div>
                Secure transaction process
              </li>
            </ul>
          </div>

          {/* Money Exchange Feature */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#B91C1C] rounded-lg flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Money Exchange</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Exchange currencies with other students at fair rates. Perfect for international students or those traveling abroad.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#B91C1C] rounded-full"></div>
                Post exchange requests
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#B91C1C] rounded-full"></div>
                Real-time exchange rates
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#B91C1C] rounded-full"></div>
                Safe meetup coordination
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#B91C1C] rounded-full"></div>
                Transaction history tracking
              </li>
            </ul>
          </div>

          {/* Mission Board Feature */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#B91C1C] rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Mission Board</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Post tasks or find opportunities to earn extra income. From tutoring to delivery services, connect with students who need help.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#B91C1C] rounded-full"></div>
                Create and browse missions
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#B91C1C] rounded-full"></div>
                Set your own rates
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#B91C1C] rounded-full"></div>
                Skill-based matching
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#B91C1C] rounded-full"></div>
                Rating and review system
              </li>
            </ul>
          </div>

          {/* Chat System Feature */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-[#B91C1C] rounded-lg flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">Chat System</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Communicate directly with other students for all your transactions. Built-in messaging system for seamless coordination.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#B91C1C] rounded-full"></div>
                Real-time messaging
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#B91C1C] rounded-full"></div>
                Image and file sharing
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#B91C1C] rounded-full"></div>
                Transaction-specific chats
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#B91C1C] rounded-full"></div>
                Message history
              </li>
            </ul>
          </div>
        </div>

        {/* Additional Features */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Why Choose BeliYo?</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#B91C1C] rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-bold text-gray-800 mb-2">Safe & Secure</h4>
              <p className="text-sm text-gray-600">
                Built with student safety in mind. Verified users and secure transaction processes.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#B91C1C] rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-bold text-gray-800 mb-2">24/7 Available</h4>
              <p className="text-sm text-gray-600">
                Access the platform anytime, anywhere. Perfect for busy student schedules.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#B91C1C] rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h4 className="font-bold text-gray-800 mb-2">Student Community</h4>
              <p className="text-sm text-gray-600">
                By students, for students. Building a supportive community ecosystem.
              </p>
            </div>
          </div>
        </div>

        {/* My Page Feature */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#B91C1C] rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800">My Page</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Manage your entire BeliYo experience from one central dashboard. Track your activities, manage listings, and view your transaction history.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#B91C1C] rounded-full"></div>
                Profile management
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#B91C1C] rounded-full"></div>
                My shop dashboard
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#B91C1C] rounded-full"></div>
                Exchange history
              </li>
            </ul>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#B91C1C] rounded-full"></div>
                Mission history
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#B91C1C] rounded-full"></div>
                Account settings
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#B91C1C] rounded-full"></div>
                Transaction analytics
              </li>
            </ul>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-[#B91C1C] text-white rounded-lg p-8">
          <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
          <p className="mb-6 text-lg">
            Join the BeliYo community today and start connecting with fellow students!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/shop" 
              className="bg-white text-[#B91C1C] px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Start Shopping
            </Link>
            <Link 
              to="/signup" 
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-[#B91C1C] transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation - Same as HomePage */}
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
  )
}

export default FeaturesInformationPage
