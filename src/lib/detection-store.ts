import {
  type DetectionResult,
  type HistoryEntry,
  computeSeverity,
} from "@/lib/mock";

const RESULT_KEY = "roadsense:current-result";
const HISTORY_KEY = "roadsense:history";

export function saveResult(result: DetectionResult) {
  try {
    sessionStorage.setItem(RESULT_KEY, JSON.stringify(result));
  } catch {
    /* storage unavailable */
  }
}

export function loadResult(): DetectionResult | null {
  try {
    const raw = sessionStorage.getItem(RESULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DetectionResult;
    if (parsed && Array.isArray(parsed.detections)) {
      parsed.detections = parsed.detections.filter(
        (d) => !d.className?.toLowerCase().includes("vehicle"),
      );
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getOrDemoResult(): DetectionResult | null {
  return loadResult();
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const saved = JSON.parse(raw) as HistoryEntry[];
    return saved
      .map((entry) => ({
        ...entry,
        detections: Array.isArray(entry.detections)
          ? entry.detections.filter((d) => !d.className?.toLowerCase().includes("vehicle"))
          : [],
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export function saveToHistory(result: DetectionResult): HistoryEntry[] {
  const entry: HistoryEntry = {
    ...result,
    id: `scan_${Date.now().toString(36)}`,
    severity: computeSeverity(result.detections),
  };
  try {
    const saved = loadHistory();
    localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...saved]));
  } catch {
    /* storage unavailable */
  }
  return loadHistory();
}

