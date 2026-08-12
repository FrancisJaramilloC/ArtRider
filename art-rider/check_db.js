import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const envFile = fs.readFileSync(".env", "utf8");
const envVars = envFile.split("\n").reduce((acc, line) => {
  const [key, ...valueParts] = line.split("=");
  const value = valueParts.join("=");
  if (key && value) {
    acc[key.trim()] = value.trim().replace(/"/g, '');
  }
  return acc;
}, {});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
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
