# Security & Privacy Audit

Audit security vulnerabilities and privacy concerns for Voicely - a voice learning platform with **highly sensitive data**.

## Data Sensitivity Level: HIGH

### Why This Data is Sensitive:
- **Lesson transcripts** contain personal conversations between teacher and student
- Students may share **personal struggles**, health issues, emotional state
- **Voice recordings** are biometric data (can identify individuals)
- **Progress data** reveals learning difficulties
- **Payment information** if billing is implemented
- **Contact details** (phone, email) for minors may be involved

---

## Security Checklist

### 1. Authentication & Authorization

#### Must Have:
- [ ] **RLS (Row Level Security)** enabled on ALL tables
- [ ] **Service role key** NEVER exposed to client
- [ ] **Anon key** only used for public operations
- [ ] **JWT validation** on all API routes
- [ ] **Session expiry** configured (not infinite)
- [ ] **OAuth state parameter** to prevent CSRF

#### Check for:
```sql
-- Verify RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- All should show rowsecurity = true
```

### 2. Row Level Security Policies

#### Critical Tables Requiring RLS:

| Table | Student Access | Teacher Access | Admin Access |
|-------|----------------|----------------|--------------|
| `users` | Own record only | Own students | All |
| `profiles` | Own record only | Own students | All |
| `transcriptions` | Own only | Own students only | All |
| `recordings` | Own only | Own students only | All |
| `ai_analysis` | Own only | Own students only | All |
| `learning_insights` | Own only | Own students only | All |
| `lessons` | Participant only | Own lessons | All |
| `user_stats` | Own only | Own students | All |
| `user_progress` | Own only | Own students | All |

#### Example RLS Policies:
```sql
-- Students can only see their own transcriptions
CREATE POLICY "Students view own transcriptions"
ON transcriptions FOR SELECT
USING (auth.uid() = user_id);

-- Teachers can only see their students' transcriptions
CREATE POLICY "Teachers view student transcriptions"
ON transcriptions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = transcriptions.user_id
    AND users.teacher = auth.uid()
  )
);
```

### 3. API Security

#### Supabase Client:
```typescript
// NEVER do this - exposes all data
const { data } = await supabase.from('transcriptions').select('*');

// ALWAYS rely on RLS - user only sees their data
const { data } = await supabase
  .from('transcriptions')
  .select('*')
  .eq('user_id', user.id); // Belt and suspenders
```

#### Edge Functions:
- [ ] Validate `Authorization` header
- [ ] Check user role before operations
- [ ] Rate limiting on AI endpoints
- [ ] Input sanitization

### 4. Data Exposure Risks

#### Frontend Console Leaks:
```typescript
// NEVER log sensitive data
console.log(transcription); // ❌ WRONG

// Use minimal logging
console.log(`Loaded ${transcriptions.length} items`); // ✅ OK
```

#### React Query Cache:
```typescript
// Be careful with queryKey - it's visible in DevTools
queryKey: ['transcriptions', { studentId, lessonId }]
// Consider if this reveals too much
```

#### Error Messages:
```typescript
// NEVER expose internal errors to users
catch (error) {
  // ❌ WRONG
  toast.error(error.message); // May contain SQL/internal info

  // ✅ CORRECT
  toast.error('שגיאה בטעינת הנתונים');
  console.error(error); // Log for debugging only
}
```

### 5. Storage Security (Recordings)

#### Supabase Storage Policies:
```sql
-- Students can only upload to their folder
CREATE POLICY "Students upload own recordings"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'recordings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Students can only read their own recordings
CREATE POLICY "Students read own recordings"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'recordings' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Signed URLs:
```typescript
// NEVER use public URLs for recordings
const { data: { publicUrl } } = supabase.storage
  .from('recordings')
  .getPublicUrl(path); // ❌ WRONG - anyone can access

// ALWAYS use signed URLs with expiry
const { data: { signedUrl } } = await supabase.storage
  .from('recordings')
  .createSignedUrl(path, 3600); // ✅ Expires in 1 hour
```

### 6. Environment Variables

#### Required Security:
```env
# .env.local (NEVER commit)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...  # Public key only

# Server-side only (Edge Functions)
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # NEVER in frontend
OPENAI_API_KEY=sk-...
```

#### Vercel Environment:
- [ ] All secrets in Vercel dashboard, not in code
- [ ] Preview deployments use different keys
- [ ] Production secrets not in preview

### 7. GDPR / Privacy Compliance

#### Data Subject Rights:
- [ ] **Right to Access** - Export user's data
- [ ] **Right to Deletion** - Delete all user data
- [ ] **Right to Portability** - Download in standard format
- [ ] **Consent tracking** - When/what user agreed to

#### Data Retention:
```sql
-- Consider auto-deletion of old data
-- Transcriptions older than X years?
-- Recordings after student leaves?
```

#### Privacy Policy Requirements:
- [ ] What data is collected
- [ ] How AI processes the data
- [ ] Third-party services (OpenAI, Google, etc.)
- [ ] Data storage location (Supabase region)
- [ ] Contact for privacy requests

### 8. AI-Specific Risks

#### OpenAI Data:
- [ ] Review OpenAI data usage policy
- [ ] Consider: transcripts sent to OpenAI for embeddings
- [ ] Consider: lesson content sent for summaries
- [ ] Option: Use Azure OpenAI (more control)

#### Prompt Injection:
```typescript
// NEVER include user input directly in prompts
const prompt = `Summarize: ${userText}`; // ❌ Risky

// Sanitize and structure
const prompt = {
  role: 'system',
  content: 'Summarize the following lesson transcript.'
};
const userMessage = {
  role: 'user',
  content: sanitize(userText) // Clean input
};
```

### 9. Audit Logging

#### What to Log:
```sql
-- Create audit table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Log sensitive access
-- - Viewing transcriptions
-- - Downloading recordings
-- - Admin impersonation
-- - Data exports
```

### 10. Common Vulnerabilities

#### XSS Prevention:
```typescript
// React handles this, but be careful with:
<div dangerouslySetInnerHTML={{ __html: content }} /> // ❌ Never with user content

// Sanitize if needed
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
```

#### SQL Injection:
```typescript
// Supabase client is safe, but in Edge Functions:
// ❌ NEVER
const { data } = await supabase.rpc('search', { query: userInput });

// ✅ Use parameterized queries
```

---

## Security Audit Workflow

When running `/security-audit`:

1. **Check RLS Status** - Query all tables for row security
2. **Review Policies** - List all RLS policies
3. **Scan for Exposed Keys** - Search codebase for secrets
4. **Check Storage Policies** - Verify bucket security
5. **Review API Calls** - Look for unprotected queries
6. **Check Logging** - Ensure no sensitive data in logs
7. **Verify Environment** - Check .env files not committed

---

## Red Flags to Look For

```
🚨 CRITICAL:
- Service role key in frontend code
- RLS disabled on sensitive tables
- Public storage buckets
- Console.log with user data
- Hardcoded API keys

⚠️ WARNING:
- Missing input validation
- Overly permissive RLS policies
- No audit logging
- Infinite session expiry
- Error messages exposing internals
```

---

## Recommended Security Stack

- **Auth:** Supabase Auth with Google OAuth
- **Authorization:** RLS + custom claims
- **Secrets:** Vercel Environment Variables
- **Monitoring:** Supabase Logs + Sentry
- **Audit:** Custom audit_log table
- **Compliance:** Privacy policy + consent tracking
