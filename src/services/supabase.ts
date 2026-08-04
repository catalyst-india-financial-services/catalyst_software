import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dawnjgihxnffxfvdpald.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhd25qZ2loeG5mZnhmdmRwYWxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0ODg4NzQsImV4cCI6MjEwMTA2NDg3NH0.AUgUMujlmSITLoOeXgQVqe_VOsnWOsDL4GwNijEieJ8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

export type Database = {
  public: {
    Tables: {
      customers: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      loans: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
      emi_payments: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }
    }
  }
}
