export type Urgency = "low" | "medium" | "high" | "critical";
export type Track = "safety" | "civic";
export type SafetyAnalysis = { rulesUrgency: Urgency; dangerFlags: string[]; urgencyReason: string; needsHumanReview: true };

const groups: Array<{ flag: string; urgency: Urgency; patterns: RegExp[] }> = [
  { flag: "weapon", urgency: "critical", patterns: [/\b(gun|pistol|rifle|weapon|knife)\b/i, /(بندوق|پستول|ہتھیار|چھری)/, /(بندوق|پسٽل|هٿيار|ڇري)/] },
  { flag: "immediate_attack", urgency: "critical", patterns: [/\b(attacking me now|being attacked|trying to kill|shots fired)\b/i, /(ابھی حملہ|مجھے مارنے|گولی چل)/, /(هاڻي حملو|مون کي مارڻ|گولي هل)/] },
  { flag: "medical_emergency", urgency: "critical", patterns: [/\b(unconscious|not breathing|severe bleeding)\b/i, /(بے ہوش|سانس نہیں|شدید خون)/, /(بيهوش|ساهه نه|گهڻو رت)/] },
  { flag: "fire_or_explosion", urgency: "critical", patterns: [/\b(fire|explosion|gas leak)\b/i, /(آگ|دھماکہ|گیس لیک)/, /(باهه|ڌماڪو|گيس ليڪ)/] },
  { flag: "threat_or_violence", urgency: "high", patterns: [/\b(threat|kill|attack|violence|beating)\b/i, /(دھمکی|قتل|حملہ|تشدد|مار پیٹ)/, /(ڌمڪي|قتل|حملو|تشدد|مارڪٽ)/] },
  { flag: "following_or_stalking", urgency: "high", patterns: [/\b(following me|stalking|being followed)\b/i, /(پیچھا|تعاقب)/, /(پيڇو|تعاقب)/] },
  { flag: "danger_or_help", urgency: "high", patterns: [/\b(in danger|help me|unsafe now|trapped)\b/i, /(خطرے میں|مدد کریں|محفوظ نہیں|پھنسا)/, /(خطري ۾|مدد ڪريو|محفوظ ناهيان|ڦاٿل)/] },
  { flag: "civic_hazard", urgency: "high", patterns: [/\b(live wire|electrocution|open manhole|building collapse|flood water)\b/i, /(بجلی کی ننگی تار|کھلا مین ہول|عمارت گر|سیلاب)/, /(کليل تار|کليل مين هول|عمارت ڪري|ٻوڏ)/] },
];

const rank: Record<Urgency, number> = { low: 0, medium: 1, high: 2, critical: 3 };
export function higherUrgency(first: Urgency, second: Urgency): Urgency { return rank[first] >= rank[second] ? first : second; }

export function analyzeSafety(text: string, track: Track): SafetyAnalysis {
  const normalized = text.normalize("NFKC").replace(/\s+/g, " ").trim();
  const matched = groups.filter((group) => group.patterns.some((pattern) => pattern.test(normalized)));
  const dangerFlags = [...new Set(matched.map((group) => group.flag))];
  let rulesUrgency: Urgency = track === "safety" ? "medium" : "low";
  for (const match of matched) rulesUrgency = higherUrgency(rulesUrgency, match.urgency);
  const urgencyReason = dangerFlags.length
    ? `Raised by transparent safety rules: ${dangerFlags.join(", ")}. Human review required.`
    : track === "safety" ? "Safety-track minimum priority. Human review required." : "No configured danger phrase matched. Human review is still required.";
  return { rulesUrgency, dangerFlags, urgencyReason, needsHumanReview: true };
}

export function combineWithAi(rulesUrgency: Urgency, aiUrgency: Urgency | null): Urgency {
  return aiUrgency ? higherUrgency(rulesUrgency, aiUrgency) : rulesUrgency;
}
