import potholeImg from "@/assets/sample-pothole.jpg";
import crackImg from "@/assets/sample-crack.jpg";
import severeImg from "@/assets/sample-severe.jpg";
import bumpImg from "@/assets/sample-bump.jpg";

export type ModelId = "m1" | "m2" | "both";

export interface Detection {
  model: "m1" | "m2";
  className: string;
  confidence: number;
  box: [number, number, number, number]; // normalized x1,y1,x2,y2
}

export interface DetectionResult {
  detections: Detection[];
  imageWidth: number;
  imageHeight: number;
  inferenceMs: number;
  imageUrl: string;
  fileName: string;
  source: "image" | "video" | "live";
  createdAt: string;
  modelUsed: ModelId;
  confM1: number;
  confM2: number;
}

export interface SampleDef {
  id: string;
  label: string;
  fileName: string;
  imageUrl: string;
  detections: Detection[];
}

export const SAMPLES: SampleDef[] = [
  {
    id: "pothole",
    label: "Pothole",
    fileName: "sample_pothole_01.jpg",
    imageUrl: potholeImg,
    detections: [
      { model: "m1", className: "Pothole", confidence: 0.87, box: [0.3, 0.33, 0.63, 0.63] },
      { model: "m1", className: "Crack", confidence: 0.74, box: [0.04, 0.04, 0.38, 0.17] },
      { model: "m2", className: "Potholes", confidence: 0.81, box: [0.31, 0.34, 0.61, 0.61] },
    ],
  },
  {
    id: "crack",
    label: "Crack",
    fileName: "sample_crack_02.jpg",
    imageUrl: crackImg,
    detections: [
      { model: "m1", className: "Crack", confidence: 0.68, box: [0.34, 0.26, 0.86, 0.76] },
      { model: "m2", className: "Transverse Crack", confidence: 0.72, box: [0.3, 0.24, 0.88, 0.78] },
    ],
  },
  {
    id: "severe",
    label: "Severe crack",
    fileName: "sample_severe_crack_03.jpg",
    imageUrl: severeImg,
    detections: [
      { model: "m1", className: "Crack-Severe", confidence: 0.71, box: [0.28, 0.08, 0.76, 0.82] },
      { model: "m1", className: "Crack", confidence: 0.58, box: [0.04, 0.28, 0.24, 0.6] },
      { model: "m2", className: "Alligator Crack", confidence: 0.64, box: [0.25, 0.12, 0.8, 0.85] },
    ],
  },
  {
    id: "bump",
    label: "Speed bump",
    fileName: "sample_speed_bump_04.jpg",
    imageUrl: bumpImg,
    detections: [
      { model: "m1", className: "Speed-Bump", confidence: 0.91, box: [0.0, 0.54, 1.0, 0.76] },
      { model: "m2", className: "Longitudinal Crack", confidence: 0.55, box: [0.6, 0.8, 0.92, 0.95] },
    ],
  },
];

export const sampleById = (id: string) => SAMPLES.find((s) => s.id === id) ?? SAMPLES[0]!;

/* ---------------- severity ---------------- */

const SEVERITY_WEIGHT: Record<string, number> = {
  "Crack-Severe": 3,
  Pothole: 2.5,
  Crack: 1,
  "Speed-Bump": 0.5,
  "Heavy-Vehicle": 0,
  "Light-Vehicle": 0,
  Pedestrian: 0,
};

export type Severity = "Low" | "Medium" | "High";

export function computeSeverity(detections: Detection[]): Severity {
  const score = detections
    .filter((d) => d.model === "m1")
    .reduce((acc, d) => acc + (SEVERITY_WEIGHT[d.className] ?? 0), 0);
  if (score >= 4) return "High";
  if (score >= 1.5) return "Medium";
  return "Low";
}

/* ---------------- mock generator for arbitrary uploads ---------------- */

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POOL: Array<[string, number]> = [
  ["Pothole", 0.87],
  ["Crack", 0.74],
  ["Crack-Severe", 0.66],
  ["Speed-Bump", 0.91],
  ["Heavy-Vehicle", 0.78],
  ["Light-Vehicle", 0.83],
  ["Pedestrian", 0.69],
];

/** Deterministic mock detections for an uploaded file (seeded by name). */
export function mockDetectionsFor(fileName: string, model: ModelId, confM1: number, confM2: number): Detection[] {
  const rand = mulberry32(hashString(fileName));
  const count = 2 + Math.floor(rand() * 3); // 2–4 boxes
  const out: Detection[] = [];
  for (let i = 0; i < count; i++) {
    const pick = POOL[Math.floor(rand() * POOL.length)]!;
    const [className, baseConf] = pick;
    const isM2 = model !== "m1" && rand() > 0.6;
    const conf = Math.min(0.95, Math.max(0.1, baseConf + (rand() - 0.5) * 0.12));
    const threshold = isM2 ? confM2 / 100 : confM1 / 100;
    if (conf < threshold && model !== "both") continue;
    const w = 0.14 + rand() * 0.3;
    const h = 0.1 + rand() * 0.25;
    const x1 = rand() * (0.96 - w);
    const y1 = rand() * (0.92 - h);
    out.push({
      model: isM2 ? "m2" : "m1",
      className: isM2 && className.includes("Crack") ? "Transverse Crack" : className,
      confidence: Math.round(conf * 100) / 100,
      box: [
        Math.round(x1 * 1000) / 1000,
        Math.round(y1 * 1000) / 1000,
        Math.round((x1 + w) * 1000) / 1000,
        Math.round((y1 + h) * 1000) / 1000,
      ],
    });
  }
  if (out.length === 0) out.push({ model: "m1", className: "Crack", confidence: 0.55, box: [0.3, 0.3, 0.7, 0.6] });
  return out;
}

