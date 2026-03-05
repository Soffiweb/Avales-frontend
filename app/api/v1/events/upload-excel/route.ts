import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; // 5 minutos

export async function POST(request: NextRequest) {
  const backendUrl =
    process.env.BACKEND_URL ?? "http://localhost:3000";

  const cookie = request.headers.get("cookie") ?? "";

  const body = await request.arrayBuffer();

  const res = await fetch(`${backendUrl}/api/v1/events/upload-excel`, {
    method: "POST",
    headers: {
      "content-type": request.headers.get("content-type") ?? "",
      cookie,
    },
    body,
  });

  const data = await res.json().catch(() => null);

  return NextResponse.json(data, { status: res.status });
}
