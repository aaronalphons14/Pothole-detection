import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  History as HistoryIcon,
  Layers,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageTransition, PageShell, SectionTitle } from "@/components/page-transition";
import { BoxOverlay } from "@/components/box-overlay";
import { getOrDemoResult, saveToHistory } from "@/lib/detection-store";
import { classInfo, MODEL2_COLOR, MODEL2_CLASSES } from "@/lib/classes";
import { computeSeverity, type Detection, type DetectionResult } from "@/lib/mock";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Detection Results — RoadSense" },
      {
        name: "description",
        content: "View annotated neural defect localization bounding boxes, confidence telemetry, and distress breakdown.",
      },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const navigate = useNavigate();
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [activeModelFilter, setActiveModelFilter] = useState<"all" | "m1" | "m2">("all");
  const [renderMode, setRenderMode] = useState<"interactive" | "model">("interactive");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const res = getOrDemoResult();
    if (res) {
      const sanitized: DetectionResult = {
        ...res,
        detections: res.detections.filter(
          (d) => !d.className.toLowerCase().includes("vehicle"),
        ),
      };
      setResult(sanitized);
    }
  }, []);

  if (!result) {
    return (
      <PageTransition>
        <PageShell>
          <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
            <ShieldAlert className="mb-4 h-12 w-12 text-muted-foreground/60" />
            <h2 className="text-xl font-bold">No Active Inspection Result</h2>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Run a real detection scan on a road photo, video, or dashcam feed to inspect anomalies.
            </p>
            <Button asChild variant="hero" className="mt-6">
              <Link to="/detect">Go to Detect</Link>
            </Button>
          </div>
        </PageShell>
      </PageTransition>
    );
  }

  const severity = computeSeverity(result.detections);
  const filteredBoxes = result.detections
    .filter((d) => !d.className.toLowerCase().includes("vehicle"))
    .filter((d) => {
      if (activeModelFilter === "all") return true;
      return d.model === activeModelFilter;
    });

  const m1Count = result.detections.filter((d) => d.model === "m1").length;
  const m2Count = result.detections.filter((d) => d.model === "m2").length;


  const handleSaveHistory = () => {
    saveToHistory(result);
    setSaved(true);
    toast.success("Saved to history", { description: "Detection report stored in local session log." });
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = `roadsense_${result.fileName.replace(/\.[^/.]+$/, "")}_report.json`;
    a.click();
    toast.success("Export downloaded", { description: "Report saved as JSON." });
  };

  const handleCopySummary = () => {
    const summary = `RoadSense Detection Summary:
File: ${result.fileName}
Total Anomalies: ${result.detections.length}
Severity: ${severity}
Latency: ${result.inferenceMs} ms
Detections:
${result.detections.map((d, i) => `${i + 1}. [${d.model.toUpperCase()}] ${d.className} (${(d.confidence * 100).toFixed(1)}%)`).join("\n")}`;

    navigator.clipboard.writeText(summary);
    toast.success("Copied to clipboard", { description: "Summary text ready to paste." });
  };

  return (
    <PageTransition>
      <PageShell>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
              <Link to="/detect">
                <ArrowLeft className="mr-1 h-4 w-4" /> Back to Scanner
              </Link>
            </Button>
            <SectionTitle
              eyebrow="AI Neural Inspection"
              title="Inspection Results & Telemetry"
              sub={`Analyzed with YOLOv8 dual pipeline in ${result.inferenceMs}ms · ${result.detections.length} anomaly localization boxes generated.`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopySummary}>
              <Copy className="h-4 w-4" /> Copy summary
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              <Download className="h-4 w-4" /> Export JSON
            </Button>
            <Button variant={saved ? "secondary" : "hero"} size="sm" onClick={handleSaveHistory}>
              {saved ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <HistoryIcon className="h-4 w-4" />}
              {saved ? "Saved in History" : "Save to History"}
            </Button>
          </div>
        </div>

        {/* Overview KPI Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Total Anomalies</p>
              <p className="font-mono text-3xl font-bold text-foreground">{result.detections.length}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                M1: <span className="text-amber-400 font-semibold">{m1Count}</span> · M2: <span className="text-blue-400 font-semibold">{m2Count}</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Pavement Severity</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge
                  variant={
                    severity === "High" ? "destructive" : severity === "Medium" ? "secondary" : "outline"
                  }
                  className="font-mono text-sm"
                >
                  <ShieldAlert className="mr-1 h-3.5 w-3.5" />
                  {severity} Risk
                </Badge>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Weighted hazard score</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Inference Speed</p>
              <p className="font-mono text-3xl font-bold text-primary">{result.inferenceMs} <span className="text-sm font-normal text-muted-foreground">ms</span></p>
              <p className="mt-1 text-[11px] text-muted-foreground">YOLOv8 Neural Core</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Resolution</p>
              <p className="font-mono text-xl font-bold text-foreground">
                {result.imageWidth} × {result.imageHeight}
              </p>
              <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{result.fileName}</p>
            </CardContent>
          </Card>
        </div>

        {/* Visual Inspection Display */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <Card className="overflow-hidden border-border bg-card shadow-xl">
              <div className="flex flex-wrap items-center justify-between border-b border-border bg-secondary/40 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="live-dot inline-block h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="font-mono text-xs font-semibold text-foreground">
                    Annotated Anomaly Segmentation
                  </span>
                </div>

                {/* Filter and Mode controls */}
                <div className="flex flex-wrap items-center gap-2">
                  {result.annotatedUrl && (
                    <div className="mr-2 flex items-center rounded-lg border border-border bg-secondary/80 p-0.5">
                      <button
                        onClick={() => setRenderMode("interactive")}
                        className={`rounded px-2 py-0.5 text-xs font-semibold transition-colors ${
                          renderMode === "interactive"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Interactive HUD
                      </button>
                      <button
                        onClick={() => setRenderMode("model")}
                        className={`rounded px-2 py-0.5 text-xs font-semibold transition-colors ${
                          renderMode === "model"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Model Render
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    {(["all", "m1", "m2"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setActiveModelFilter(m)}
                        className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                          activeModelFilter === m
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`}
                      >
                        {m === "all" ? "Combined" : m === "m1" ? "Model 1" : "Model 2"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Container with image and overlay or model render */}
              <div className="relative mx-auto flex items-center justify-center bg-black/40 p-2 sm:p-4">
                <div className="relative inline-block overflow-hidden rounded-lg border border-border/80">
                  {renderMode === "model" && result.annotatedUrl ? (
                    <img
                      src={result.annotatedUrl}
                      alt={`Python YOLO annotated render of ${result.fileName}`}
                      className="max-h-[640px] w-auto max-w-full object-contain"
                    />
                  ) : (
                    <>
                      <img
                        src={result.imageUrl}
                        alt={`Road surface inspection of ${result.fileName}`}
                        className="max-h-[640px] w-auto max-w-full object-contain"
                      />
                      <BoxOverlay boxes={filteredBoxes} animated stagger={0.2} pulse={severity === "High"} />
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between border-t border-border bg-secondary/20 px-4 py-2.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-400" /> M1 (Custom YOLOv8m)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-400" /> M2 (CRDDC YOLOv8s)
                  </span>
                </div>
                <span>Showing {filteredBoxes.length} of {result.detections.length} boxes</span>
              </div>
            </Card>
          </div>

          {/* Breakdown Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <Layers className="h-4 w-4 text-primary" /> Distress Breakdown
                </h3>

                {result.detections.length === 0 ? (
                  <div className="rounded-lg border border-border/80 bg-secondary/30 p-4 text-center">
                    <p className="text-sm font-medium text-foreground">
                      No defects detected above {result.confM1 ?? 25}% confidence.
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                      RoadSense models are trained on real-world vehicle dashcam perspectives of open asphalt roadways.
                      For close-up shots or non-standard modular fixtures (like rubber parking blocks), lower the confidence slider to <span className="text-primary font-mono font-semibold">1% – 10%</span> on the Detect page for high-sensitivity inspection.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {result.detections.map((d, idx) => {
                      const isM2 = d.model === "m2";
                      const color = isM2 ? MODEL2_COLOR : classInfo(d.className).color;
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-3 transition-colors hover:border-primary/40"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="h-3 w-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <div>
                              <p className="text-sm font-semibold text-foreground">{d.className}</p>
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {isM2 ? "Model 2 · CRDDC" : "Model 1 · Custom"}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-mono text-sm font-bold text-foreground">
                              {(d.confidence * 100).toFixed(1)}%
                            </span>
                            <span className="block text-[10px] text-muted-foreground">Confidence</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <Separator className="my-5" />

                <div className="flex flex-col gap-2">
                  <Button asChild variant="hero" className="w-full">
                    <Link to="/detect">
                      <RefreshCw className="mr-2 h-4 w-4" /> Scan Another Image
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/history">
                      <HistoryIcon className="mr-2 h-4 w-4" /> View History
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageShell>
    </PageTransition>
  );
}
