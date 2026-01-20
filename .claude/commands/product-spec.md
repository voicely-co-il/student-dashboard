# Voicely Dashboard - Product Specification v1.0

## Overview
מערכת דשבורדים לניהול ומעקב אחר תלמידי פיתוח קול של Voicely.

---

## 1. Student Dashboard (תלמידים פרטניים)

### 1.1 Target Users
תלמידים בשיעורים פרטיים (1-on-1) עם ענבל או מורות אחרות.

### 1.2 Core Features

#### Dashboard Home
- [ ] **Progress Overview** - סיכום התקדמות כללי
- [ ] **Recent Lessons** - שיעורים אחרונים עם תאריך ונושא
- [ ] **Next Lesson** - השיעור הבא עם countdown
- [ ] **Achievements** - הישגים ותגים שנצברו

#### AI Insights (מותנה בנתונים מהתמלולים)
- [ ] **Personal Tips** - טיפים מותאמים אישית מבוססי AI
- [ ] **Focus Areas** - תחומים לשיפור שזוהו מהשיעורים
- [ ] **Progress Trends** - גרפים של התקדמות לאורך זמן

#### Recordings & Practice
- [ ] **My Recordings** - הקלטות תרגול שהתלמיד העלה
- [ ] **AI Feedback** - משוב AI על הקלטות
- [ ] **Practice Exercises** - תרגילים מומלצים

#### Lesson History
- [ ] **Past Lessons List** - רשימת שיעורים עם פילטרים
- [ ] **Lesson Summary** - סיכום AI לכל שיעור
- [ ] **Key Takeaways** - נקודות עיקריות מכל שיעור

#### Gamification & Engagement
- [ ] **Streak System** - רצף ימי תרגול (🔥)
  - מונה ימים רצופים של תרגול/שיעור
  - Streak Freeze - הגנה על הרצף (פעם בשבוע)
  - Milestone celebrations (7, 30, 100, 365 ימים)
- [ ] **XP Points** - נקודות על כל פעולה
  - תרגול יומי: 10 XP
  - השלמת שיעור: 50 XP
  - העלאת הקלטה: 20 XP
  - קבלת משוב AI: 15 XP
- [ ] **Levels** - רמות התקדמות (מתחיל → מומחה)
- [ ] **Daily Goals** - מטרה יומית (X דקות תרגול)
- [ ] **Badges** - תגי הישגים לפי rarity:
  - Common (אפור) - הישגים בסיסיים
  - Rare (כחול) - הישגים מתקדמים
  - Epic (סגול) - הישגים מיוחדים
  - Legendary (זהב) - הישגים נדירים

---

## 1.2 Group Student Dashboard (תלמידי קבוצה)

### Target Users
תלמידים שלומדים במסגרת קבוצתית (כגון מקהלה, קבוצת קול).

### Differences from Private Students

#### Group Features
- [ ] **Group Progress** - התקדמות הקבוצה כולה
- [ ] **Group Schedule** - לוח זמנים קבוצתי
- [ ] **Group Achievements** - הישגים קבוצתיים משותפים
- [ ] **Group Members** - רשימת חברי הקבוצה
- [ ] **Group Leaderboard** - טבלת מובילים שבועית (מי תרגל הכי הרבה)
- [ ] **Weekly Challenges** - אתגרים קבוצתיים שבועיים

#### Personal Section (בתוך הדשבורד הקבוצתי)
- [ ] **My Personal Insights** - טיפים אישיים מה-AI
- [ ] **My Contribution** - הערכת התרומה האישית לקבוצה
- [ ] **Personal Goals** - מטרות אישיות בתוך הקבוצה
- [ ] **My Attendance** - נוכחות אישית

### Shared vs Personal Data
| Data Type | Group View | Personal View |
|-----------|------------|---------------|
| Lesson Notes | Shared | Personal tips |
| Attendance | Group stats | Personal record |
| Recordings | Group performances | Personal practice |
| Feedback | General | Personalized AI |

---

## 2. Teacher Dashboard - Inbal (Owner/Admin)

### 2.1 Target User
ענבל - מנהלת ומורה ראשית של Voicely.

### 2.2 Full Permissions
מלא גישה לכל הפיצ'רים והנתונים במערכת.

### Core Features

#### Students Management
- [ ] **All Students View** - רשימת כל התלמידים
- [ ] **Student Profiles** - פרופיל מפורט לכל תלמיד
- [ ] **Add/Edit/Remove Students** - ניהול תלמידים
- [ ] **Assign to Groups** - שיוך לקבוצות

