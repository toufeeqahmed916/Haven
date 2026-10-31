import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { prepareVoiceIntake } from "../apps/api/src/analysis/ai-analysis.ts";

const categories = [
  { code: "street_harassment", nameEn: "Street harassment", nameUr: "سڑک پر ہراسانی" },
  { code: "workplace_harassment", nameEn: "Workplace harassment", nameUr: "کام کی جگہ پر ہراسانی" },
  { code: "online_harassment", nameEn: "Online harassment", nameUr: "آن لائن ہراسانی" },
  { code: "threats_blackmail", nameEn: "Threats or blackmail", nameUr: "دھمکیاں یا بلیک میل" },
  { code: "domestic_violence", nameEn: "Domestic violence", nameUr: "گھریلو تشدد" },
  { code: "theft_robbery", nameEn: "Theft or robbery", nameUr: "چوری یا ڈکیتی" },
  { code: "property_dispute", nameEn: "Property dispute", nameUr: "جائیداد کا تنازع" },
  { code: "fraud_scam", nameEn: "Fraud or scam", nameUr: "دھوکہ دہی" },
  { code: "missing_person", nameEn: "Missing person", nameUr: "لاپتہ شخص" },
  { code: "other_safety", nameEn: "Other safety concern", nameUr: "دیگر حفاظتی مسئلہ" },
  { code: "road_damage", nameEn: "Road damage", nameUr: "سڑک کی خرابی" },
  { code: "drainage_sewage", nameEn: "Drainage or sewage", nameUr: "نکاسی آب یا سیوریج" },
  { code: "garbage_sanitation", nameEn: "Garbage or sanitation", nameUr: "کچرا یا صفائی" },
  { code: "water_electricity", nameEn: "Water or electricity", nameUr: "پانی یا بجلی" },
  { code: "street_light", nameEn: "Street light", nameUr: "اسٹریٹ لائٹ" },
  { code: "other_civic", nameEn: "Other civic issue", nameUr: "دیگر شہری مسئلہ" },
];

const mimeTypes: Record<string, string> = {
  ".webm": "audio/webm",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".mpeg": "audio/mpeg",
  ".mp4": "audio/mp4",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
};

async function loadGeminiSettings() {
  const contents = await readFile(resolve(process.cwd(), ".env"), "utf8");
  const values = new Map<string, string>();
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const value = match[2].replace(/^(["'])(.*)\1$/, "$2");
    values.set(match[1], value);
  }
  const apiKey = values.get("GEMINI_API_KEY");
  if (!apiKey || apiKey.length < 20) throw new Error("GEMINI_API_KEY is missing or invalid in the root .env file.");
  return {
    apiKey,
    model: values.get("GEMINI_MODEL") || "gemini-3.5-flash-lite",
    timeoutMs: Number(values.get("AI_TIMEOUT_MS") || 30000),
  };
}

async function main() {
  const audioArgument = process.argv[2];
  if (!audioArgument) throw new Error('Usage: test-voice.cmd "C:\\path\\recording.m4a"');

  const audioPath = resolve(audioArgument);
  const mimeType = mimeTypes[extname(audioPath).toLowerCase()];
  if (!mimeType) throw new Error("Supported audio files: .m4a, .mp3, .wav, .webm, .mp4, or .ogg");
  const bytes = await readFile(audioPath);
  if (bytes.length < 500) throw new Error("The audio file is empty or too short.");
  if (bytes.length > 8 * 1024 * 1024) throw new Error("The audio file is larger than 8 MB. Record a shorter clip.");

  console.log("Testing automatic Urdu/English voice intake with Gemini...");
  const result = await prepareVoiceIntake({ bytes, mimeType, allowedCategories: categories }, await loadGeminiSettings());
  console.log("\nVOICE TEST PASSED\n");
  console.log(`Transcript: ${result.transcript}`);
  console.log(`Complaint: ${result.complaintText}`);
  console.log(`Language: ${result.language}`);
  console.log(`Category: ${result.categoryCode}`);
  console.log(`Location: ${result.addressText ?? "Not stated"}`);
  console.log(`Incident time: ${result.incidentAt ?? "Not stated"}`);
  console.log(`Anonymous: ${result.isAnonymous ? "Yes" : "No"}`);
}

main().catch((error) => {
  console.error("\nVOICE TEST FAILED");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
