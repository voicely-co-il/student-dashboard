import "dotenv/config";
import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

const credentialsPath = path.join(process.env.HOME || "", ".google", "gcp-oauth.keys.json");
const tokenPath = path.join(process.env.HOME || "", ".google", "gdrive-token.json");

const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf-8"));
const { client_id, client_secret } = credentials.installed;
const oauth2Client = new google.auth.OAuth2(client_id, client_secret, "urn:ietf:wg:oauth:2.0:oob");
const token = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));
oauth2Client.setCredentials(token);

const drive = google.drive({ version: "v3", auth: oauth2Client });

async function main() {
  // Check inside "תלמידים" folder
  console.log("=== Files in תלמידים folder ===");
  const studentsResponse = await drive.files.list({
    q: "'1yPX4LOECP9XA1rBI5U5txSCvQsByW1yh' in parents",
    fields: "files(id, name, mimeType)",
    pageSize: 30,
  });
  studentsResponse.data.files?.forEach(f => console.log(`- ${f.name} (${f.mimeType}) - ${f.id}`));

  // Search for any doc with "Transcript" in name
  console.log("\n=== Search for Transcripts ===");
  const searchResponse = await drive.files.list({
    q: "name contains 'Transcript' or name contains 'תמלול'",
    fields: "files(id, name, mimeType, parents)",
    pageSize: 10,
  });
  searchResponse.data.files?.forEach(f => console.log(`- ${f.name}\n  ID: ${f.id}\n  Parents: ${f.parents}`));
}

main();
