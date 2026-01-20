# Voicely Chat Memory System - Product Specification v1.0

> **תאריך:** ינואר 2026
> **סטטוס:** Draft
> **מחבר:** Claude AI + Voicely Team

---

## 1. Executive Summary

### המצב הנוכחי
מערכת הצ'אט של Voicely משתמשת בזיכרון בסיסי מאוד:
- **Student/Teacher Chat:** 10 הודעות אחרונות בלבד, ללא שמירה בין sessions
- **Website Chat:** שמירה מלאה ב-DB אבל ללא זיכרון חכם

### החזון
מערכת זיכרון מתקדמת שתאפשר:
- AI שמכיר את התלמיד לאורך זמן
- המשכיות שיחות בין sessions
- זכירת העדפות, התקדמות, ואתגרים
- חוויה מותאמת אישית לכל משתמש

---

## 2. Best Practices 2026 - סקירת שוק

### 2.1 ארכיטקטורות זיכרון מובילות

מקורות: [Serokell](https://serokell.io/blog/design-patterns-for-long-term-memory-in-llm-powered-architectures), [LangChain LangMem](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/), [Mem0](https://mem0.ai/)

| Pattern | תיאור | יתרונות | חסרונות |
|---------|-------|---------|---------|
| **Buffer Memory** | כל ההיסטוריה ב-context | פשוט | צורך tokens, מוגבל |
| **Summary Memory** | סיכום שיחה במקום full history | חסכוני | מאבד פרטים |
| **Window Memory** | N הודעות אחרונות | מאוזן | אין זיכרון ארוך |
| **RAG Memory** | חיפוש סמנטי בהיסטוריה | גמיש, סקיילבילי | latency |
| **Graph Memory** | ישויות וקשרים כגרף | קשרים מורכבים | מורכב |
| **Mem0 Hybrid** | סינון חכם + גרף + vectors | SOTA, 26% שיפור | תלות חיצונית |

### 2.2 מגמות 2026

מקורות: [VentureBeat](https://venturebeat.com/data/six-data-shifts-that-will-shape-enterprise-ai-in-2026), [NVIDIA Blog](https://developer.nvidia.com/blog/reimagining-llm-memory-using-context-as-training-data-unlocks-models-that-learn-at-test-time)

1. **Contextual Memory כ-Standard** - לא רק RAG, אלא זיכרון אדפטיבי שלומד מהמשתמש
2. **Graph Memory** - קשרים בין ישויות (תלמיד ↔ טכניקה ↔ שיר ↔ מורה)
3. **Memory Formation vs Summarization** - בחירה חכמה מה לזכור (לא סיכום של הכל)
4. **Hot Path + Background** - עדכון מיידי + ניתוח רקע
5. **TTT (Test-Time Training)** - LLMs שמתעדכנים בזמן אמת (מחקר NVIDIA)

### 2.3 Mem0 - State of the Art

מקורות: [Mem0 Research](https://mem0.ai/research), [GitHub](https://github.com/mem0ai/mem0), [AWS Blog](https://aws.amazon.com/blogs/database/build-persistent-memory-for-agentic-ai-applications-with-mem0-open-source-amazon-elasticache-for-valkey-and-amazon-neptune-analytics/)

**תוצאות:**
- +26% דיוק על OpenAI Memory (LOCOMO benchmark)
- 91% מהירות לעומת full-context
- 90% חיסכון ב-tokens

**איך זה עובד:**
1. **Extraction Phase** - זיהוי עובדות חשובות מהשיחה
2. **Update Phase** - עדכון/מיזוג/מחיקה של זיכרונות קיימים
3. **Conflict Resolution** - טיפול בסתירות (מידע חדש vs ישן)
4. **Graph Layer** - ישויות וקשרים (אופציונלי)

---

## 3. ארכיטקטורה מוצעת

### 3.1 Memory Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    Voicely Chat Interface                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Working   │  │   Session   │  │  Long-term  │         │
│  │   Memory    │  │   Memory    │  │   Memory    │         │
│  │ (in-context)│  │  (24 hrs)   │  │ (permanent) │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                  │
│         └────────────────┼────────────────┘                  │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Memory Manager (Edge Function)          │    │
│  │  • Extract facts    • Update/merge memories          │    │
│  │  • Resolve conflicts • Rank by importance            │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                   │
│         ┌────────────────┼────────────────┐                  │
│         ▼                ▼                ▼                  │
│  ┌───────────┐    ┌───────────┐    ┌───────────┐           │
│  │  Supabase │    │  pgvector │    │  Existing │           │
│  │  Tables   │    │ Embeddings│    │Transcripts│           │
│  └───────────┘    └───────────┘    └───────────┘           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 שלושת שכבות הזיכרון

#### Layer 1: Working Memory (In-Context)
- **מה:** 10-15 הודעות אחרונות בשיחה הנוכחית
- **איפה:** React state + API request
- **כמו היום:** אבל עם retrieval חכם

#### Layer 2: Session Memory (24 שעות)
- **מה:** סיכום שיחות מהיום, context רלוונטי
- **איפה:** Supabase `chat_sessions` table
- **חדש:** המשכיות בין רענוני דף

#### Layer 3: Long-term Memory (Permanent)
- **מה:** עובדות על התלמיד, העדפות, התקדמות
- **איפה:** Supabase `user_memories` + pgvector
- **חדש:** פרופיל AI מתפתח לאורך זמן

---

## 4. Database Schema

### 4.1 טבלאות חדשות

```sql
-- ============================================
-- USER MEMORIES - Long-term facts about users
-- ============================================
CREATE TABLE user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Memory content
  memory_type TEXT NOT NULL, -- 'fact', 'preference', 'goal', 'challenge', 'achievement'
  content TEXT NOT NULL,
  confidence FLOAT DEFAULT 1.0, -- 0-1, decreases if contradicted
  importance FLOAT DEFAULT 0.5, -- 0-1, affects retrieval priority

  -- Metadata
  source TEXT, -- 'chat', 'lesson', 'recording', 'manual'
  source_id UUID, -- reference to original source

  -- Embeddings for semantic search
  embedding VECTOR(1536),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,

  -- Soft delete for memory decay
  is_active BOOLEAN DEFAULT true,
  superseded_by UUID REFERENCES user_memories(id)
);

-- Index for vector similarity search
CREATE INDEX idx_user_memories_embedding
ON user_memories USING ivfflat (embedding vector_cosine_ops);

-- Index for user lookup
CREATE INDEX idx_user_memories_user_id ON user_memories(user_id, is_active);

-- ============================================
-- CHAT SESSIONS - Extended with memory support
-- ============================================
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS
  summary TEXT, -- AI-generated summary of conversation
  extracted_memories JSONB DEFAULT '[]', -- memories extracted from this session
  context_used JSONB DEFAULT '[]'; -- memories retrieved for this session

-- ============================================
-- MEMORY GRAPH - Relationships between entities
-- ============================================
CREATE TABLE memory_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  entity_type TEXT NOT NULL, -- 'technique', 'song', 'teacher', 'concept', 'goal'
  entity_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}',

  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE memory_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  from_entity_id UUID REFERENCES memory_entities(id) ON DELETE CASCADE,
  to_entity_id UUID REFERENCES memory_entities(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL, -- 'learned', 'struggles_with', 'interested_in', 'completed'

  strength FLOAT DEFAULT 1.0, -- connection strength
  evidence JSONB DEFAULT '[]', -- sources for this relation

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MEMORY OPERATIONS LOG - For debugging
-- ============================================
CREATE TABLE memory_operations_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  operation TEXT NOT NULL, -- 'extract', 'update', 'merge', 'delete', 'retrieve'

  input_data JSONB,
  output_data JSONB,
  tokens_used INTEGER,
  latency_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Memory Types

| Type | תיאור | דוגמאות |
|------|-------|---------|
| `fact` | עובדה אובייקטיבית | "התלמיד הוא בריטון", "לומד 3 חודשים" |
| `preference` | העדפה אישית | "אוהב שירי פופ", "מעדיף תרגילים קצרים" |
| `goal` | מטרה/שאיפה | "רוצה לשיר בחתונה של אחותו" |
| `challenge` | אתגר/קושי | "מתקשה עם נשימה סרעפתית" |
| `achievement` | הישג/התקדמות | "הצליח לראשונה להחזיק צליל 8 שניות" |

---

## 5. Edge Functions

### 5.1 Memory Manager

```typescript
// supabase/functions/memory-manager/index.ts

interface MemoryOperation {
  type: 'extract' | 'retrieve' | 'update';
  userId: string;
  content?: string; // for extract
  query?: string;   // for retrieve
  memories?: Memory[]; // for update
}

// Extract memories from conversation
async function extractMemories(
  userId: string,
  messages: Message[]
): Promise<Memory[]> {
  const prompt = `
    Analyze this conversation and extract important facts about the user.
    Focus on:
    - Personal facts (voice type, experience level, age)
    - Preferences (music style, learning pace)
    - Goals (why they're learning, specific targets)
    - Challenges (what they struggle with)
    - Achievements (breakthroughs, improvements)

    Return JSON array of memories.
    Only include confident, specific information.
    Avoid generic observations.
  `;

  const response = await llm.generate(prompt, messages);
  return parseMemories(response);
}

// Retrieve relevant memories for context
async function retrieveMemories(
  userId: string,
  query: string,
  limit: number = 10
): Promise<Memory[]> {
  // 1. Vector similarity search
  const embedding = await generateEmbedding(query);
  const vectorResults = await supabase.rpc('match_memories', {
    query_embedding: embedding,
    user_id: userId,
    match_count: limit * 2
  });

  // 2. Recency boost
  const withRecency = vectorResults.map(m => ({
    ...m,
    score: m.similarity * recencyBoost(m.last_accessed_at)
  }));

  // 3. Return top results
  return withRecency
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Update/merge memories
async function updateMemories(
  userId: string,
  newMemories: Memory[],
  existingMemories: Memory[]
): Promise<UpdateResult> {
  const prompt = `
    Compare new memories with existing ones.
    For each new memory, decide:
    - ADD: new information
    - UPDATE: more recent/accurate version of existing
    - MERGE: combine with existing memory
    - SKIP: duplicate or less confident

    Handle contradictions by preferring recent information
    but lowering confidence of updated memories.
  `;

  const decisions = await llm.generate(prompt, {
    new: newMemories,
    existing: existingMemories
  });

  return applyMemoryUpdates(decisions);
}
```

### 5.2 Updated Student Chat

```typescript
// supabase/functions/student-chat/index.ts (updated)

export async function handleStudentChat(req: Request) {
  const { userId, message, conversationHistory } = await req.json();

  // 1. Retrieve relevant memories
  const memories = await retrieveMemories(userId, message);

  // 2. Build context-aware prompt
  const systemPrompt = buildPromptWithMemories(memories);

  // 3. Generate response (existing logic)
  const response = await generateResponse(
    systemPrompt,
    conversationHistory,
    message
  );

  // 4. Extract new memories (background)
  EdgeRuntime.waitUntil(
    extractAndSaveMemories(userId, [...conversationHistory,
      { role: 'user', content: message },
      { role: 'assistant', content: response }
    ])
  );

  // 5. Update last_accessed for used memories
  EdgeRuntime.waitUntil(
    updateMemoryAccess(memories.map(m => m.id))
  );

  return new Response(JSON.stringify({ response, memoriesUsed: memories.length }));
}

function buildPromptWithMemories(memories: Memory[]): string {
  const memoryContext = memories.map(m =>
    `- [${m.memory_type}] ${m.content}`
  ).join('\n');

  return `
    אתה מורה לשירה וקול של Voicely.

    ## מה שאתה יודע על התלמיד הזה:
    ${memoryContext || 'אין מידע קודם - זו שיחה ראשונה'}

    ## הנחיות:
    - התייחס למידע הקודם בתשובות שלך
    - אם יש סתירה למידע קודם, שאל לבירור
    - זכור להתעדכן אם התלמיד מספר משהו חדש
  `;
}
```

---

## 6. Client-Side Implementation

### 6.1 Updated useStudentChat Hook

```typescript
// src/hooks/useStudentChat.ts (updated)

export function useStudentChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [memoriesLoaded, setMemoriesLoaded] = useState(false);

  // Load session on mount
  useEffect(() => {
    if (user) {
      loadOrCreateSession();
    }
  }, [user]);

  async function loadOrCreateSession() {
    // Check for recent session (last 24 hours)
    const { data: existingSession } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('chat_type', 'student')
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (existingSession) {
      // Resume existing session
      setMessages(existingSession.messages || []);
      setSessionId(existingSession.id);
    } else {
      // Create new session with welcome
      const welcomeMessage = await generatePersonalizedWelcome(user.id);
      setMessages([welcomeMessage]);
    }

    setMemoriesLoaded(true);
  }

  async function sendMessage(content: string) {
    const userMessage = { role: 'user', content, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);

    const response = await supabase.functions.invoke('student-chat', {
      body: {
        userId: user.id,
        sessionId,
        message: content,
        conversationHistory: messages.slice(-10)
      }
    });

    const assistantMessage = {
      role: 'assistant',
      content: response.data.response,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMessage]);

    // Save to session (background)
    saveSession([...messages, userMessage, assistantMessage]);
  }

  return { messages, sendMessage, memoriesLoaded };
}
```

### 6.2 Memory Debug Panel (Admin)

```tsx
// src/components/admin/MemoryDebugPanel.tsx

export function MemoryDebugPanel({ userId }: { userId: string }) {
  const { data: memories } = useQuery({
    queryKey: ['user-memories', userId],
    queryFn: () => supabase
      .from('user_memories')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
  });

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="font-bold mb-4">זיכרונות ({memories?.length || 0})</h3>

      {memories?.map(memory => (
        <div key={memory.id} className="mb-2 p-2 bg-white rounded">
          <span className={`badge badge-${memory.memory_type}`}>
            {memory.memory_type}
          </span>
          <p>{memory.content}</p>
          <small className="text-gray-500">
            confidence: {(memory.confidence * 100).toFixed(0)}% |
            importance: {(memory.importance * 100).toFixed(0)}%
          </small>
        </div>
      ))}
    </div>
  );
}
```

---

## 7. Privacy & Security

### 7.1 Data Protection

```typescript
// RLS Policies
CREATE POLICY "Users can only see their own memories"
ON user_memories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Only system can insert memories"
ON user_memories FOR INSERT
WITH CHECK (
  auth.uid() = user_id OR
  auth.jwt()->>'role' = 'service_role'
);

// Memory retention
CREATE POLICY "Auto-delete old low-importance memories"
ON user_memories FOR DELETE
USING (
  importance < 0.3 AND
  last_accessed_at < NOW() - INTERVAL '90 days'
);
```

### 7.2 User Controls

- **View My Data:** תלמידים יכולים לראות מה ה-AI "זוכר" עליהם
- **Delete Memory:** מחיקת זיכרון ספציפי
- **Export Data:** הורדת כל המידע (GDPR)
- **Opt-out:** אפשרות לבטל זיכרון לטווח ארוך

---

## 8. Rollout Plan

### Phase 1: Foundation (שבוע 1-2)
- [ ] יצירת טבלאות DB
- [ ] Edge Function בסיסי ל-memory extraction
- [ ] שמירת sessions ב-Supabase (במקום React state)

### Phase 2: Retrieval (שבוע 3-4)
- [ ] Vector embeddings לזיכרונות
- [ ] Semantic search בזיכרונות
- [ ] שילוב בתשובות הצ'אט

### Phase 3: Intelligence (שבוע 5-6)
- [ ] Memory update/merge logic
- [ ] Conflict resolution
- [ ] Importance scoring

### Phase 4: UI & Polish (שבוע 7-8)
- [ ] Memory debug panel (admin)
- [ ] User memory view
- [ ] Privacy controls
- [ ] Performance optimization

---

## 9. Success Metrics

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Session continuity | 0% | 80% | Users returning to same session |
| Personalization accuracy | N/A | 85% | User feedback on relevance |
| Token usage | 100% | 30% | Tokens per response |
| Response latency | 2s | 2.5s | P95 latency (slight increase OK) |
| User satisfaction | 7/10 | 9/10 | NPS surveys |

---

## 10. Open Questions

1. **Mem0 vs Custom?** - האם להשתמש ב-Mem0 SDK או לבנות custom?
   - Mem0: מהיר להתחלה, SOTA results, $24M funding
   - Custom: שליטה מלאה, ללא תלות, התאמה ל-Supabase

2. **Graph Memory?** - האם צריך שכבת גרף או מספיק vectors?
   - כן: קשרים מורכבים (תלמיד-טכניקה-שיר)
   - לא: מורכבות, אולי overkill לשלב ראשון

3. **Real-time vs Background?** - מתי לחלץ זיכרונות?
   - Hot path: מיידי אבל latency
   - Background: ללא latency אבל delay

4. **Retention Policy?** - כמה זמן לשמור זיכרונות?
   - Forever with decay?
   - Hard limit (1 year)?
   - User-configurable?

---

## 11. References

### Industry Research
- [Mem0 Research Paper](https://arxiv.org/abs/2504.19413) - LOCOMO benchmark
- [LangChain LangMem](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/) - Memory concepts
- [Serokell Design Patterns](https://serokell.io/blog/design-patterns-for-long-term-memory-in-llm-powered-architectures) - Architecture patterns

### Best Practices 2026
- [VentureBeat: 6 Data Predictions](https://venturebeat.com/data/six-data-shifts-that-will-shape-enterprise-ai-in-2026) - Contextual memory as standard
- [NVIDIA TTT Research](https://developer.nvidia.com/blog/reimagining-llm-memory-using-context-as-training-data-unlocks-models-that-learn-at-test-time) - Future of LLM memory
- [Pinecone Conversational Memory](https://www.pinecone.io/learn/series/langchain/langchain-conversational-memory/) - Implementation patterns

### Technical Resources
- [Supabase pgvector](https://supabase.com/docs/guides/database/extensions/pgvector) - Vector search
- [Mem0 + Supabase](https://docs.mem0.ai/v0x/components/vectordbs/dbs/supabase) - Integration guide
- [AWS S3 Vectors](https://www.infoq.com/news/2026/01/aws-s3-vectors-ga/) - Storage-first architecture

---

## Appendix A: Comparison with Current State

| Feature | Current | Proposed |
|---------|---------|----------|
| Message History | 10 messages in-memory | Full session in DB |
| Cross-session Memory | ❌ None | ✅ Long-term memories |
| Personalization | ❌ None | ✅ User profile |
| Privacy Controls | ❌ None | ✅ View/delete/export |
| Cost (tokens) | High (repeated context) | Low (smart retrieval) |

## Appendix B: Example Memory Flow

```
User: "היי, רציתי לשאול על טכניקת הנשימה שדיברנו עליה"

1. RETRIEVE: Search memories for "נשימה"
   → Found: "התלמיד מתקשה עם נשימה סרעפתית" (challenge, 0.8 confidence)
   → Found: "עבד על תרגיל 4-7-8 בשיעור האחרון" (fact, 0.9 confidence)

2. CONTEXT: Build prompt with memories
   → "התלמיד מתקשה עם נשימה סרעפתית ועבד על תרגיל 4-7-8"

3. GENERATE: Response with context
   → "כן, בשיעור האחרון התחלנו עם תרגיל 4-7-8. איך הלך לך לתרגל אותו?"

4. EXTRACT (background): After conversation
   → New memory: "תרגל תרגיל 4-7-8 בבית" (if user confirms)
   → Update: "התקדמות בנשימה סרעפתית" (if improvement noted)
```