#### Groups Management
- [ ] **All Groups** - רשימת קבוצות
- [ ] **Create/Edit Groups** - יצירה ועריכת קבוצות
- [ ] **Group Analytics** - סטטיסטיקות קבוצתיות

#### Lessons & Schedule
- [ ] **Calendar View** - לוח שיעורים
- [ ] **Schedule Lessons** - קביעת שיעורים
- [ ] **Lesson Templates** - תבניות שיעור

#### AI Tools (הפיצ'ר המרכזי!)
- [ ] **Semantic Search** - חיפוש חכם בכל התמלולים
  - חיפוש לפי נושא/מושג
  - חיפוש לפי תלמיד
  - חיפוש לפי טווח תאריכים
- [ ] **Generate Lesson Plan** - יצירת תוכנית שיעור מבוססת AI
  - מבוסס היסטוריית התלמיד
  - המלצות לנושאים
  - תרגילים מותאמים
- [ ] **Student Insights** - תובנות AI על כל תלמיד
- [ ] **Bulk Analysis** - ניתוח מגמות כלל-מערכתי

#### Analytics & Reports
- [ ] **Business Dashboard** - נתונים עסקיים
- [ ] **Student Progress Reports** - דוחות התקדמות
- [ ] **Revenue Tracking** - מעקב הכנסות
- [ ] **Attendance Reports** - דוחות נוכחות

#### System Administration
- [ ] **User Management** - ניהול משתמשים
- [ ] **Permissions** - הרשאות
- [ ] **System Settings** - הגדרות מערכת
- [ ] **Sync Management** - ניהול סנכרון Google Drive
- [ ] **Billing** - חיוב ותשלומים

---

## 2.1 Teacher Dashboard - Other Teachers (Limited)

### Target Users
מורות נוספות שיגויסו ל-Voicely.

### Permission Levels

#### Can Access
- [ ] **Own Students Only** - רק התלמידים שלהן
- [ ] **Own Schedule** - הלוח זמנים שלהן
- [ ] **Own Groups** - הקבוצות שהן מנהלות
- [ ] **AI Search** - חיפוש רק בתמלולים של התלמידים שלהן
- [ ] **Generate Lesson Plans** - רק לתלמידים שלהן

#### Cannot Access
- [ ] **Other Teachers' Students** - תלמידים של מורות אחרות
- [ ] **Business Analytics** - נתונים עסקיים
- [ ] **Revenue Data** - נתוני הכנסות
- [ ] **System Settings** - הגדרות מערכת
- [ ] **User Management** - ניהול משתמשים
- [ ] **Billing** - חיובים

### Features Comparison

| Feature | Inbal (Admin) | Other Teachers |
|---------|---------------|----------------|
| All Students | Yes | Own Only |
| All Groups | Yes | Own Only |
| AI Search | Full | Own Students |
| Lesson Plans | Full | Own Students |
| Business Data | Yes | No |
| System Admin | Yes | No |
| Sync Control | Yes | No |
| Add Teachers | Yes | No |

---

## Critical System Features

