# PRD: צ'אטבוט (AI Chatbot & Integrations)
> Product Requirements Document v1.0

## Overview
צ'אטבוט AI חכם עם RAG, אינטגרציות לערוצים שונים (WhatsApp, Instagram, Telegram), ויכולות מתקדמות.

---

## Status Summary (from Notion)

| Status | Count |
|--------|-------|
| ✅ הושלם | 9 |
| 🟡 בתהליך | 0 |
| ❌ לא התחיל | 16 |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Chatbot System                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CHANNELS                        CORE                            │
│  ┌──────────┐                   ┌────────────────┐              │
│  │ Website  │──────┐            │                │              │
│  └──────────┘      │            │   AI Engine    │              │
│  ┌──────────┐      │            │  (Claude API)  │              │
│  │ WhatsApp │──────┼───────────▶│                │              │
│  └──────────┘      │            │  + RAG Search  │              │
│  ┌──────────┐      │            │  (pgvector)    │              │
│  │ Instagram│──────┤            │                │              │
│  └──────────┘      │            └────────┬───────┘              │
│  ┌──────────┐      │                     │                      │
│  │ Telegram │──────┘                     ▼                      │
│  └──────────┘              ┌─────────────────────────┐          │
│                            │      KNOWLEDGE BASE      │          │
│                            ├─────────────────────────┤          │
│                            │ • 25K+ Transcripts      │          │
│                            │ • Website Content       │          │
│                            │ • FAQs                  │          │
│                            │ • Pricing               │          │
│                            └─────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Completed Features

### AI Core
- [x] **teacher-chat AI** - Chat with transcript context for teachers
- [x] **website-chat AI** - Public chatbot with website RAG
- [x] **Vector Embeddings** - pgvector for semantic search
- [x] **search-transcripts Edge Function** - Semantic search in lessons
- [x] **search-website (RAG) Edge Function** - Website content search
- [x] **generate-lesson-plan Edge Function** - AI lesson planning

### Data Pipeline
- [x] **Google Drive Sync** - Sync 25K+ transcripts from Google Drive
- [x] **Website Scraper** - Scrape voicely.co.il and juniors.voicely.co.il
- [x] **צ'אט אתר (Public)** - Public-facing chatbot on website

---

## ❌ Not Started Features

### CHANNEL INTEGRATIONS

#### 1. WhatsApp Business API
**Priority:** HIGH
**Description:** Two-way WhatsApp messaging for leads and students

**Use Cases:**
| Use Case | Flow |
|----------|------|
| Lead inquiry | Lead messages → AI responds → Handoff if needed |
| Lesson reminder | Automated message 1 day before |
| Marketing broadcast | Send to opted-in contacts |
| Student support | Direct line to teacher/AI |

**Requirements:**
- WhatsApp Business API account (via Twilio/360dialog)
- Webhook for incoming messages
- Template messages for notifications
- Media support (voice notes, images)

**Technical:**
```typescript
// Webhook handler
POST /api/webhooks/whatsapp
{
  from: "+972...",
  body: "מה המחיר לשיעור פרטי?",
  media_url?: "..."
}
```

**Acceptance Criteria:**
- [ ] Can receive and respond to WhatsApp messages
- [ ] AI responses within 5 seconds
- [ ] Template messages for reminders work
- [ ] Voice notes transcribed and processed
- [ ] Handoff to human works

---

#### 2. Instagram DM Bot
**Priority:** Medium
**Description:** Auto-respond to Instagram DMs

**Requirements:**
- Instagram Graph API integration
- Auto-reply to common questions
- Lead capture from DMs
- Human handoff for complex queries

**Acceptance Criteria:**
- [ ] Bot responds to DMs automatically
- [ ] Captures lead info (name, interest)
- [ ] Hands off to human when needed
- [ ] Works with Stories mentions

---

#### 3. Telegram Bot
**Priority:** Low
**Description:** Telegram bot for students and leads

**Requirements:**
- Telegram Bot API
- Commands (/start, /schedule, /help)
- Inline keyboards for options
- Notifications via Telegram

**Acceptance Criteria:**
- [ ] Bot responds to commands
- [ ] Can book trial lesson
- [ ] Can send lesson reminders
- [ ] Supports Hebrew

---

### AI FEATURES

#### 4. ניתוח AI של הקלטות (Recording AI Analysis)
**Priority:** HIGH
**Description:** AI analysis of student practice recordings

**Analysis Output:**
```typescript
interface RecordingAnalysis {
  pitch_accuracy: number;      // 0-100
  rhythm_accuracy: number;     // 0-100
  breath_control: number;      // 0-100
  overall_score: number;       // 0-100
  feedback: string;            // Natural language feedback
  improvement_areas: string[]; // Specific suggestions
  comparison_to_previous?: {   // If previous recordings exist
    improvement: number;
    notes: string;
  }
}
```

