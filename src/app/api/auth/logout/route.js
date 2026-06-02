import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";

export async function GET(request) {
  await clearSession();
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
