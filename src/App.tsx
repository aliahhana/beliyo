import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignUpPage'
import ShopPage from './pages/ShopPage'
import SellerPage from './pages/SellerPage'
import EditProductPage from './pages/EditProductPage'
import ProductDetailPage from './pages/ProductDetailPage'
import MoneyExchangePage from './pages/MoneyExchangePage'
import MyPage from './pages/MyPage'
import MyShopPage from './pages/MyShopPage'
import './index.css'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/seller" element={<SellerPage />} />
          <Route path="/edit-product/:id" element={<EditProductPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/money-exchange" element={<MoneyExchangePage />} />
          <Route path="/my-page" element={<MyPage />} />
          <Route path="/my-shop" element={<MyShopPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
