import React from 'react'
import { Link } from 'react-router-dom'

const Navigation: React.FC = () => {
  return (
    <nav>
      <ul>
        <li><Link to="/shop">Shop</Link></li>
        <li><Link to="/money-exchange">Money Exchange</Link></li>
        <li><Link to="/mission-board">Mission Board</Link></li>
        <li><Link to="/my-page">My Page</Link></li>
        <li><Link to="/chat">Chat</Link></li>
        <li><Link to="/purchase-history">Purchase History</Link></li>
      </ul>
    </nav>
  )
}

export default Navigation
