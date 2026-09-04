export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          client_id: string
          complement: string | null
          country: string | null
          created_at: string
          id: string
          is_main: boolean | null
          neighborhood: string | null
          number: string
          state: string
          street: string
          type: string | null
          updated_at: string
          zip_code: string
        }
        Insert: {
          city: string
          client_id: string
          complement?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_main?: boolean | null
          neighborhood?: string | null
          number: string
          state: string
          street: string
          type?: string | null
          updated_at?: string
          zip_code: string
        }
        Update: {
          city?: string
          client_id?: string
          complement?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_main?: boolean | null
          neighborhood?: string | null
          number?: string
          state?: string
          street?: string
          type?: string | null
          updated_at?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          client_id: string
          collaborator_id: string | null
          created_at: string
          customer_id: string | null
          duration_minutes: number
          id: string
          notes: string | null
          price: number
          scheduled_at: string
          service_type_id: string | null
          status: string
          title: string
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          collaborator_id?: string | null
          created_at?: string
          customer_id?: string | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          price?: number
          scheduled_at: string
          service_type_id?: string | null
          status?: string
          title: string
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          collaborator_id?: string | null
          created_at?: string
          customer_id?: string | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          price?: number
          scheduled_at?: string
          service_type_id?: string | null
          status?: string
          title?: string
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_methods: {
        Row: {
          card_brand: string
          card_expiry: string
          card_holder_name: string
          card_last4: string
          client_id: string
          created_at: string
          id: string
          is_default: boolean
          updated_at: string
        }
        Insert: {
          card_brand: string
          card_expiry: string
          card_holder_name: string
          card_last4: string
          client_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          updated_at?: string
        }
        Update: {
          card_brand?: string
          card_expiry?: string
          card_holder_name?: string
          card_last4?: string
          client_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_methods_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          client_id: string
          code: string
          created_at: string
          id: string
          name: string
          parent_id: string | null
          sort_order: number
          type: string
          user_id: string
        }
        Insert: {
          client_id: string
          code: string
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number
          type: string
          user_id: string
        }
        Update: {
          client_id?: string
          code?: string
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      client_members: {
        Row: {
          client_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_payment_methods: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
          parent_type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
          parent_type: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          parent_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_payment_methods_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          id: string
          name: string
          tax_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tax_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tax_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      collaborators: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborators_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          birth_date: string | null
          cep: string | null
          city: string | null
          client_id: string
          created_at: string
          document: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          neighborhood: string | null
          notes: string | null
          number: string | null
          person_type: string | null
          phone: string | null
          state: string | null
          street: string | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          client_id: string
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          person_type?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          cep?: string | null
          city?: string | null
          client_id?: string
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          neighborhood?: string | null
          notes?: string | null
          number?: string | null
          person_type?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          cost_price: number
          created_at: string
          discount_amount: number
          id: string
          order_id: string
          product_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          cost_price?: number
          created_at?: string
          discount_amount?: number
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Update: {
          cost_price?: number
          created_at?: string
          discount_amount?: number
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          client_id: string
          collaborator_id: string | null
          created_at: string
          customer_id: string | null
          discount_amount: number
          due_date: string | null
          id: string
          notes: string | null
          order_number: string
          payment_method: string | null
          payment_status: string
          status: string
          subtotal_amount: number
          total_amount: number
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          collaborator_id?: string | null
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          due_date?: string | null
          id?: string
          notes?: string | null
          order_number: string
          payment_method?: string | null
          payment_status?: string
          status?: string
          subtotal_amount?: number
          total_amount?: number
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          collaborator_id?: string | null
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          due_date?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_status?: string
          status?: string
          subtotal_amount?: number
          total_amount?: number
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_products: {
        Row: {
          cost_price: number
          created_at: string
          discount_amount: number
          id: string
          product_id: string
          quantity: number
          service_order_id: string
          total_price: number
          unit_price: number
        }
        Insert: {
          cost_price?: number
          created_at?: string
          discount_amount?: number
          id?: string
          product_id: string
          quantity?: number
          service_order_id: string
          total_price?: number
          unit_price?: number
        }
        Update: {
          cost_price?: number
          created_at?: string
          discount_amount?: number
          id?: string
          product_id?: string
          quantity?: number
          service_order_id?: string
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_order_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_products_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_services: {
        Row: {
          collaborator_id: string | null
          created_at: string
          discount_amount: number
          id: string
          name: string
          quantity: number
          service_order_id: string
          service_type_id: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          collaborator_id?: string | null
          created_at?: string
          discount_amount?: number
          id?: string
          name: string
          quantity?: number
          service_order_id: string
          service_type_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Update: {
          collaborator_id?: string | null
          created_at?: string
          discount_amount?: number
          id?: string
          name?: string
          quantity?: number
          service_order_id?: string
          service_type_id?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_order_services_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_services_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_services_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          client_id: string
          collaborator_id: string | null
          completed_at: string | null
          created_at: string
          customer_id: string | null
          discount_amount: number
          equipment_info: string | null
          id: string
          notes: string | null
          os_number: string
          payment_method: string | null
          payment_status: string
          products_total: number
          reported_defect: string | null
          scheduled_at: string | null
          services_total: number
          status: string
          technical_diagnosis: string | null
          title: string
          total_amount: number
          transaction_id: string | null
          updated_at: string
          warranty_terms: string | null
        }
        Insert: {
          client_id: string
          collaborator_id?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          equipment_info?: string | null
          id?: string
          notes?: string | null
          os_number: string
          payment_method?: string | null
          payment_status?: string
          products_total?: number
          reported_defect?: string | null
          scheduled_at?: string | null
          services_total?: number
          status?: string
          technical_diagnosis?: string | null
          title: string
          total_amount?: number
          transaction_id?: string | null
          updated_at?: string
          warranty_terms?: string | null
        }
        Update: {
          client_id?: string
          collaborator_id?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          discount_amount?: number
          equipment_info?: string | null
          id?: string
          notes?: string | null
          os_number?: string
          payment_method?: string | null
          payment_status?: string
          products_total?: number
          reported_defect?: string | null
          scheduled_at?: string | null
          services_total?: number
          status?: string
          technical_diagnosis?: string | null
          title?: string
          total_amount?: number
          transaction_id?: string | null
          updated_at?: string
          warranty_terms?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          name: string
          price: number
          trial_months: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          name: string
          price?: number
          trial_months?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          trial_months?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          client_id: string
          cost_price: number
          created_at: string
          current_stock: number
          description: string | null
          expiration_date: string | null
          id: string
          location: string | null
          min_stock: number
          name: string
          sale_price: number
          sku: string | null
          supplier_id: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          client_id: string
          cost_price?: number
          created_at?: string
          current_stock?: number
          description?: string | null
          expiration_date?: string | null
          id?: string
          location?: string | null
          min_stock?: number
          name: string
          sale_price?: number
          sku?: string | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          client_id?: string
          cost_price?: number
          created_at?: string
          current_stock?: number
          description?: string | null
          expiration_date?: string | null
          id?: string
          location?: string | null
          min_stock?: number
          name?: string
          sale_price?: number
          sku?: string | null
          supplier_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          email: string | null
          id: string
          is_admin: boolean
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          email?: string | null
          id: string
          is_admin?: boolean
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          email?: string | null
          id?: string
          is_admin?: boolean
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      service_types: {
        Row: {
          client_id: string
          created_at: string
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price: number
        }
        Insert: {
          client_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name: string
          price?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_types_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          client_id: string
          cost_price: number | null
          created_at: string
          expiration_date: string | null
          id: string
          notes: string | null
          product_id: string
          quantity: number
          type: string
        }
        Insert: {
          client_id: string
          cost_price?: number | null
          created_at?: string
          expiration_date?: string | null
          id?: string
          notes?: string | null
          product_id: string
          quantity: number
          type: string
        }
        Update: {
          client_id?: string
          cost_price?: number | null
          created_at?: string
          expiration_date?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          client_id: string
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          plan_id: string
          provider_subscription_id: string | null
          status: string
          trial_end: string
          trial_start: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          current_period_end: string
          current_period_start?: string
          id?: string
          plan_id: string
          provider_subscription_id?: string | null
          status?: string
          trial_end: string
          trial_start?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id?: string
          provider_subscription_id?: string | null
          status?: string
          trial_end?: string
          trial_start?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          client_id: string
          contact_info: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          client_id: string
          contact_info?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          client_id?: string
          contact_info?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_admin_reply: boolean
          sender_id: string | null
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_admin_reply?: boolean
          sender_id?: string | null
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_admin_reply?: boolean
          sender_id?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          guest_email: string | null
          guest_name: string | null
          id: string
          last_message_at: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          last_message_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          last_message_at?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_commissions: {
        Row: {
          client_id: string
          collaborator_id: string
          commission_amount: number
          created_at: string
          id: string
          transaction_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          collaborator_id: string
          commission_amount: number
          created_at?: string
          id?: string
          transaction_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          collaborator_id?: string
          commission_amount?: number
          created_at?: string
          id?: string
          transaction_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_commissions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_commissions_collaborator_id_fkey"
            columns: ["collaborator_id"]
            isOneToOne: false
            referencedRelation: "collaborators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_commissions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string
          client_id: string
          created_at: string
          customer_id: string | null
          date: string
          description: string
          id: string
          notes: string | null
          order_id: string | null
          payment_method: string | null
          recurring_id: string | null
          reference: string | null
          status: string
          supplier_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id: string
          client_id: string
          created_at?: string
          customer_id?: string | null
          date: string
          description: string
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_method?: string | null
          recurring_id?: string | null
          reference?: string | null
          status?: string
          supplier_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string
          client_id?: string
          created_at?: string
          customer_id?: string | null
          date?: string
          description?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_method?: string | null
          recurring_id?: string | null
          reference?: string | null
          status?: string
          supplier_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          enable_commission: boolean
          enable_payment_methods: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enable_commission?: boolean
          enable_payment_methods?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enable_commission?: boolean
          enable_payment_methods?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      is_client_member: { Args: { target_client_id: string }; Returns: boolean }
      is_client_owner: { Args: { target_client_id: string }; Returns: boolean }
    }
    Enums: {
      user_role: "owner" | "collaborator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["owner", "collaborator"],
    },
  },
} as const