**Requirements:**
- Audio processing (Whisper for transcription)
- Pitch detection algorithm
- Comparison to reference track (if provided)
- Progress tracking over time

**Acceptance Criteria:**
- [ ] Processes uploaded recordings
- [ ] Returns structured analysis
- [ ] Provides actionable feedback in Hebrew
- [ ] Shows progress compared to previous recordings

---

#### 5. ניתוח רגש/מצב רוח (Sentiment Analysis)
**Priority:** Low
**Description:** Analyze emotional tone in transcripts

**Use Cases:**
- Detect student frustration
- Track engagement levels
- Identify positive breakthroughs
- Alert teacher to concerning patterns

**Acceptance Criteria:**
- [ ] Extracts sentiment from transcripts
- [ ] Tags lessons with mood indicators
- [ ] Alerts teacher to negative trends
- [ ] Dashboard visualization

---

#### 6. הודעות קוליות בצ'אט (Voice Messages in Chat)
**Priority:** Medium
**Description:** Support voice messages in chatbot

**Flow:**
```
1. User sends voice note (WhatsApp/Web)
2. System transcribes with Whisper
3. AI processes text
4. Response as text + optional audio
```

**Requirements:**
- Audio file handling (storage, conversion)
- Whisper API integration
- Text-to-speech for responses (optional)
- Support in all channels

**Acceptance Criteria:**
- [ ] Voice messages transcribed accurately
- [ ] Hebrew voice recognition works
- [ ] Response time <10 seconds
- [ ] Works on WhatsApp and web

---

#### 7. Voice AI Calls
**Priority:** Low (Future)
**Description:** AI-powered voice calls for sales/support

**Use Cases:**
- Automated trial lesson booking
- Lesson reminder calls
- Lead follow-up calls

**Tech Options:**
- Vapi.ai
- Bland.ai
- Retell.ai

---

### BUSINESS FEATURES

#### 8. אינטגרציית Cal.com (Scheduling)
**Priority:** HIGH
**Description:** Integrate Cal.com for lesson booking

**Features:**
- Chatbot can book trial lessons
- Sync with teacher calendar
- Automatic availability
- Confirmation and reminders

**Integration:**
```typescript
// Book via chatbot
POST /api/cal/book
{
  student_email: "...",
  teacher_id: "...",
  datetime: "...",
  lesson_type: "trial"
}
```

**Acceptance Criteria:**
- [ ] Chatbot can check availability
- [ ] Chatbot can book lessons
- [ ] Syncs with Google Calendar
- [ ] Sends confirmation to student

---

#### 9. תשלום בצ'אט (In-Chat Payments)
**Priority:** Medium
**Description:** Accept payments within chat

**Flow:**
```
User: "אני רוצה להירשם לחודש"
Bot: "מעולה! הנה קישור לתשלום: [link]"
     → User pays → Bot: "התשלום התקבל! נרשמת לחודש ינואר"
```

**Integration Options:**
- Stripe Payment Links
- PayPlus (Israeli)
- bit (for small amounts)

**Acceptance Criteria:**
- [ ] Generate payment link in chat
- [ ] Webhook confirms payment
- [ ] Updates CRM automatically
- [ ] Sends receipt

---

#### 10. Broadcast Messaging
**Priority:** Medium
**Description:** Send bulk messages to segments

**Use Cases:**
| Segment | Message Example |
|---------|-----------------|
| All students | "החלטנו לפתוח קורס חדש!" |
| Inactive (30+ days) | "מתגעגעים! חוזרים לתרגל?" |
| Trial completed | "נהנית מהשיעור? בואי להמשיך!" |
| Birthday | "יום הולדת שמח! 🎂" |

**Channels:**
- WhatsApp (requires templates)
- Email
- Push notifications
- SMS (expensive)

**Acceptance Criteria:**
- [ ] Can create broadcast campaign
- [ ] Can select/create segments
- [ ] Respects opt-out preferences
- [ ] Tracks delivery and opens

---

### ANALYTICS & OPTIMIZATION

#### 11. אנליטיקס צ'אטבוט (Chatbot Analytics)
**Priority:** Medium
**Description:** Dashboard for chatbot performance

**Metrics:**
| Metric | Description |
|--------|-------------|
| Conversations | Total, daily, by channel |
| Resolution rate | % handled by AI only |
| Handoff rate | % requiring human |
| Response time | Average AI response time |
| Satisfaction | Post-chat rating |
| Top intents | Most common questions |
| Drop-off points | Where users abandon |

