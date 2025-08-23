import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set')
  console.log('VITE_SUPABASE_URL:', supabaseUrl)
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Not set')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

// Test connection
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('Supabase connection error:', error)
  } else {
    console.log('Supabase connected successfully')
  }
})

export interface Profile {
  id: string
  user_id: string
  full_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  seller_id: string
  name: string
  description: string
  price: number
  currency: string
  category: string
  image_url?: string
  images?: string[] // New field for multiple images
  image_count?: number // New field for image count
  condition?: number
  location?: string
  latitude?: number
  longitude?: number
  status: 'available' | 'sold'
  created_at: string
  updated_at: string
}

export interface MoneyExchange {
  id: string
  unique_id?: string // New unique identifier field
  user_id: string
  from_amount: number
  from_currency: string
  to_amount: number
  to_currency: string
  notes?: string
  location?: string // New location field
  status: 'pending' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface Mission {
  id: string
  user_id: string
  title: string
  description: string
  category: string
  due_date?: string
  location: string
  reward?: string
  notes?: string
  status: 'pending' | 'accepted' | 'completed'
  accepted_by?: string
  created_at: string
  updated_at: string
}
