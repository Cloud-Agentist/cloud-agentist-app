import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { message: "Data export coming soon" },
    { status: 501 },
  );
}
