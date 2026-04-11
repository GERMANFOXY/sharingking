import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

type RevalidatePayload = {
  paths?: string[];
};

export async function POST(request: Request) {
  const secret = request.headers.get("x-revalidate-secret");

  if (!process.env.NEXT_REVALIDATE_SECRET || secret !== process.env.NEXT_REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as RevalidatePayload;
  const paths = Array.isArray(payload.paths) && payload.paths.length > 0 ? payload.paths : ["/", "/dashboard"];

  paths.forEach((path) => revalidatePath(path));

  return NextResponse.json({ revalidated: true, paths });
}