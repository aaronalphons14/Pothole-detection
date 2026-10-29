import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Camera as CameraIcon,
  CircleX,
  Crosshair,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageTransition, PageShell, SectionTitle } from "@/components/page-transition";
import { CLASSES, MODEL2_CLASSES } from "@/lib/classes";
import { SAMPLES, type ModelId, type SampleDef } from "@/lib/mock";
import { runDetection } from "@/lib/api";
import { saveResult } from "@/lib/detection-store";
import type { ClassKey } from "@/lib/classes";

export const Route = createFileRoute("/detect")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Detect — RoadSense" },
      {
        name: "description",
        content: "Upload a road image or video and run YOLOv8 detection for potholes, cracks, severe cracks and speed bumps.",
      },
      { property: "og:title", content: "Detect — RoadSense" },
      {
        property: "og:description",
        content: "Run YOLOv8 road anomaly detection on your images and videos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DetectPage,
});

function ModelSegmented({ value, onChange }: { value: ModelId; onChange: (m: ModelId) => void }) {
  const options: Array<{ id: ModelId; label: string; sub: string }> = [
    { id: "m1", label: "Model 1", sub: "YOLOv8m Custom" },
    { id: "m2", label: "Model 2", sub: "YOLOv8s CRDDC" },
    { id: "both", label: "Both", sub: "Ensemble" },
  ];
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-secondary/60 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-md px-2 py-2 text-center transition-colors ${
            value === o.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="block text-xs font-semibold">{o.label}</span>
          <span className={`block text-[10px] ${value === o.id ? "text-primary-foreground/70" : "text-muted-foreground/70"}`}>
            {o.sub}
          </span>
        </button>
      ))}
    </div>
  );
}

function ConfSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="font-mono text-xs text-primary">{value}%</span>
      </div>
      <Slider value={[value]} min={10} max={90} step={5} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function DetectPage() {
  const navigate = useNavigate();
  const { tab: tabParam } = Route.useSearch();
  const [tab, setTab] = useState(tabParam === "video" ? "video" : "image");
  const [model, setModel] = useState<ModelId>("both");
  const [confM1, setConfM1] = useState(40);
  const [confM2, setConfM2] = useState(40);
  const [selectedClasses, setSelectedClasses] = useState<ClassKey[]>(CLASSES.map((c) => c.key));

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sample, setSample] = useState<SampleDef | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const [cameraOn, setCameraOn] = useState(false);

  useEffect(() => {
    if (tabParam === "video") setTab("video");
  }, [tabParam]);

  const accept = tab === "video" ? "video/*" : "image/*";

  function acceptFile(f: File | null | undefined) {
    if (!f) return;
    setFile(f);
    setSample(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (f.type.startsWith("image/")) setPreviewUrl(URL.createObjectURL(f));
    else setPreviewUrl(null);
  }

  async function toggleCamera(on: boolean) {
    setCameraOn(on);
    if (!on) {
      const v = cameraVideoRef.current;
      const stream = v?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await cameraVideoRef.current.play();
      }
    } catch {
      toast.error("Camera unavailable", { description: "Grant camera permission in your browser, or use the Live page." });
      setCameraOn(false);
    }
  }

  async function run() {
    if (!file && !sample) {
      toast.error("Nothing to analyze", { description: "Drop an image/video or pick one of the samples first." });
      return;
    }
    setRunning(true);
    setProgress(0);
    const timer = setInterval(() => setProgress((p) => Math.min(92, p + 6 + Math.random() * 8)), 180);
    try {
      const result = await runDetection({
        file: sample ? undefined : (file as File),
        sample: sample ?? undefined,
        model,
        confM1,
        confM2,
        source: tab === "video" ? "video" : "image",
      });
      // Video uploads are reported on a representative poster frame.
      const visual = tab === "video" && !sample ? { ...result, imageUrl: SAMPLES[0].imageUrl } : result;
      const filtered = {
        ...visual,
        detections: visual.detections.filter(
          (d) =>
            d.model === "m2" ||
            selectedClasses.includes(d.className as ClassKey) ||
            MODEL2_CLASSES.includes(d.className as never),
        ),
      };
      saveResult(filtered);
      toast.success("Detection complete", { description: `${filtered.detections.length} anomalies found.` });
      await navigate({ to: "/results" });
    } catch {
      toast.error("Detection failed", { description: "Something went wrong while analyzing. Try again." });
    } finally {
      clearInterval(timer);
      setRunning(false);
      setProgress(100);
    }
  }

  return (
    <PageTransition>
      <PageShell>
        <SectionTitle
          eyebrow="Detection workspace"
          title="Detect road anomalies"
          sub="Configure the models, drop in your media and run the pipeline. Results open with annotated boxes and an exportable report."
        />

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Settings panel */}
          <Card className="h-fit lg:sticky lg:top-24">
            <CardContent className="space-y-6 p-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Model</p>
                <ModelSegmented value={model} onChange={setModel} />
              </div>

              <div className="space-y-4">
                <ConfSlider label="Model 1 confidence" value={confM1} onChange={setConfM1} />
                {model !== "m1" && <ConfSlider label="Model 2 confidence" value={confM2} onChange={setConfM2} />}
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class filter</p>
                <div className="space-y-2.5">
                  {CLASSES.map((c) => (
                    <label key={c.key} className="flex cursor-pointer items-center gap-2.5 text-sm">
                      <Checkbox
                        checked={selectedClasses.includes(c.key)}
                        onCheckedChange={(v) =>
                          setSelectedClasses((prev) =>
                            v ? [...prev, c.key] : prev.filter((k) => k !== c.key),
                          )
                        }
                      />
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main workspace */}
          <div className="space-y-5">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="bg-secondary/60">
                <TabsTrigger value="image"><ImageIcon className="h-4 w-4" /> Image</TabsTrigger>
                <TabsTrigger value="video"><Video className="h-4 w-4" /> Video</TabsTrigger>
                <TabsTrigger value="camera"><CameraIcon className="h-4 w-4" /> Camera</TabsTrigger>
              </TabsList>

              <TabsContent value="image" className="mt-4">
                <UploadZone
                  dragOver={dragOver}
                  setDragOver={setDragOver}
                  onFile={acceptFile}
                  accept="image/*"
                  inputRef={inputRef}
                  previewUrl={previewUrl}
                  file={file}
                  clearFile={() => { setFile(null); setPreviewUrl(null); }}
                  hint="PNG, JPG or WEBP up to 20 MB — road-surface photos work best"
                />
              </TabsContent>

              <TabsContent value="video" className="mt-4">
                <UploadZone
                  dragOver={dragOver}
                  setDragOver={setDragOver}
                  onFile={acceptFile}
                  accept="video/*"
                  inputRef={inputRef}
                  previewUrl={previewUrl}
                  file={file}
                  clearFile={() => { setFile(null); setPreviewUrl(null); }}
                  hint="MP4 or MOV dash-cam clips up to 200 MB — key frames are scanned"
                  isVideo
                />
              </TabsContent>

              <TabsContent value="camera" className="mt-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-secondary/60">
                      <video ref={cameraVideoRef} className="h-full w-full object-cover" muted playsInline />
                      {!cameraOn && (
                        <div className="absolute text-center text-sm text-muted-foreground">
                          <CameraIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
                          Camera preview appears here
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        For the full HUD, event feed and session stats, use the{" "}
                        <a href="/live" className="text-primary underline-offset-2 hover:underline">Live page</a>.
                      </p>
                      <Button variant={cameraOn ? "destructive" : "secondary"} onClick={() => toggleCamera(!cameraOn)}>
                        {cameraOn ? "Stop camera" : "Start camera"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Samples */}
            <div>
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Try a sample
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {SAMPLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSample(s); setFile(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
                    className={`group relative overflow-hidden rounded-lg border-2 transition-colors ${
                      sample?.id === s.id ? "border-primary" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img src={s.imageUrl} alt={`${s.label} sample`} width={1024} height={576} loading="lazy" className="aspect-video w-full object-cover" />
                    <span className="absolute bottom-1.5 left-1.5 rounded bg-background/80 px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Run */}
            <Card>
              <CardContent className="p-5">
                {running ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Analyzing frames…
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="font-mono text-xs text-muted-foreground">{Math.round(progress)}% — running YOLOv8 inference</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                    <p className="text-sm text-muted-foreground">
                      {sample
                        ? `Sample selected: ${sample.fileName}`
                        : file
                          ? `Ready: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`
                          : "Add an image, a video or a sample to get started."}
                    </p>
                    <Button variant="hero" size="lg" onClick={run}>
                      <Crosshair className="h-4 w-4" />
                      Run detection
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageShell>
    </PageTransition>
  );
}

function UploadZone({
  dragOver, setDragOver, onFile, accept, inputRef, previewUrl, file, clearFile, hint, isVideo = false,
}: {
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  onFile: (f: File | undefined) => void;
  accept: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  previewUrl: string | null;
  file: File | null;
  clearFile: () => void;
  hint: string;
  isVideo?: boolean;
}) {
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); onFile(e.dataTransfer.files?.[0]); }}
      onClick={() => inputRef.current?.click()}
      className={`dashed-upload relative flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all ${
        dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/40"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {previewUrl ? (
        <div className="flex flex-col items-center gap-3">
          <img src={previewUrl} alt="Upload preview" className="max-h-64 rounded-lg border border-border object-contain" />
          <p className="font-mono text-xs text-muted-foreground">{file?.name}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); clearFile(); }}
          >
            <CircleX className="h-4 w-4" /> Remove
          </Button>
        </div>
      ) : (
        <>
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/12 ring-1 ring-primary/30">
            {isVideo ? <Video className="h-6 w-6 text-primary" /> : <ImageIcon className="h-6 w-6 text-primary" />}
          </span>
          <p className="font-medium">
            Drag & drop {isVideo ? "a video" : "an image"} here, or <span className="text-primary">browse</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
        </>
      )}
      {file && !previewUrl && (
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          {file.name} — {(file.size / 1024 / 1024).toFixed(1)} MB
        </p>
      )}
    </div>
  );
}
