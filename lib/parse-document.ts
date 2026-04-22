import mammoth from "mammoth";

/**
 * Extract plain text from an uploaded file based on its MIME type / extension.
 * Returns the text; caller hands it to the LLM.
 */
export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const type = file.type;
  const buf = Buffer.from(await file.arrayBuffer());

  // Word
  if (
    type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    const res = await mammoth.extractRawText({ buffer: buf });
    return res.value;
  }

  // PDF — dynamic import to avoid test-file side effect at module load
  if (type === "application/pdf" || name.endsWith(".pdf")) {
    const mod = (await import("pdf-parse")) as unknown as
      | { default: (b: Buffer) => Promise<{ text: string }> }
      | ((b: Buffer) => Promise<{ text: string }>);
    const fn = typeof mod === "function" ? mod : mod.default;
    const res = await fn(buf);
    return res.text;
  }

  // Excel / CSV via xlsx
  if (
    type === "application/vnd.ms-excel" ||
    type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".csv") ||
    type === "text/csv"
  ) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buf, { type: "buffer" });
    const parts: string[] = [];
    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      parts.push(`=== Sheet: ${sheetName} ===\n${csv}`);
    }
    return parts.join("\n\n");
  }

  // Plain text
  if (type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md")) {
    return buf.toString("utf-8");
  }

  throw new Error(`Unsupported file type: ${type || name}`);
}

export const ACCEPTED_MIME_TYPES =
  ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md," +
  "application/pdf," +
  "application/msword," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.ms-excel," +
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet," +
  "text/plain,text/markdown,text/csv";
