import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const externalSyncUrl = process.env.NCC_EXTERNAL_SYNC_URL;
const externalSyncToken = process.env.NCC_EXTERNAL_SYNC_TOKEN;

if (!supabaseUrl || !serviceRoleKey || !externalSyncUrl || !externalSyncToken) {
  throw new Error(
    "External sync requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NCC_EXTERNAL_SYNC_URL, and NCC_EXTERNAL_SYNC_TOKEN in .env.",
  );
}

const submissionsUrl = new URL("/rest/v1/recruitment_submissions", supabaseUrl);
submissionsUrl.searchParams.set("select", "*");
submissionsUrl.searchParams.set("order", "created_at.asc");

const submissionsResponse = await fetch(submissionsUrl, {
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  },
});

if (!submissionsResponse.ok) {
  throw new Error(
    `Could not export recruitment submissions (Supabase returned ${submissionsResponse.status}).`,
  );
}

const submissions = await submissionsResponse.json();
const payload = {
  export_timestamp: new Date().toISOString(),
  total_records: submissions.length,
  students: submissions.map((submission) => ({
    student_id: submission.student_id,
    full_name: submission.full_name,
    department: submission.department,
    whatsapp: submission.whatsapp_num,
    email: submission.email,
    photo_url: submission.photo_url,
    segments: submission.segments,
    xp_earned: submission.xp_earned,
  })),
};

const syncResponse = await fetch(externalSyncUrl, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${externalSyncToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

if (!syncResponse.ok) {
  throw new Error(
    `External recruitment sync failed (destination returned ${syncResponse.status}).`,
  );
}

console.log(`Synced ${payload.total_records} recruitment record(s).`);
