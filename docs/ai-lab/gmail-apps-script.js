/**
 * AI Lab - Newsletter Ingestion via Google Apps Script
 *
 * הוראות התקנה:
 * 1. לך ל-script.google.com
 * 2. צור פרויקט חדש
 * 3. העתק את הקוד הזה
 * 4. הרץ פעם אחת את checkNewsletters() כדי לאשר הרשאות
 * 5. הגדר Trigger: Edit → Triggers → Add Trigger
 *    - Function: checkNewsletters
 *    - Event source: Time-driven
 *    - Type: Minutes timer
 *    - Interval: Every 15 minutes
 */

// הגדרות
const SUPABASE_URL = "https://jldfxkbczzxawdqsznze.supabase.co/functions/v1/ingest-newsletter-email";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsZGZ4a2Jjenp4YXdkcXN6bnplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg3NjM3OCwiZXhwIjoyMDY4NDUyMzc4fQ.GrGzWkdf-NtL_0h5FMkW8dnHUpLBzhgdcQIJYqPNE2M";

// שולחים לסנן (ניוזלטרים)
const NEWSLETTER_SENDERS = [
  "ben@bensbites.com",
  "hello@mail.beehiiv.com",
  "noam@benina.beehiiv.com",
  "newsletter@therundown.ai",
  "dan@tldrnewsletter.com"
];

// Label לסימון מיילים שכבר עובדו
const PROCESSED_LABEL = "AI-Lab-Processed";

function checkNewsletters() {
  // צור label אם לא קיים
  let label = GmailApp.getUserLabelByName(PROCESSED_LABEL);
  if (!label) {
    label = GmailApp.createLabel(PROCESSED_LABEL);
  }

  // חפש מיילים חדשים מהשולחים
  const query = NEWSLETTER_SENDERS.map(s => `from:${s}`).join(" OR ");
  const threads = GmailApp.search(`(${query}) -label:${PROCESSED_LABEL} newer_than:1d`, 0, 10);

  Logger.log(`Found ${threads.length} new newsletter threads`);

  for (const thread of threads) {
    const messages = thread.getMessages();

    for (const message of messages) {
      const from = message.getFrom();

      // ודא שזה מהשולחים שלנו
      if (!NEWSLETTER_SENDERS.some(s => from.toLowerCase().includes(s.toLowerCase()))) {
        continue;
      }

      try {
        sendToSupabase({
          from: from,
          subject: message.getSubject(),
          html: message.getBody(),
          text: message.getPlainBody(),
          date: message.getDate().toISOString()
        });

        Logger.log(`Processed: ${message.getSubject()}`);
      } catch (e) {
        Logger.log(`Error processing ${message.getSubject()}: ${e}`);
      }
    }

    // סמן כמעובד
    thread.addLabel(label);
  }
}

function sendToSupabase(emailData) {
  const options = {
    method: "POST",
    contentType: "application/json",
    headers: {
      "Authorization": `Bearer ${SUPABASE_KEY}`
    },
    payload: JSON.stringify(emailData),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(SUPABASE_URL, options);
  const result = JSON.parse(response.getContentText());

  if (!result.success) {
    throw new Error(result.error || "Unknown error");
  }

  Logger.log(`Supabase response: ${JSON.stringify(result)}`);
  return result;
}

// פונקציה לבדיקה ידנית
function testWithLatestNewsletter() {
  const query = NEWSLETTER_SENDERS.map(s => `from:${s}`).join(" OR ");
  const threads = GmailApp.search(`(${query})`, 0, 1);

  if (threads.length === 0) {
    Logger.log("No newsletters found");
    return;
  }

  const message = threads[0].getMessages()[0];
  Logger.log(`Testing with: ${message.getSubject()}`);

  const result = sendToSupabase({
    from: message.getFrom(),
    subject: message.getSubject(),
    html: message.getBody(),
    text: message.getPlainBody(),
    date: message.getDate().toISOString()
  });

  Logger.log(`Result: ${JSON.stringify(result)}`);
}
