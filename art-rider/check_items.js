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

async function checkPackageItems() {
  const { data, error } = await supabase.from('package_items').select('*').limit(1);
  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('package_items exists:', data.length > 0 ? Object.keys(data[0]) : 'Empty table');
  }
}

checkPackageItems();
