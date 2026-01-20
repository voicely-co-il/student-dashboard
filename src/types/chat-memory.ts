// Chat Memory System Types
// These types extend the auto-generated Supabase types

export type MemoryType = 'fact' | 'preference' | 'goal' | 'challenge' | 'achievement';
export type MemorySource = 'chat' | 'lesson' | 'recording' | 'manual' | 'system';
export type SessionStatus = 'active' | 'summarized' | 'archived';
export type ChatType = 'student' | 'teacher';
export type MemoryOperation = 'extract' | 'update' | 'merge' | 'delete' | 'retrieve' | 'summarize';

// User Memory
export interface UserMemory {
  id: string;
  user_id: string;
  memory_type: MemoryType;
  content: string;
  confidence: number;
  importance: number;
  source: MemorySource;
  source_id?: string;
  embedding?: number[];
  created_at: string;
  updated_at: string;
  last_accessed_at?: string;
  is_active: boolean;
  superseded_by?: string;
}

export interface UserMemoryInsert {
  user_id: string;
  memory_type: MemoryType;
  content: string;
  confidence?: number;
  importance?: number;
  source?: MemorySource;
  source_id?: string;
  embedding?: number[];
}

export interface UserMemoryUpdate {
  memory_type?: MemoryType;
  content?: string;
  confidence?: number;
  importance?: number;
  last_accessed_at?: string;
  is_active?: boolean;
  superseded_by?: string;
}

// Student Chat Session
export interface StudentChatSession {
  id: string;
  user_id: string;
  messages: ChatMessage[];
  summary?: string;
  extracted_memories: string[];
  context_used: string[];
  chat_type: ChatType;
  message_count: number;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface StudentChatSessionInsert {
  user_id: string;
  messages?: ChatMessage[];
  chat_type?: ChatType;
  message_count?: number;
}

export interface StudentChatSessionUpdate {
  messages?: ChatMessage[];
  summary?: string;
  extracted_memories?: string[];
  context_used?: string[];
  message_count?: number;
  status?: SessionStatus;
  last_message_at?: string;
}

// Chat Message (stored in JSONB)
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actions?: ChatAction[];
}

export interface ChatAction {
  type: 'search_result' | 'memory' | 'crm' | 'calendar';
  label: string;
  status: 'pending' | 'completed' | 'failed';
}

// Memory Operations Log
export interface MemoryOperationLog {
  id: string;
  user_id?: string;
  session_id?: string;
  operation: MemoryOperation;
  input_data?: Record<string, unknown>;
  output_data?: Record<string, unknown>;
  memories_affected?: string[];
  tokens_used?: number;
  latency_ms?: number;
  created_at: string;
}

// Memory Stats (from RPC)
export interface UserMemoryStats {
  total_memories: number;
  facts_count: number;
  preferences_count: number;
  goals_count: number;
  challenges_count: number;
  achievements_count: number;
  avg_confidence: number;
  oldest_memory?: string;
  newest_memory?: string;
}

// Memory Search Result (from RPC)
export interface MemorySearchResult {
  id: string;
  memory_type: MemoryType;
  content: string;
  confidence: number;
  importance: number;
  similarity: number;
  created_at: string;
  last_accessed_at?: string;
}

// API Request/Response Types
export interface MemoryExtractRequest {
  operation: 'extract';
  userId: string;
  sessionId?: string;
  messages: Array<{ role: string; content: string }>;
}

export interface MemoryRetrieveRequest {
  operation: 'retrieve';
  userId: string;
  query: string;
  limit?: number;
}

export interface MemoryUpdateRequest {
  operation: 'update';
  userId: string;
  memories: Array<{
    memory_type: MemoryType;
    content: string;
    confidence: number;
    importance: number;
  }>;
  existingMemoryIds?: string[];
}

export interface MemorySummarizeRequest {
  operation: 'summarize';
  userId: string;
  sessionId: string;
  messages: Array<{ role: string; content: string }>;
}

export type MemoryRequest =
  | MemoryExtractRequest
  | MemoryRetrieveRequest
  | MemoryUpdateRequest
  | MemorySummarizeRequest;

export interface MemoryExtractResponse {
  success: boolean;
  added: number;
  updated: number;
  skipped: number;
  memories: Array<{
    memory_type: MemoryType;
    content: string;
    confidence: number;
    importance: number;
  }>;
}

export interface MemoryRetrieveResponse {
  success: boolean;
  memories: MemorySearchResult[];
}

export interface MemorySummarizeResponse {
  success: boolean;
  summary: string;
}
