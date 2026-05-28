import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; // 5 minutos

export async function POST(request: NextRequest) {
  const backendUrl =
    process.env.BACKEND_URL ?? "http://localhost:3000";

  const authorization = request.headers.get("authorization") ?? "";

  const body = await request.arrayBuffer();

  const res = await fetch(`${backendUrl}/api/v1/events/upload-excel`, {
    method: "POST",
    headers: {
      "content-type": request.headers.get("content-type") ?? "",
      ...(authorization ? { authorization } : {}),
    },
    body,
  });

  const data = await res.json().catch(() => null);

  return NextResponse.json(data, { status: res.status });
}
