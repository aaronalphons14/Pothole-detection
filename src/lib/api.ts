import {
  SAMPLES,
  type Detection,
  type DetectionResult,
  type ModelId,
  type SampleDef,
  mockDetectionsFor,
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

function waitFor(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const sleep = waitFor;

/**
 * Calls POST {VITE_API_URL}/detect when the API is configured, and falls
 * back to realistic mock data (or uses it exclusively when no env var is
 * set) so the whole app works without the Python backend.
 */
export async function runDetection(input: RunDetectionInput): Promise<DetectionResult> {
  const base = import.meta.env["VITE_API_URL"] as string | undefined;
  const source = input.source ?? "image";

  if (base && input.file) {
    try {
      const body = new FormData();
      body.append("file", input.file);
      body.append("model", input.model);
      body.append("conf_m1", String(input.confM1));
      body.append("conf_m2", String(input.confM2));
      const res = await fetch(`${base.replace(/\/$/, "")}/detect`, { method: "POST", body });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = (await res.json()) as DetectApiResponse;
      const { w, h, url } = await loadImageSize(input.file);
      const detections: Detection[] = data.detections.map((d) => ({
        model: d.model,
        className: d.class,
        confidence: d.confidence,
        box: d.box,
      }));
      return {
        detections,
        imageWidth: data.image_width || w,
        imageHeight: data.image_height || h,
        inferenceMs: Math.round(data.inference_ms),
        imageUrl: url,
        fileName: input.file.name,
        source,
        createdAt: new Date().toISOString(),
        modelUsed: input.model,
        confM1: input.confM1,
        confM2: input.confM2,
      };
    } catch {
      // network/API failure — fall through to the offline simulation
    }
  }

  await sleep(1100 + Math.random() * 700);

  if (input.sample) {
    const detd = input.sample.detections.filter((d) =>
      d.model === "m1" ? d.confidence >= input.confM1 / 100 : d.confidence >= input.confM2 / 100,
    );
    return {
      detections: detd,
      imageWidth: 1280,
      imageHeight: 720,
      inferenceMs: 10 + Math.round(Math.random() * 6),
      imageUrl: input.sample.imageUrl,
      fileName: input.sample.fileName,
      source,
      createdAt: new Date().toISOString(),
      modelUsed: input.model,
      confM1: input.confM1,
      confM2: input.confM2,
    };
  }

  if (input.file) {
    const { w, h, url } = await loadImageSize(input.file);
    return {
      detections: mockDetectionsFor(input.file.name, input.model, input.confM1, input.confM2),
      imageWidth: w,
      imageHeight: h,
      inferenceMs: 10 + Math.round(Math.random() * 6),
      imageUrl: url,
      fileName: input.file.name,
      source,
      createdAt: new Date().toISOString(),
      modelUsed: input.model,
      confM1: input.confM1,
      confM2: input.confM2,
    };
  }

  // nothing provided — demo scan
  const demo = SAMPLES[0];
  return {
    detections: demo.detections,
    imageWidth: 1280,
    imageHeight: 720,
    inferenceMs: 12,
    imageUrl: demo.imageUrl,
    fileName: demo.fileName,
    source,
    createdAt: new Date().toISOString(),
    modelUsed: input.model,
    confM1: input.confM1,
    confM2: input.confM2,
  };
}
