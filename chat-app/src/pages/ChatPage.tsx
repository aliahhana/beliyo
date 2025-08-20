import React from 'react'
import './ChatPage.css'

const ChatPage = () => {
  return (
    <div className="chat-page">
      <header className="chat-header">
        <img src="https://via.placeholder.com/50" alt="User Avatar" className="avatar" />
        <span className="username">gentel_man</span>
      </header>
      <div className="chat-options">
        <button className="option-button">Shop for Items</button>
        <button className="option-button">Exchange Money</button>
        <button className="option-button">Do Mission</button>
      </div>
      <div className="chat-messages">
        <div className="message">Clicked 'Do Mission'</div>
        <div className="message response">
          Mission accepted! Hey, <strong>gentel_man</strong>. I'm here to help you complete your request—can you share the details?
        </div>
      </div>
      <footer className="chat-footer">
        <button className="add-button">+</button>
        <input type="text" placeholder="Type something..." className="message-input" />
        <button className="send-button">➤</button>
      </footer>
    </div>
  )
}

export default ChatPage
