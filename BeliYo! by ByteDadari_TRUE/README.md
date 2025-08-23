# BELIYO_V4 - Real-Time Chat System

A comprehensive web application with real-time chat functionality for money exchange requests, built with React, TypeScript, and Supabase.

## 🚀 Features

### Real-Time Chat System
- **Bidirectional Communication**: Instant message delivery between multiple users
- **Connection Management**: Automatic reconnection with exponential backoff
- **Message Reliability**: Optimistic updates with retry mechanisms
- **Typing Indicators**: Real-time typing status for enhanced UX
- **User Presence**: Online/offline status tracking
- **Message Status**: Delivery confirmation (sending, sent, delivered, failed)
- **Pagination**: Efficient loading of message history
- **Mobile Responsive**: Optimized for all device sizes

### Technical Architecture
- **WebSocket Technology**: Supabase Realtime for instant updates
- **Connection Health**: Heartbeat monitoring and network interruption handling
- **Message Queuing**: Offline message queuing with automatic retry
- **Duplicate Prevention**: Smart message deduplication
- **Performance Optimized**: Efficient message broadcasting and caching

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Lucide React** for icons
- **
