import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bdhhqafyqyamcejkufxf.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkaGhxYWZ5cXlhbWNlamt1ZnhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMTkzMzUsImV4cCI6MjA3Njg5NTMzNX0.FH5j2uCOc2wDIXFu6ByJJBTL9dmiSMbefTtM7va7dfE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          webhook_url: string | null
          webhook_method: string
          webhook_path: string | null
          auth_type: string
          auth_username: string | null
          auth_password: string | null
          system_prompt: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          webhook_url?: string | null
          webhook_method?: string
          webhook_path?: string | null
          auth_type?: string
          auth_username?: string | null
          auth_password?: string | null
          system_prompt?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          webhook_url?: string | null
          webhook_method?: string
          webhook_path?: string | null
          auth_type?: string
          auth_username?: string | null
          auth_password?: string | null
          system_prompt?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      knowledge_bases: {
        Row: {
          id: string
          agent_id: string
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          agent_id?: string
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      knowledge_documents: {
        Row: {
          id: string
          knowledge_base_id: string
          content: string
          embedding: number[] | null
          metadata: Record<string, any>
          created_at: string
        }
        Insert: {
          id?: string
          knowledge_base_id: string
          content: string
          embedding?: number[] | null
          metadata?: Record<string, any>
          created_at?: string
        }
        Update: {
          id?: string
          knowledge_base_id?: string
          content?: string
          embedding?: number[] | null
          metadata?: Record<string, any>
          created_at?: string
        }
      }
    }
  }
}

