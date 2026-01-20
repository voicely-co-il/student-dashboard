# PRD: צ'אט (Live Chat System)
> Product Requirements Document v1.0

## Overview
מערכת צ'אט חי בין תלמידים למורים, כולל Widget להטמעה ואפשרות להעברה לנציג אנושי.

---

## Status Summary (from Notion)

| Status | Count |
|--------|-------|
| ✅ הושלם | 3 |
| 🟡 בתהליך | 1 |
| ❌ לא התחיל | 0 |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Chat System                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐  │
│  │  Widget  │───▶│ Chatbot  │───▶│ Human Handoff    │  │
│  │ (Public) │    │   (AI)   │    │ (Teacher/Admin)  │  │
│  └──────────┘    └──────────┘    └──────────────────┘  │
│       │                │                   │            │
│       └────────────────┴───────────────────┘            │
│                        │                                 │
│                 ┌──────▼──────┐                         │
│                 │  Supabase   │                         │
│                 │  Realtime   │                         │
│                 └─────────────┘                         │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Completed Features

### 1. צ'אט חי (Live Chat)
**Status:** ✅ Complete

**Features:**
- Real-time messaging via Supabase Realtime
- Message history persistence
- Read receipts
- Typing indicators
- File/image sharing

**Location:** `src/pages/LiveChat.tsx`, `src/hooks/useLiveChat.ts`

---

### 2. Widget להטמעה (Embeddable Widget)
**Status:** ✅ Complete

**Features:**
- Floating chat button
- Pop-up chat window
- Customizable colors/position
- Auto-greeting message

**Embed Code:**
```html
<script src="https://your-domain.com/chat-embed.js"></script>
<script>
  VoicelyChat.init({
    position: 'bottom-right',
    primaryColor: '#6366f1',
    greeting: 'שלום! איך אוכל לעזור?'
  });
</script>
```

**Location:** `public/chat-embed.js`, `src/components/chat-widget/`

---

### 3. צ'אט מורה (Teacher Chat Interface)
**Status:** ✅ Complete

**Features:**
- List of active conversations
- Conversation view with history
- Quick replies
- Student context (recent lessons, progress)
- Mark as resolved

**Location:** `src/pages/TeacherChat.tsx`, `src/hooks/useTeacherChat.ts`

---

## 🟡 In Progress Features

### 4. העברה לנציג אנושי (Human Handoff)
**Description:** Transfer from AI chatbot to human teacher/admin

**Current State:**
- Basic trigger detection ("speak to human", "נציג")
- Handoff queue exists

**Remaining Work:**
- [ ] Notification to available teacher
- [ ] Accept/decline handoff UI
- [ ] Transfer conversation context to teacher
- [ ] Auto-assign based on availability
- [ ] Fallback if no one available

**Flow:**
```
1. User types "אני רוצה לדבר עם נציג"
2. AI detects handoff intent
3. AI confirms: "מעביר אותך לנציג, רגע..."
4. System finds available teacher
5. Teacher gets notification with context
6. Teacher accepts → conversation transferred
7. If no one available → collect contact info
```

**Acceptance Criteria:**
- [ ] Handoff triggers correctly on phrases
- [ ] Teacher receives push/in-app notification
- [ ] Conversation history visible to teacher
- [ ] Smooth transition (no lost messages)
- [ ] Fallback works when no one available

---

## Database Schema

```sql
-- Conversations
chat_conversations: id, user_id, status, assigned_to,
                    started_at, resolved_at, source,
                    metadata, created_at

-- Messages
chat_messages: id, conversation_id, sender_id, sender_type,
               content, message_type, attachments,
               read_at, created_at

-- Handoff queue
chat_handoff_queue: id, conversation_id, requested_at,
                    accepted_by, accepted_at, status

-- Teacher availability
teacher_availability: id, teacher_id, is_available,
                      last_active_at, max_concurrent_chats
```

---

## Message Types

| Type | Description | Example |
|------|-------------|---------|
| `text` | Plain text message | "שלום, מתי השיעור הבא?" |
| `image` | Image attachment | Photo of sheet music |
| `file` | File attachment | PDF document |
| `audio` | Voice message | 30-second recording |
| `system` | System notification | "הועברת לנציג" |
| `quick_reply` | Predefined options | ["כן", "לא", "אולי"] |

---

## UI Components

| Component | Status | Location |
|-----------|--------|----------|
| `ChatWidget` | ✅ | `src/components/chat-widget/` |
| `ChatBubble` | ✅ | `src/components/chat/ChatBubble.tsx` |
| `ChatInput` | ✅ | `src/components/chat/ChatInput.tsx` |
| `ConversationList` | ✅ | `src/components/chat/ConversationList.tsx` |
| `HandoffNotification` | 🟡 | `src/components/chat/HandoffNotification.tsx` |
| `TeacherChatView` | ✅ | `src/pages/TeacherChat.tsx` |

---

## Real-time Events (Supabase)

| Event | Channel | Payload |
|-------|---------|---------|
| New message | `chat:${conversation_id}` | Message object |
| Typing | `chat:${conversation_id}:typing` | { user_id, is_typing } |
| Read receipt | `chat:${conversation_id}:read` | { message_id, read_at } |
| Handoff request | `handoff:teachers` | { conversation_id, user_info } |
| Status change | `chat:${conversation_id}:status` | { status } |

---

## Integration Points

### With צ'אטבוט (AI Chatbot)
- AI handles initial conversation
- AI detects handoff triggers
- AI summarizes conversation for teacher
- Seamless transition between AI and human

### With תלמיד (Student Dashboard)
- Chat history visible in student profile
- Quick chat button in dashboard
- Context: recent lessons, progress data

### With מורה (Teacher Dashboard)
- Unread conversations badge
- Chat panel in teacher dashboard
- Student context while chatting

---

## Success Metrics

| Metric | Target |
|--------|--------|
| First response time | <2 min (AI), <5 min (human) |
| Resolution rate | 80% without handoff |
| Handoff success rate | 95% accepted within 10 min |
| Customer satisfaction | 4.5+ stars |
| Messages per conversation | <10 average |
