import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

// Import pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import ShopPage from './pages/ShopPage'
import ProductDetailPage from './pages/ProductDetailPage'
import MoneyExchangePage from './pages/MoneyExchangePage'
import MoneyExchangeChatPage from './pages/MoneyExchangeChatPage'
import ChatPage from './pages/ChatPage'
import MissionBoardPage from './pages/MissionBoardPage'
import AddMissionPage from './pages/AddMissionPage'
import MyPage from './pages/MyPage'
import RequestExchangePage from './pages/RequestExchangePage'
import EditExchangePage from './pages/EditExchangePage'
import MyShopPage from './pages/MyShopPage'
import ExchangeHistoryPage from './pages/ExchangeHistoryPage'
import ChatListPage from './pages/ChatListPage'
import SellerPage from './pages/SellerPage'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            
            {/* Protected routes */}
            <Route path="/shop" element={
              <ProtectedRoute>
                <ShopPage />
              </ProtectedRoute>
            } />
            <Route path="/product/:id" element={
              <ProtectedRoute>
                <ProductDetailPage />
              </ProtectedRoute>
            } />
            <Route path="/money-exchange" element={
              <ProtectedRoute>
                <MoneyExchangePage />
              </ProtectedRoute>
            } />
            
            {/* Seller Route - ADDED */}
            <Route path="/seller" element={
              <ProtectedRoute>
                <SellerPage />
              </ProtectedRoute>
            } />
            
            {/* Money Exchange Chat Routes - Updated for dynamic routing */}
            <Route path="/chat/exchange/:exchangeId" element={
              <ProtectedRoute>
                <MoneyExchangeChatPage />
              </ProtectedRoute>
            } />
            
            {/* Product Chat Routes */}
            <Route path="/chat/:productId?" element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            } />
            
            <Route path="/mission-board" element={
              <ProtectedRoute>
                <MissionBoardPage />
              </ProtectedRoute>
            } />
            <Route path="/mission" element={
              <ProtectedRoute>
                <MissionBoardPage />
              </ProtectedRoute>
            } />
            
            {/* Add Mission Route - ADDED */}
            <Route path="/add-mission" element={
              <ProtectedRoute>
                <AddMissionPage />
              </ProtectedRoute>
            } />
            
            <Route path="/my-page" element={
              <ProtectedRoute>
                <MyPage />
              </ProtectedRoute>
            } />
            
            {/* My Shop Route */}
            <Route path="/my-shop" element={
              <ProtectedRoute>
                <MyShopPage />
              </ProtectedRoute>
            } />
            
            {/* Exchange History Route */}
            <Route path="/exchange-history" element={
              <ProtectedRoute>
                <ExchangeHistoryPage />
              </ProtectedRoute>
            } />
            
            {/* Chat List Route */}
            <Route path="/chat-list" element={
              <ProtectedRoute>
                <ChatListPage />
              </ProtectedRoute>
            } />
            
            <Route path="/request-exchange" element={
              <ProtectedRoute>
                <RequestExchangePage />
              </ProtectedRoute>
            } />
            <Route path="/edit-exchange/:id" element={
              <ProtectedRoute>
                <EditExchangePage />
              </ProtectedRoute>
            } />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
