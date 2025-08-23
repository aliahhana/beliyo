import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'

// Pages
import HomePage from './pages/HomePage'
import FeaturesInformationPage from './pages/FeaturesInformationPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import ShopPage from './pages/ShopPage'
import ProductDetailPage from './pages/ProductDetailPage'
import MoneyExchangePage from './pages/MoneyExchangePage'
import RequestExchangePage from './pages/RequestExchangePage'
import EditExchangePage from './pages/EditExchangePage'
import MissionBoardPage from './pages/MissionBoardPage'
import AddMissionPage from './pages/AddMissionPage'
import EditMissionPage from './pages/EditMissionPage'
import MyPage from './pages/MyPage'
import MyShopPage from './pages/MyShopPage'
import EditProductPage from './pages/EditProductPage'
import ExchangeHistoryPage from './pages/ExchangeHistoryPage'
import SellerPage from './pages/SellerPage'
import PurchaseHistoryPage from './pages/PurchaseHistoryPage'
import MissionHistoryPage from './pages/MissionHistoryPage'

// Updated Chat Pages - Now using Unified 1:1 Chat System
import ChatListPage from './pages/ChatListPage'
import UnifiedChatPage from './pages/UnifiedChatPage'
import ItemChatPage from './pages/ItemChatPage'

// Legacy chat pages - now redirect to unified system
import ChatPage from './pages/ChatPage'
import MoneyExchangeChatPage from './pages/MoneyExchangeChatPage'

// Custom Toast Component to replace react-hot-toast
import Toast from './components/Toast'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Main Pages */}
            <Route path="/" element={<HomePage />} />
            <Route path="/features-information" element={<FeaturesInformationPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/seller" element={<SellerPage />} />
            
            {/* Product Detail Routes */}
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/shop/product/:id" element={<ProductDetailPage />} />
            
            {/* Edit Product Route */}
            <Route path="/edit-product/:id" element={<EditProductPage />} />
            
            <Route path="/money-exchange" element={<MoneyExchangePage />} />
            <Route path="/request-exchange" element={<RequestExchangePage />} />
            
            {/* Edit Exchange Route */}
            <Route path="/edit-exchange/:id" element={<EditExchangePage />} />
            
            <Route path="/mission-board" element={<MissionBoardPage />} />
            <Route path="/add-mission" element={<AddMissionPage />} />
            
            {/* Edit Mission Route */}
            <Route path="/edit-mission/:missionId" element={<EditMissionPage />} />
            
            <Route path="/missions" element={<MissionBoardPage />} />
            <Route path="/mission" element={<MissionBoardPage />} />
            <Route path="/my-page" element={<MyPage />} />
            <Route path="/my-shop" element={<MyShopPage />} />
            <Route path="/exchange-history" element={<ExchangeHistoryPage />} />
            <Route path="/purchase-history" element={<PurchaseHistoryPage />} />
            <Route path="/mission-history" element={<MissionHistoryPage />} />

            {/* Chat System Routes */}
            <Route path="/chat-list" element={<ChatListPage />} />
            
            {/* NEW: Item-Specific Chat Route */}
            <Route path="/chat/item/:encodedItemCode/:sellerId" element={<ItemChatPage />} />
            
            {/* Unified Chat Routes */}
            <Route path="/chat/shop/:id/:otherUserId" element={<UnifiedChatPage />} />
            <Route path="/chat/exchange/:id/:otherUserId" element={<UnifiedChatPage />} />
            <Route path="/chat/mission/:id/:otherUserId" element={<UnifiedChatPage />} />
            <Route path="/chat/general/:otherUserId" element={<UnifiedChatPage />} />

            {/* NEW: Seller Reply Route - allows seller to access buyer conversations */}
            <Route path="/seller-chat/shop/:id/:buyerId" element={<UnifiedChatPage />} />
            <Route path="/seller-chat/exchange/:id/:buyerId" element={<UnifiedChatPage />} />
            <Route path="/seller-chat/mission/:id/:buyerId" element={<UnifiedChatPage />} />
            <Route path="/seller-chat/general/:buyerId" element={<UnifiedChatPage />} />

            {/* Legacy Chat Routes - Handle legacy routes properly */}
            <Route path="/chat/:productId" element={<ChatPage />} />
            <Route path="/chat/product/:productId/:otherUserId" element={<UnifiedChatPage />} />
            <Route path="/chat/exchange/:exchangeId/:otherUserId?" element={<MoneyExchangeChatPage />} />

            {/* Redirect old chat routes to new system */}
            <Route path="/chat" element={<Navigate to="/chat-list" replace />} />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Custom Toast Container */}
          <Toast />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
