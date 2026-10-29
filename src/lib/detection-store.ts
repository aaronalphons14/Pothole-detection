import {
  type DetectionResult,
  type HistoryEntry,
  type ModelId,
  SAMPLES,
  SEED_HISTORY,
  computeSeverity,
  mockDetectionsFor,
  sampleById,
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
    return raw ? (JSON.parse(raw) as DetectionResult) : null;
  } catch {
    return null;
  }
}

/**
 * The results page always shows something: if no detection has been run in
 * this session it falls back to a realistic demo scan (pothole sample).
 */
export function getOrDemoResult(): DetectionResult {
  return loadResult() ?? entryToResult(SEED_HISTORY[0]!);
}

function entryToResult(entry: HistoryEntry): DetectionResult {
  const { id: _id, severity: _severity, ...result } = entry;
  return result;
}

export function loadHistory(): HistoryEntry[] {
  let saved: HistoryEntry[] = [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) saved = JSON.parse(raw) as HistoryEntry[];
  } catch {
    saved = [];
  }
  const merged = [...saved, ...SEED_HISTORY];
  const seen = new Set<string>();
  return merged
    .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveToHistory(result: DetectionResult): HistoryEntry[] {
  const entry: HistoryEntry = {
    ...result,
    id: `scan_${Date.now().toString(36)}`,
    severity: computeSeverity(result.detections),
  };
  try {
    const saved = loadHistory().filter((e) => !SEED_HISTORY.some((s) => s.id === e.id));
    localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...saved]));
  } catch {
    /* storage unavailable */
  }
  return loadHistory();
}

/** History rows carry a sample id so "View" can restore a full result. */
export function historySampleId(entry: HistoryEntry): string {
  const match = SAMPLES.find((s) => s.imageUrl === entry.imageUrl);
  return match?.id ?? "pothole";
}

export function entryFromSample(entry: HistoryEntry): DetectionResult {
  const sample = sampleById(historySampleId(entry));
  return {
    ...entryToResult(entry),
    imageUrl: sample.imageUrl,
    detections: sample.detections,
  };
}
