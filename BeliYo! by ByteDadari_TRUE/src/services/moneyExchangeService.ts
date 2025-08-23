import { supabase } from '../lib/supabase'

export interface MoneyExchangeRequest {
  id?: string
  unique_id?: string
  user_id: string
  from_amount: number
  from_currency: string
  to_amount: number
  to_currency: string
  notes?: string
  location?: string
  status: 'pending' | 'completed' | 'cancelled'
  created_at?: string
  updated_at?: string
}

export interface MoneyExchangeServiceResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

class MoneyExchangeService {
  private readonly TABLE_NAME = 'money_exchanges'
  private syncQueue: MoneyExchangeRequest[] = []
  private isOnline = navigator.onLine
  private retryAttempts = 3
  private retryDelay = 1000

  constructor() {
    // Monitor online/offline status
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))
    
    // Process sync queue when coming online
    if (this.isOnline) {
      this.processSyncQueue()
    }
  }

  /**
   * Generate a unique ID for money exchange requests
   * Format: ME-{timestamp}-{random} (e.g., ME-20241201143022-A1B2C3)
   */
  private generateUniqueId(): string {
    const timestamp = new Date().toISOString()
      .replace(/[-:T]/g, '')
      .replace(/\.\d{3}Z$/, '')
    
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase()
    
    return `ME-${timestamp}-${randomPart}`
  }

  /**
   * Validate unique ID format
   */
  private validateUniqueId(uniqueId: string): boolean {
    const pattern = /^ME-\d{14}-[A-Z0-9]{6,8}$/
    return pattern.test(uniqueId)
  }

  /**
   * Create a new money exchange request with unique ID
   */
  async createExchangeRequest(
    request: Omit<MoneyExchangeRequest, 'id' | 'unique_id' | 'created_at' | 'updated_at'>
  ): Promise<MoneyExchangeServiceResponse<MoneyExchangeRequest>> {
    try {
      // Generate unique ID
      const uniqueId = this.generateUniqueId()
      
      // Validate the generated ID
      if (!this.validateUniqueId(uniqueId)) {
        throw new Error('Generated unique ID is invalid')
      }

      const requestWithId: MoneyExchangeRequest = {
        ...request,
        unique_id: uniqueId,
        location: request.location || 'SKKU',
        status: request.status || 'pending'
      }

      if (this.isOnline) {
        // Try to save directly to database
        const result = await this.saveToDatabase(requestWithId)
        if (result.success) {
          console.log(`Money exchange request created with ID: ${uniqueId}`)
          return result
        } else {
          // If database save fails, add to sync queue
          this.addToSyncQueue(requestWithId)
          return {
            data: requestWithId,
            error: 'Saved locally, will sync when connection is restored',
            success: true
          }
        }
      } else {
        // Offline: add to sync queue
        this.addToSyncQueue(requestWithId)
        return {
          data: requestWithId,
          error: 'Saved locally, will sync when online',
          success: true
        }
      }
    } catch (error) {
      console.error('Error creating exchange request:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to create exchange request',
        success: false
      }
    }
  }

  /**
   * Save request to Supabase database
   */
  private async saveToDatabase(
    request: MoneyExchangeRequest,
    retryCount = 0
  ): Promise<MoneyExchangeServiceResponse<MoneyExchangeRequest>> {
    try {
      // Check for existing unique_id to prevent duplicates
      const { data: existing } = await supabase
        .from(this.TABLE_NAME)
        .select('unique_id')
        .eq('unique_id', request.unique_id)
        .maybeSingle()

      if (existing) {
        throw new Error(`Duplicate unique ID: ${request.unique_id}`)
      }

      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .insert([request])
        .select()
        .single()

      if (error) {
        if (error.code === '23505' && error.message.includes('unique_id')) {
          // Unique constraint violation - regenerate ID and retry
          if (retryCount < this.retryAttempts) {
            const newRequest = { ...request, unique_id: this.generateUniqueId() }
            return this.saveToDatabase(newRequest, retryCount + 1)
          } else {
            throw new Error('Failed to generate unique ID after multiple attempts')
          }
        }
        throw error
      }

      return {
        data,
        error: null,
        success: true
      }
    } catch (error) {
      console.error('Database save error:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Database save failed',
        success: false
      }
    }
  }

  /**
   * Get exchange request by unique ID
   */
  async getExchangeRequestByUniqueId(
    uniqueId: string
  ): Promise<MoneyExchangeServiceResponse<MoneyExchangeRequest>> {
    try {
      if (!this.validateUniqueId(uniqueId)) {
        throw new Error('Invalid unique ID format')
      }

      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('unique_id', uniqueId)
        .maybeSingle()

      if (error) throw error

      return {
        data,
        error: null,
        success: true
      }
    } catch (error) {
      console.error('Error fetching exchange request:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to fetch exchange request',
        success: false
      }
    }
  }

  /**
   * Update exchange request by unique ID
   */
  async updateExchangeRequest(
    uniqueId: string,
    updates: Partial<MoneyExchangeRequest>
  ): Promise<MoneyExchangeServiceResponse<MoneyExchangeRequest>> {
    try {
      if (!this.validateUniqueId(uniqueId)) {
        throw new Error('Invalid unique ID format')
      }

      // Remove fields that shouldn't be updated
      const { id, unique_id, created_at, ...allowedUpdates } = updates

      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .update(allowedUpdates)
        .eq('unique_id', uniqueId)
        .select()
        .single()

      if (error) throw error

      console.log(`Money exchange request updated: ${uniqueId}`)
      return {
        data,
        error: null,
        success: true
      }
    } catch (error) {
      console.error('Error updating exchange request:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to update exchange request',
        success: false
      }
    }
  }

  /**
   * Delete exchange request by unique ID
   */
  async deleteExchangeRequest(
    uniqueId: string
  ): Promise<MoneyExchangeServiceResponse<boolean>> {
    try {
      if (!this.validateUniqueId(uniqueId)) {
        throw new Error('Invalid unique ID format')
      }

      const { error } = await supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq('unique_id', uniqueId)

      if (error) throw error

      console.log(`Money exchange request deleted: ${uniqueId}`)
      return {
        data: true,
        error: null,
        success: true
      }
    } catch (error) {
      console.error('Error deleting exchange request:', error)
      return {
        data: false,
        error: error instanceof Error ? error.message : 'Failed to delete exchange request',
        success: false
      }
    }
  }

  /**
   * Get all exchange requests with optional filtering
   */
  async getExchangeRequests(filters?: {
    status?: string
    user_id?: string
    limit?: number
  }): Promise<MoneyExchangeServiceResponse<MoneyExchangeRequest[]>> {
    try {
      let query = supabase
        .from(this.TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.user_id) {
        query = query.eq('user_id', filters.user_id)
      }

      if (filters?.limit) {
        query = query.limit(filters.limit)
      }

      const { data, error } = await query

      if (error) throw error

      return {
        data: data || [],
        error: null,
        success: true
      }
    } catch (error) {
      console.error('Error fetching exchange requests:', error)
      return {
        data: [],
        error: error instanceof Error ? error.message : 'Failed to fetch exchange requests',
        success: false
      }
    }
  }

  /**
   * Add request to sync queue for offline handling
   */
  private addToSyncQueue(request: MoneyExchangeRequest): void {
    this.syncQueue.push(request)
    this.saveSyncQueueToStorage()
    console.log(`Added request to sync queue: ${request.unique_id}`)
  }

  /**
   * Process sync queue when coming online
   */
  private async processSyncQueue(): Promise<void> {
    if (this.syncQueue.length === 0) {
      this.loadSyncQueueFromStorage()
    }

    if (this.syncQueue.length === 0) return

    console.log(`Processing ${this.syncQueue.length} items in sync queue`)

    const processedItems: string[] = []

    for (const request of this.syncQueue) {
      try {
        const result = await this.saveToDatabase(request)
        if (result.success) {
          processedItems.push(request.unique_id || '')
          console.log(`Synced request: ${request.unique_id}`)
        }
      } catch (error) {
        console.error(`Failed to sync request ${request.unique_id}:`, error)
      }
    }

    // Remove successfully processed items from queue
    this.syncQueue = this.syncQueue.filter(
      request => !processedItems.includes(request.unique_id || '')
    )

    this.saveSyncQueueToStorage()
  }

  /**
   * Save sync queue to localStorage
   */
  private saveSyncQueueToStorage(): void {
    try {
      localStorage.setItem('moneyExchangeSyncQueue', JSON.stringify(this.syncQueue))
    } catch (error) {
      console.error('Failed to save sync queue to storage:', error)
    }
  }

  /**
   * Load sync queue from localStorage
   */
  private loadSyncQueueFromStorage(): void {
    try {
      const stored = localStorage.getItem('moneyExchangeSyncQueue')
      if (stored) {
        this.syncQueue = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load sync queue from storage:', error)
      this.syncQueue = []
    }
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    console.log('Connection restored - processing sync queue')
    this.isOnline = true
    this.processSyncQueue()
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    console.log('Connection lost - switching to offline mode')
    this.isOnline = false
  }

  /**
   * Setup real-time subscription for money exchange requests
   */
  setupRealtimeSubscription(
    callback: (payload: any) => void,
    filters?: { user_id?: string }
  ) {
    let channel = supabase
      .channel('money_exchanges_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: this.TABLE_NAME,
          ...(filters?.user_id && { filter: `user_id=eq.${filters.user_id}` })
        },
        callback
      )
      .subscribe()

    return channel
  }

  /**
   * Get sync queue status
   */
  getSyncStatus(): {
    isOnline: boolean
    queueLength: number
    pendingSync: boolean
  } {
    return {
      isOnline: this.isOnline,
      queueLength: this.syncQueue.length,
      pendingSync: this.syncQueue.length > 0
    }
  }
}

export const moneyExchangeService = new MoneyExchangeService()
