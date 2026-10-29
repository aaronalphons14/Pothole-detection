export type ClassKey =
  | "Pothole"
  | "Crack"
  | "Crack-Severe"
  | "Speed-Bump"
  | "Heavy-Vehicle"
  | "Light-Vehicle"
  | "Pedestrian";

export interface ClassInfo {
  key: ClassKey;
  label: string;
  color: string; // hex, for canvas / recharts
  token: string; // tailwind token, e.g. "text-pothole"
  roadSurface: boolean;
}

export const CLASSES: ClassInfo[] = [
  { key: "Pothole", label: "Pothole", color: "#F5A524", token: "pothole", roadSurface: true },
  { key: "Crack", label: "Crack", color: "#7DD3FC", token: "crack", roadSurface: true },
  { key: "Crack-Severe", label: "Severe Crack", color: "#F87171", token: "severe", roadSurface: true },
  { key: "Speed-Bump", label: "Speed Bump", color: "#A78BFA", token: "bump", roadSurface: true },
  { key: "Heavy-Vehicle", label: "Heavy Vehicle", color: "#94A3B8", token: "heavy", roadSurface: false },
  { key: "Light-Vehicle", label: "Light Vehicle", color: "#CBD5E1", token: "light-vehicle", roadSurface: false },
  { key: "Pedestrian", label: "Pedestrian", color: "#34D399", token: "pedestrian", roadSurface: false },
];

export const classInfo = (key: string): ClassInfo =>
  CLASSES.find((c) => c.key === key) ?? CLASSES[0];

/** Model 2 (CRDDC2022) sub-classes, all rendered as dashed blue boxes. */
export const MODEL2_CLASSES = [
  "Longitudinal Crack",
  "Transverse Crack",
  "Alligator Crack",
  "Potholes",
] as const;

export const MODEL2_COLOR = "#4C8DFF";
