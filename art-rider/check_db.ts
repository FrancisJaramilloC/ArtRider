import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkKnowledgeBase() {
  const tables = [
    "event_types",
    "venue_types",
    "activity_types",
    "guest_score_ranges",
    "ecs_thresholds",
    "requirement_thresholds",
    "stage_thresholds"
  ];

  console.log("Checking Advisory Knowledge Base Tables...\n");

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) {
      console.log(`❌ Table ${table}: ERROR - ${error.message}`);
    } else {
      console.log(`✅ Table ${table}: ${count} rows`);
    }
  }
}

checkKnowledgeBase();
