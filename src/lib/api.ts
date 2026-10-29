import {
  SAMPLES,
  type Detection,
  type DetectionResult,
  type ModelId,
  type SampleDef,
} from "@/lib/mock";

export interface RunDetectionInput {
  file?: File | undefined;
  sample?: SampleDef | undefined;
  model: ModelId;
  confM1: number;
  confM2: number;
  source?: "image" | "video" | "live";
}

export interface DetectApiResponse {
  detections: Array<{
    model: "m1" | "m2";
    class: string;
    confidence: number;
    box: [number, number, number, number];
  }>;
  image_width: number;
  image_height: number;
  inference_ms: number;
  original_url?: string;
  result_url?: string;
}

function loadImageSize(file: File): Promise<{ w: number; h: number; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight, url });
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = url;
  });
}

/**
 * Executes real YOLO inference via the Python backend at {VITE_API_URL}/detect.
 * Does NOT generate mock detections. If backend is unavailable, it reports an error.
 */
export async function runDetection(input: RunDetectionInput): Promise<DetectionResult> {
  const base = (import.meta.env["VITE_API_URL"] as string | undefined) || "http://localhost:5000";
  const source = input.source ?? "image";

  if (!input.file && !input.sample) {
    throw new Error("No image or sample selected for analysis.");
  }

  let fileToSend: File | Blob;
  let fileName: string;
  let displayUrl: string;
  let wNatural = 1280;
  let hNatural = 720;

  if (input.file) {
    fileToSend = input.file;
    fileName = input.file.name;
    const loaded = await loadImageSize(input.file);
    displayUrl = loaded.url;
    wNatural = loaded.w;
    hNatural = loaded.h;
  } else {
    const sampleResp = await fetch(input.sample!.imageUrl);
    const sampleBlob = await sampleResp.blob();
    fileToSend = new File([sampleBlob], input.sample!.fileName, { type: "image/jpeg" });
    fileName = input.sample!.fileName;
    displayUrl = input.sample!.imageUrl;
  }

  const body = new FormData();
  body.append("file", fileToSend);
  body.append("model", input.model);
  body.append("conf_m1", String(input.confM1));
  body.append("conf_m2", String(input.confM2));

  let res: Response;
  try {
    res = await fetch(`${base.replace(/\/$/, "")}/detect`, { method: "POST", body });
  } catch (netErr) {
    throw new Error(
      `Cannot connect to RoadSense ML backend at ${base}. Please verify python backend_server.py is running.`
    );
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Inference engine error (${res.status}): ${errText || "Unknown backend error"}`);
  }

  const data = (await res.json()) as DetectApiResponse;

  const detections: Detection[] = data.detections
    .filter((d) => !d.class.toLowerCase().includes("vehicle"))
    .map((d) => ({
      model: d.model,
      className: d.class,
      confidence: d.confidence,
      box: d.box,
    }));

  return {
    detections,
    imageWidth: data.image_width || wNatural,
    imageHeight: data.image_height || hNatural,
    inferenceMs: Math.round(data.inference_ms),
    imageUrl: data.original_url || displayUrl,
    annotatedUrl: data.result_url,
    fileName,
    source,
    createdAt: new Date().toISOString(),
    modelUsed: input.model,
    confM1: input.confM1,
    confM2: input.confM2,
  };
}

