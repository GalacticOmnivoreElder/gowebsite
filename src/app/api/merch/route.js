import { NextResponse } from "next/server";
import { limitMerch, readMerchBody, submitMerch, saveMerchSuggestion, merchAction } from "@/lib/merch-server";

export const runtime = "nodejs";
export async function POST(request) {
  try {
    const body = await readMerchBody(request);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    if (["confirm", "withdraw"].includes(body.action)) {
      return NextResponse.json(await merchAction(body), { headers: { "Cache-Control": "no-store" } });
    }
    await limitMerch(request, typeof body.email === "string" ? body.email : "");
    const result = body.action === "suggest" ? await saveMerchSuggestion(body) : await submitMerch(body);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error.status ? error.message : "We could not save your request. Please try again." }, { status: error.status || 500 });
  }
}
