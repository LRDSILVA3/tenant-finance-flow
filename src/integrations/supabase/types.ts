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
      clients: {
        Row: {
          id: string
          user_id: string
          name: string
          tax_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          tax_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          tax_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          user_id: string
          client_id: string
          name: string
          type: string
          parent_id: string | null
          code: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_id: string
          name: string
          type: string
          parent_id?: string | null
          code: string
          sort_order: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          client_id?: string
          name?: string
          type?: string
          parent_id?: string | null
          code?: string
          sort_order?: number
          created_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          client_id: string
          category_id: string
          type: string
          amount: number
          description: string
          date: string
          reference: string | null
          notes: string | null
          payment_method: string | null
          created_at: string
          collaborator_id: string | null
          commission_amount: number | null
        }
        Insert: {
          id?: string
          user_id: string
          client_id: string
          category_id: string
          type: string
          amount: number
          description: string
          date: string
          reference?: string | null
          notes?: string | null
          payment_method?: string | null
          created_at?: string
          collaborator_id?: string | null
          commission_amount?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          client_id?: string
          category_id?: string
          type?: string
          amount?: number
          description?: string
          date?: string
          reference?: string | null
          notes?: string | null
          payment_method?: string | null
          created_at?: string
          collaborator_id?: string | null
          commission_amount?: number | null
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          enable_payment_methods: boolean
          enable_commission: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          enable_payment_methods?: boolean
          enable_commission?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          enable_payment_.methods?: boolean
          enable_commission?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      collaborators: {
        Row: {
          id: string
          user_id: string
          client_id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_id: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          client_id?: string
          name?: string
          created_at?: string
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
