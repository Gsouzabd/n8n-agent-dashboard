export interface Agent {
  id: string
  user_id: string
  name: string
  description?: string
  webhook_url?: string
  webhook_method: string
  webhook_path?: string
  auth_type: string
  auth_username?: string
  auth_password?: string
  system_prompt?: string
  created_at: string
  updated_at: string
}

export interface KnowledgeBase {
  id: string
  agent_id: string
  name: string
  description?: string
  created_at: string
}

export interface KnowledgeDocument {
  id: string
  knowledge_base_id: string
  content: string
  embedding?: number[]
  metadata: Record<string, any>
  file_name?: string
  file_type?: string
  file_size?: number
  file_path?: string
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
  error_message?: string
  chunks_count?: number
  created_at: string
}

export interface N8nConfig {
  webhook: {
    url: string
    method: string
    authentication: {
      type: string
      username?: string
      password?: string
    }
  }
  agent: {
    id: string
    configEndpoint: string
    queryEndpoint: string
    apiKey: string
  }
}

export interface ChatSession {
  id: string
  agent_id: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

