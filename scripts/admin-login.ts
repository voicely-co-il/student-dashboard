/**
 * Quick Admin Login Script
 * Generates a magic link for admin testing
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const email = process.argv[2] || "info@compumit.com";

  console.log(`\n🔐 Generating magic link for: ${email}\n`);

  // Check if user exists
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error("Error listing users:", listError);
    return;
  }

  const user = users?.find(u => u.email === email);

  if (!user) {
    console.log(`User ${email} not found. Creating...`);
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: "Admin" }
    });
    if (error) {
      console.error("Error creating user:", error);
      return;
    }
    console.log("User created:", data.user?.id);

    // Add admin role
    await supabase.from("user_roles").insert({
      user_id: data.user?.id,
      role: "admin",
      is_active: true
    });
    console.log("Admin role assigned\n");
  } else {
    console.log(`Found user: ${user.id}`);

    // Check role
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (role) {
      console.log(`Role: ${role.role}\n`);
    } else {
      console.log("Role: none\n");
    }
  }

  // Generate magic link
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: {
      redirectTo: "https://voicely-il.vercel.app/admin"
    }
  });

  if (error) {
    console.error("Error generating link:", error);
    return;
  }

  const link = data.properties?.action_link;
  console.log("✅ Magic Link (click to login):\n");
  console.log(link);
  console.log("\n⏰ Link expires in 1 hour\n");
}

main().catch(console.error);
