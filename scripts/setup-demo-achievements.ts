import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const GILI_ID = "658c9634-9bf7-4365-a087-5d3e677d645e";
const BEN_ID = "ad49193c-a376-43c5-b811-3c1f7b89d31f";

async function setupAchievements() {
  // Existing achievement IDs (from DB)
  const EXISTING_ACHIEVEMENTS = {
    "מתחיל נלהב": "d0fe8eba-f508-4fd2-995a-b95e5d3ea41c",
    "רצף שבועי": "bf99cfac-c0b3-4175-9736-3e3099ad9c59",
    "מומחה טונאלי": "1c6ef55d-96a7-4581-b5c8-37d1bdba7c70"
  };

  // Add more achievements
  const { error: createError } = await supabase.from("achievements").upsert([
    { name: "על גל", description: "תרגול ברצף במשך 14 ימים", icon: "🌟", type: "streak", badge_rarity: "epic", requirements: { streak_days: 14 }, points: 100, is_active: true },
    { name: "מתמיד", description: "השלמת 10 שיעורים", icon: "📚", type: "completion", badge_rarity: "rare", requirements: { lessons_completed: 10 }, points: 75, is_active: true },
    { name: "אמן קולי", description: "השלמת 20 שיעורים", icon: "🏆", type: "completion", badge_rarity: "epic", requirements: { lessons_completed: 20 }, points: 150, is_active: true },
    { name: "כוכב עולה", description: "הגעת לציון ממוצע של 70 ומעלה", icon: "⭐", type: "score", badge_rarity: "rare", requirements: { avg_score: 70 }, points: 80, is_active: true },
  ], { onConflict: "name" });

  if (createError) {
    console.error("Error creating achievements:", createError);
  } else {
    console.log("✅ Achievements created/updated");
  }

  // Fetch all achievements
  const { data: allAch } = await supabase.from("achievements").select("id, name").limit(20);

  if (allAch === null) return;

  console.log("All achievements:", allAch.map(a => a.name));

  const achMap: Record<string, string> = {};
  allAch.forEach(a => { achMap[a.name] = a.id; });

  // Gili: 26 lessons, streak 12/18, score 78 - gets more achievements
  const giliAchIds = [
    achMap["מתחיל נלהב"],    // First exercise
    achMap["רצף שבועי"],     // 7 day streak (has 12)
    achMap["על גל"],         // 14 day streak (had 18 longest)
    achMap["מתמיד"],         // 10 lessons (has 26)
    achMap["אמן קולי"],      // 20 lessons (has 26)
    achMap["כוכב עולה"],     // Score 70+ (has 78)
  ].filter(Boolean);

  // Ben: 9 lessons, streak 5/14, score 65 - basic achievements
  const benAchIds = [
    achMap["מתחיל נלהב"],    // First exercise
    achMap["רצף שבועי"],     // 7 day streak (had 14 longest)
  ].filter(Boolean);

  console.log("Gili achievements:", giliAchIds);
  console.log("Ben achievements:", benAchIds);

  const userAchievements = [
    ...giliAchIds.map((achId, i) => ({
      user_id: GILI_ID,
      achievement_id: achId,
      earned_at: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString()
    })),
    ...benAchIds.map((achId, i) => ({
      user_id: BEN_ID,
      achievement_id: achId,
      earned_at: new Date(Date.now() - i * 5 * 24 * 60 * 60 * 1000).toISOString()
    }))
  ];

  const { error } = await supabase.from("user_achievements").upsert(
    userAchievements,
    { onConflict: "user_id,achievement_id" }
  );

  if (error) {
    console.error("Error assigning achievements:", error);
  } else {
    console.log("✅ Achievements assigned");
    console.log("   Gili:", giliAchIds.length, "achievements");
    console.log("   Ben:", benAchIds.length, "achievements");
  }
}

setupAchievements();
