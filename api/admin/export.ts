import { createClient } from "@supabase/supabase-js";

declare const process: {
  env: Record<string, string | undefined>;
};

type ApiRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  setHeader(name: string, value: string): void;
  status(code: number): ApiResponse;
  send(body: string): void;
};

const fields = [
  "id",
  "created_at",
  "full_name",
  "student_id",
  "department",
  "whatsapp_num",
  "email",
  "segments",
  "other_interest",
  "xp_earned",
  "status",
  "photo_path",
] as const;

function getHeader(request: ApiRequest, name: string) {
  const header = Object.entries(request.headers).find(
    ([key]) => key.toLowerCase() === name.toLowerCase(),
  )?.[1];
  return Array.isArray(header) ? header[0] : header;
}

function csvCell(value: unknown) {
  const normalized = Array.isArray(value) ? value.join("; ") : String(value ?? "");
  const safeValue = /^[\u0000-\u0020]*[=+\-@]/.test(normalized)
    ? `'${normalized}`
    : normalized;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

function respondError(response: ApiResponse, status: number, message: string) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  response.status(status).send(JSON.stringify({ error: message }));
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  response.setHeader("X-Content-Type-Options", "nosniff");

  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    respondError(response, 405, "Method not allowed.");
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const allowedEmails = new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );

  if (!supabaseUrl || !serviceRoleKey || allowedEmails.size === 0) {
    respondError(response, 503, "Admin export is not configured.");
    return;
  }

  const authorization = getHeader(request, "authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    respondError(response, 401, "Sign in to download applicant data.");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    const email = userData.user?.email?.trim().toLowerCase();
    if (authError || !email) {
      respondError(response, 401, "Your admin session is invalid or expired.");
      return;
    }
    if (!allowedEmails.has(email)) {
      respondError(response, 403, "This account is not authorized to export applicant data.");
      return;
    }

    const pageSize = 1000;
    const submissions: Array<Record<string, unknown>> = [];
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase
        .from("recruitment_submissions")
        .select("*")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error("Admin CSV query failed.");
        respondError(response, 500, "Could not export applicant data.");
        return;
      }

      submissions.push(...data);
      if (data.length < pageSize) break;
    }

    const rows = [
      fields.join(","),
      ...submissions.map((submission) =>
        fields.map((field) => csvCell(submission[field])).join(","),
      ),
    ];
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      'attachment; filename="ncc-recruitment-applications.csv"',
    );
    response.send(`\uFEFF${rows.join("\r\n")}`);
  } catch {
    console.error("Admin CSV export failed.");
    respondError(response, 500, "Could not export applicant data.");
  }
}
