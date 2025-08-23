import { toast } from '../components/Toast'

/**
 * Custom hook for toast notifications
 * Provides a convenient way to show toast messages throughout the app
 */
export function useToast() {
  return {
    success: (message: string, duration?: number) => {
      toast.success(message, duration)
    },
    error: (message: string, duration?: number) => {
      toast.error(message, duration)
    },
    info: (message: string, duration?: number) => {
      toast.info(message, duration)
    },
    warning: (message: string, duration?: number) => {
      toast.warning(message, duration)
    },
    show: toast.show.bind(toast),
    remove: toast.remove.bind(toast)
  }
}

// Export toast instance for direct usage
export { toast }
