export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          username: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          username: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          username?: string
          created_at?: string
        }
      }
      locations: {
        Row: {
          id: string
          user_id: string
          latitude: number
          longitude: number
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          latitude: number
          longitude: number
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          latitude?: number
          longitude?: number
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}