**Acceptance Criteria:**
- [ ] Dashboard shows all metrics
- [ ] Filter by date range
- [ ] Filter by channel
- [ ] Export to CSV

---

#### 12. A/B Testing צ'אט (Chat A/B Testing)
**Priority:** Low
**Description:** Test different chatbot responses

**Test Types:**
- Greeting message variants
- Response tone (formal vs casual)
- CTA effectiveness
- Flow variations

**Acceptance Criteria:**
- [ ] Can create A/B test
- [ ] Traffic split configurable
- [ ] Conversion tracking
- [ ] Statistical significance indicator

---

### ADVANCED FEATURES

#### 13. סנכרון Notion (Notion Sync)
**Priority:** Medium
**Description:** Two-way sync with Notion CRM

**Sync Items:**
| Direction | Data |
|-----------|------|
| Notion → App | Student profiles, lesson notes |
| App → Notion | New leads, chat transcripts, bookings |

**Acceptance Criteria:**
- [ ] New leads create Notion page
- [ ] Chat transcript linked to student
- [ ] Booking syncs to Notion
- [ ] Runs automatically (cron)

---

#### 14. סגמנטציה ותיוגים (Segmentation & Tags)
**Priority:** Medium
**Description:** Tag contacts for targeted messaging

**Auto-Tags:**
| Tag | Trigger |
|-----|---------|
| `lead` | First chat message |
| `trial_booked` | Booked trial lesson |
| `student` | Active paying student |
| `churned` | Inactive 60+ days |
| `high_engagement` | 3+ messages/week |

**Acceptance Criteria:**
- [ ] Auto-tagging works
- [ ] Manual tag editing
- [ ] Segment builder UI
- [ ] Use in broadcasts

---

#### 15. Multi-Agent System
**Priority:** Low (Future)
**Description:** Multiple specialized AI agents

**Agents:**
| Agent | Role |
|-------|------|
| Sales Agent | Handle leads, book trials |
| Support Agent | Answer questions, troubleshoot |
| Teacher Assistant | Help with lesson prep |
| Admin Agent | Handle billing, scheduling |

**Requires:** Agent orchestration framework

---

#### 16. Visual Flow Builder
**Priority:** Low (Future)
**Description:** No-code chatbot flow editor

**Features:**
- Drag-and-drop flow builder
- Condition nodes (if/else)
- Integration nodes (book, pay, notify)
- Testing in editor

**Similar To:** Voiceflow, Botpress, Landbot

---

## Database Schema

```sql
-- Chatbot conversations (extends chat_conversations)
chatbot_sessions: id, channel, user_identifier, context,
                  resolved_by, satisfaction_rating, created_at

-- Chatbot messages (extends chat_messages)
chatbot_messages: id, session_id, role, content, intent,
                  confidence, tokens_used, created_at

-- Broadcasts
broadcasts: id, name, segment_query, message_template,
            channels, scheduled_at, sent_at, stats

-- Channel configs
channel_configs: id, channel_type, credentials, webhook_url,
                 is_active, created_at

-- Lead tracking
leads: id, source_channel, contact_info, tags, status,
       assigned_to, notes, created_at
```

---

## Edge Functions (Supabase)

| Function | Status | Purpose |
|----------|--------|---------|
| `search-transcripts` | ✅ | Semantic search in lessons |
| `search-website` | ✅ | RAG on website content |
| `generate-lesson-plan` | ✅ | AI lesson planning |
| `teacher-chat` | ✅ | Teacher AI assistant |
| `website-chat` | ✅ | Public chatbot |
| `whatsapp-webhook` | ❌ | Handle WhatsApp messages |
| `analyze-recording` | ❌ | AI recording analysis |
| `broadcast-send` | ❌ | Send bulk messages |
| `notion-sync` | ❌ | Two-way Notion sync |

---

## Integration Priority

### Phase 1 (Now)
1. **WhatsApp Business API** - Highest ROI for leads
2. **Cal.com Integration** - Enable booking via chat
3. **Recording AI Analysis** - Core product value

### Phase 2 (Next)
4. **Chatbot Analytics** - Measure and improve
5. **Broadcast Messaging** - Marketing automation
6. **Voice Messages** - Better UX

### Phase 3 (Later)
7. **Notion Sync** - Operations efficiency
8. **Instagram/Telegram** - Expand channels
9. **Payment in Chat** - Conversion optimization

### Phase 4 (Future)
10. **Multi-Agent System** - Advanced automation
11. **Visual Flow Builder** - No-code customization
12. **Voice AI Calls** - Outbound automation

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Lead response time | <1 min (AI) |
| Lead → Trial conversion | 30%+ |
| AI resolution rate | 70%+ |
| Channel coverage | WhatsApp + Web |
| Monthly active conversations | 500+ |