### Authentication & Login
- **Method:** Google OAuth (תלמידים מתחברים עם הג'ימייל שלהם)
- **Flow:**
  1. תלמיד מקבל הזמנה בוואטסאפ/מייל עם קישור
  2. לוחץ על הקישור → מופנה ל-Google Login
  3. אחרי אימות → נכנס לדשבורד האישי
- **First Login:** יצירת פרופיל אוטומטית

### Student Identification (קישור תמלולים לתלמידים)
**בעיה:** איך המערכת יודעת לקשר תמלול לתלמיד?

**אפשרויות:**
1. **מבנה תיקיות ב-Drive** - כל תלמיד בתיקייה נפרדת
2. **שם בכותרת** - "Transcript: Vocal Lesson — Ariana | Dec 04"
3. **טבלת mapping** - קישור ידני של שם ↔ user_id
4. **AI extraction** - זיהוי שם מתוך התמלול עצמו

**המלצה:** שילוב של 2+3 - זיהוי מכותרת + טבלת mapping לתיקון

### Onboarding Flow (הוספת תלמיד חדש)
```
1. ענבל מוסיפה תלמיד במערכת (שם + אימייל + טלפון)
2. המערכת שולחת הזמנה (וואטסאפ/מייל) עם קישור
3. תלמיד לוחץ → Google OAuth → פרופיל נוצר
4. תלמיד רואה את הדשבורד שלו
```

### Notifications (התראות)
**ערוצים:**
- Push Notifications (Web + App)
- WhatsApp (via API)
- Email

**סוגי התראות:**
- [ ] תזכורת לשיעור (יום לפני / שעה לפני)
- [ ] סיכום שיעור זמין
- [ ] טיפ חדש מה-AI
- [ ] הישג חדש נפתח
- [ ] תזכורת לתרגול
- [ ] ⚠️ רצף בסכנה! (לא תרגלת היום - הרצף שלך עומד להישבר)

**Backend:** Vercel Cron Jobs + Supabase Edge Functions

### Mobile App
**גישה:** React Native / Expo (שיתוף קוד עם ה-Web)
- אותו UI מותאם למובייל
- Push notifications
- הקלטה ישירות מהאפליקציה

### Payments (תשלומים)
**Phase 1:** לינק תשלום ידני (bit/paybox)
**Phase 2:** אינטגרציה עם:
- Stripe
- PayPlus (ישראלי)
- מנוי חודשי אוטומטי

---

## Technical Architecture

### User Roles (Supabase)
```
admin     - Inbal (full access)
teacher   - Other teachers (limited)
student   - Individual students
group_student - Students in groups
```

### Database Relations
```
users
  └── profiles (role, teacher_id for students)
        └── lessons (teacher_id, student_id)
        └── groups (owner_id)
              └── group_members (user_id)
        └── transcripts (linked via student matching)
        └── student_name_mapping (name → user_id)
```

### AI Features Backend
- **pgvector** for semantic search
- **OpenAI embeddings** for transcript chunks
- **Claude/GPT** for lesson plan generation
- **Edge Functions** for serverless AI operations

### Notifications Stack
- **Vercel Cron** - scheduled jobs
- **Supabase Edge Functions** - processing
- **Twilio/WhatsApp Business API** - WhatsApp messages
- **SendGrid/Resend** - emails
- **Firebase Cloud Messaging** - push notifications

---

## Security & Privacy

### Data Sensitivity Classification
| רמה | סוג נתונים | דוגמאות |
|-----|-----------|---------|
| 🔴 **Critical** | תוכן אישי | תמלולים, הקלטות, learning_insights |
| 🟠 **High** | פרטים מזהים | email, phone, שם מלא |
| 🟡 **Medium** | נתוני התקדמות | scores, streaks, attendance |
| 🟢 **Low** | תוכן ציבורי | achievements, exercises, leaderboard metadata |

### Row Level Security (RLS) Policies

#### Students
- [ ] יכולים לראות **רק** את הנתונים שלהם
- [ ] יכולים להעלות הקלטות **רק** לתיקייה שלהם
- [ ] **לא** יכולים לראות תלמידים אחרים

#### Teachers
- [ ] יכולים לראות **רק** את התלמידים שלהם
- [ ] **לא** יכולים לראות תלמידים של מורות אחרות
- [ ] יכולים לערוך lessons ו-feedback **רק** לתלמידים שלהם

#### Admins
- [ ] גישה מלאה לכל הנתונים
- [ ] Audit log על כל פעולה

### Storage Security (הקלטות)
- [ ] Bucket פרטי (לא public)
- [ ] Signed URLs עם expiry (1 שעה)
- [ ] Folder structure: `/{user_id}/{recording_id}`
- [ ] RLS על storage.objects

### Audit Logging
לוג כל גישה לנתונים רגישים:
- [ ] צפייה בתמלולים
- [ ] הורדת הקלטות
- [ ] שינוי הרשאות
- [ ] Admin impersonation

### GDPR Compliance
- [ ] **Right to Access** - export כל הנתונים של המשתמש
- [ ] **Right to Deletion** - מחיקת כל הנתונים
- [ ] **Consent Tracking** - תיעוד הסכמות
- [ ] **Privacy Policy** - מסמך מדיניות פרטיות

### API Security
- [ ] Rate limiting על Edge Functions
- [ ] Input validation על כל endpoint
- [ ] Error messages לא חושפים מידע פנימי
- [ ] CORS מוגבל לדומיינים מורשים

---

## Implementation Priority

### Phase 1 (MVP)
1. Teacher Dashboard - AI Search
2. Teacher Dashboard - Lesson Plan Generation
3. Basic Student Dashboard
4. **Streak System + Daily Goals** (engagement בסיסי)

### Phase 2
1. Group Student Dashboard
2. Other Teachers Dashboard (limited)
3. Advanced Analytics

### Phase 3
1. Recording Upload & AI Feedback
2. Practice Exercises
3. Billing & Payments

---

## Notes
- All UI must be RTL (Hebrew)
- Mobile-responsive design
- Dark mode support (optional)
