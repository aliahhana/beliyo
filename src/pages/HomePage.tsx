import React from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import { ArrowRight } from 'lucide-react'

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header variant="home" />
      
      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Section - Hero */}
        <div className="w-1/2 relative">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=1200&h=900&fit=crop" 
              alt="Money background"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent"></div>
          </div>
          
          <div className="relative z-10 h-full flex flex-col justify-center px-12">
            <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
              CURRENCY<br />
              TENGAH NAIK NI<br />
              TUKAR CEPAT !
            </h1>
            <p className="text-white text-lg mb-8 max-w-md">
              Brighten up your style with our bold and fun new arrivals
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
                src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop" 
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
                src="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&h=400&fit=crop" 
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
            <div className="group relative overflow-hidden rounded-lg shadow-lg">
              <img 
                src="https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=400&h=400&fit=crop" 
                alt="Mission"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <button className="bg-[#B91C1C] text-white px-6 py-3 w-full font-medium flex items-center justify-between group-hover:bg-red-700 transition-colors">
                  MISSION
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* My Page Card */}
            <Link to="/my-page" className="group relative overflow-hidden rounded-lg shadow-lg">
              <img 
                src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop" 
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
