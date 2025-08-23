import React, { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
  duration?: number
}

// Global toast state management
class ToastManager {
  private listeners: Set<(toasts: ToastMessage[]) => void> = new Set()
  private toasts: ToastMessage[] = []

  subscribe(listener: (toasts: ToastMessage[]) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]))
  }

  show(type: ToastMessage['type'], message: string, duration = 4000) {
    const id = Date.now().toString()
    const toast: ToastMessage = { id, type, message, duration }
    this.toasts.push(toast)
    this.notify()

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration)
    }
  }

  remove(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id)
    this.notify()
  }

  success(message: string, duration?: number) {
    this.show('success', message, duration)
  }

  error(message: string, duration?: number) {
    this.show('error', message, duration)
  }

  info(message: string, duration?: number) {
    this.show('info', message, duration)
  }

  warning(message: string, duration?: number) {
    this.show('warning', message, duration)
  }
}

// Create singleton instance
export const toast = new ToastManager()

// Toast Component
const Toast: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    const unsubscribe = toast.subscribe(setToasts)
    return unsubscribe
  }, [])

  const getIcon = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />
      case 'error':
        return <AlertCircle className="w-5 h-5" />
      case 'info':
        return <Info className="w-5 h-5" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />
    }
  }

  const getStyles = (type: ToastMessage['type']) => {
    const base = 'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 transform'
    switch (type) {
      case 'success':
        return `${base} bg-green-600 text-white`
      case 'error':
        return `${base} bg-red-600 text-white`
      case 'info':
        return `${base} bg-blue-600 text-white`
      case 'warning':
        return `${base} bg-yellow-500 text-white`
    }
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className={getStyles(toast.type)}
          style={{
            animation: 'slideIn 0.3s ease-out',
            animationDelay: `${index * 0.05}s`
          }}
        >
          {getIcon(toast.type)}
          <span className="flex-1 font-medium">{toast.message}</span>
          <button
            onClick={() => (window as any).toast.remove(toast.id)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

// Make toast available globally for convenience
if (typeof window !== 'undefined') {
  (window as any).toast = toast
}

export default Toast
