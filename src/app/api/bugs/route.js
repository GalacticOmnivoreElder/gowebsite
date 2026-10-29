import { bugReportingConfigured, BUG_REPORT_MAX_FILE_BYTES, submitBugReport } from "@/lib/bug-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ available: bugReportingConfigured() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request) {
  const size = Number(request.headers.get("content-length") || 0);
  if (size > BUG_REPORT_MAX_FILE_BYTES + 65536) return Response.json({ error: "Please choose one file up to 3 MB." }, { status: 413 });
  try {
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: "Please complete the report." }, { status: 400 });
    const chunks = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > BUG_REPORT_MAX_FILE_BYTES + 65536) {
        await reader.cancel();
        return Response.json({ error: "Please choose one file up to 3 MB." }, { status: 413 });
      }
      chunks.push(value);
    }
    const form = await new Response(new Blob(chunks), { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();
    if (form.get("website")) return Response.json({ error: "Report could not be submitted." }, { status: 400 });
    const files = form.getAll("attachment").filter((item) => typeof item !== "string" && item.size);
    if (files.length > 1) return Response.json({ error: "Please choose only one attachment." }, { status: 400 });
    const result = await submitBugReport({ email: form.get("email"), summary: form.get("summary"), description: form.get("description"), file: files[0] });
    return Response.json(result, { status: result.status, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Bug report submission failed", error?.message);
    return Response.json({ error: "The report could not be submitted. Please use the support portal instead." }, { status: 503 });
  }
}
