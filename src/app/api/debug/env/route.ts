import { NextResponse } from "next/server";
import { dbConfigured, usingServiceRole, effectiveKeyRole } from "@/lib/server/supabase";

/**
 * Safe diagnostic endpoint — presence/length only, never the values.
 *
 * curl http://localhost:3000/api/debug/env
 */
export async function GET() {
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  const sessionSecret = process.env.SESSION_SECRET || "";

  return NextResponse.json({
    supabase: {
      dbConfigured,
      usingServiceRole,
      role: effectiveKeyRole,
      hasUrlEnv: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRoleEnv: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasAnonEnv: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    admin: {
      // email is fine to echo — it's already NEXT_PUBLIC_ (shipped to browser)
      email: adminEmail || null,
      // passwords/secrets: only expose length + trim-safety hints
      hasAdminPassword: adminPassword.length > 0,
      adminPasswordLength: adminPassword.length,
      adminPasswordStartsWithSpace: adminPassword.length > 0 && adminPassword[0] === " ",
      adminPasswordEndsWithSpace:
        adminPassword.length > 0 && adminPassword[adminPassword.length - 1] === " ",
      adminPasswordHasTrailingNewline:
        adminPassword.length > 0 && /[\r\n]$/.test(adminPassword),
      hasSessionSecret: sessionSecret.length > 0,
      sessionSecretLength: sessionSecret.length,
      usingDefaultSessionSecret: sessionSecret === "taksha-dev-secret-change-me",
    },
    other: {
      nodeEnv: process.env.NODE_ENV,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      hasGoogleTtsKey: !!process.env.GOOGLE_TTS_KEY,
    },
  });
}