/* ---------------- history seed data ---------------- */

export interface HistoryEntry extends DetectionResult {
  id: string;
  severity: Severity;
}

const daysAgo = (n: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 15 + (n * 7) % 40, 0, 0);
  return d.toISOString();
};

export const SEED_HISTORY: HistoryEntry[] = [
  {
    ...toResult(sampleById("severe"), "both", 40, 40),
    id: "scan_0042",
    severity: "High",
    createdAt: daysAgo(0, 9),
  },
  {
    ...toResult(sampleById("pothole"), "m1", 40, 40),
    id: "scan_0041",
    severity: "Medium",
    createdAt: daysAgo(1, 14),
  },
  {
    ...toResult(sampleById("bump"), "m1", 50, 40),
    id: "scan_0040",
    severity: "Low",
    createdAt: daysAgo(2, 8),
  },
  {
    ...toResult(sampleById("crack"), "both", 40, 45),
    id: "scan_0039",
    severity: "Medium",
    createdAt: daysAgo(4, 16),
    source: "video" as const,
  },
  {
    ...toResult(sampleById("pothole"), "m1", 40, 40),
    id: "scan_0038",
    severity: "Medium",
    createdAt: daysAgo(6, 11),
    source: "live" as const,
    fileName: "dashcam_session_1120.mp4",
  },
  {
    ...toResult(sampleById("bump"), "m2", 40, 35),
    id: "scan_0037",
    severity: "Low",
    createdAt: daysAgo(9, 13),
  },
];

function toResult(sample: SampleDef, model: ModelId, confM1: number, confM2: number): DetectionResult {
  return {
    detections: sample.detections,
    imageWidth: 1280,
    imageHeight: 720,
    inferenceMs: 12,
    imageUrl: sample.imageUrl,
    fileName: sample.fileName,
    source: "image",
    createdAt: new Date().toISOString(),
    modelUsed: model,
    confM1,
    confM2,
  };
}

/* ---------------- model performance (from report) ---------------- */

export interface PerClassMetrics {
  className: string;
  precision: number;
  recall: number;
  map50: number;
  map5095: number;
}

export interface SplitMetrics {
  name: "Test set" | "Validation set";
  kpi: { precision: number; recall: number; map50: number; map5095: number; f1: number };
  perClass: PerClassMetrics[];
}

export const PERFORMANCE: Record<"test" | "validation", SplitMetrics> = {
  test: {
    name: "Test set",
    kpi: { precision: 0.736, recall: 0.74, map50: 0.745, map5095: 0.448, f1: 0.738 },
    perClass: [
      { className: "Heavy-Vehicle", precision: 0.913, recall: 0.978, map50: 0.981, map5095: 0.763 },
      { className: "Light-Vehicle", precision: 0.892, recall: 0.951, map50: 0.961, map5095: 0.649 },
      { className: "Pedestrian", precision: 0.822, recall: 0.915, map50: 0.918, map5095: 0.522 },
      { className: "Speed-Bump", precision: 0.804, recall: 0.908, map50: 0.885, map5095: 0.487 },
      { className: "Crack", precision: 0.576, recall: 0.484, map50: 0.505, map5095: 0.24 },
      { className: "Crack-Severe", precision: 0.548, recall: 0.503, map50: 0.493, map5095: 0.273 },
      { className: "Pothole", precision: 0.597, recall: 0.44, map50: 0.468, map5095: 0.198 },
    ],
  },
  validation: {
    name: "Validation set",
    kpi: { precision: 0.738, recall: 0.726, map50: 0.733, map5095: 0.443, f1: 0.732 },
    perClass: [
      { className: "Heavy-Vehicle", precision: 0.921, recall: 0.976, map50: 0.979, map5095: 0.764 },
      { className: "Light-Vehicle", precision: 0.894, recall: 0.965, map50: 0.967, map5095: 0.659 },
      { className: "Pedestrian", precision: 0.838, recall: 0.903, map50: 0.91, map5095: 0.494 },
      { className: "Speed-Bump", precision: 0.842, recall: 0.911, map50: 0.919, map5095: 0.53 },
      { className: "Crack", precision: 0.553, recall: 0.43, map50: 0.454, map5095: 0.219 },
      { className: "Crack-Severe", precision: 0.526, recall: 0.467, map50: 0.471, map5095: 0.265 },
      { className: "Pothole", precision: 0.595, recall: 0.432, map50: 0.432, map5095: 0.171 },
    ],
  },
};

export const TRAINING_DETAILS = [
  { label: "Model", value: "YOLOv8m (custom)" },
  { label: "Epochs", value: "120" },
  { label: "Training time", value: "~27.8 hrs" },
  { label: "Hardware", value: "RTX 3060 6GB" },
  { label: "Weights size", value: "52 MB" },
  { label: "Inference", value: "~12 ms / image" },
];

export const DATASET_SOURCES = [
  { name: "RAD", images: "~8.4k" },
  { name: "Indian Roads", images: "~5.1k" },
  { name: "Humps / Bumps / Potholes", images: "~3.2k" },
  { name: "HighRPD", images: "~11.7k" },
];
