import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";

export async function POST(request) {
  try {
    const form = await request.formData();
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "");

    if (!username || !password) {
      return NextResponse.redirect(new URL("/login?error=missing", request.url), 303);
    }

    const { rows } = await query(
      `SELECT user_id, username, full_name, role, password_hash, status, email
       FROM users WHERE LOWER(username)=LOWER($1) LIMIT 1`,
      [username]
    );

    if (!rows.length) {
      return NextResponse.redirect(new URL("/login?error=invalid", request.url), 303);
    }

    const user = rows[0];
    if (String(user.status || "").toLowerCase() !== "active") {
      return NextResponse.redirect(new URL("/login?error=inactive", request.url), 303);
    }

    const passwordHash = user.password_hash || "";
    const devBypass = !passwordHash.trim() && process.env.NODE_ENV !== "production";
    if (!devBypass && !verifyPassword(password, passwordHash)) {
      return NextResponse.redirect(new URL("/login?error=invalid", request.url), 303);
    }

    await createSession({
      id: user.user_id,
      username: user.username,
      name: user.full_name || user.username,
      role: user.role || "User",
      email: user.email || ""
    });

    return NextResponse.redirect(new URL("/", request.url), 303);
  } catch (error) {
    console.error("[login]", error);
    return NextResponse.redirect(new URL("/login?error=server", request.url), 303);
  }
}
