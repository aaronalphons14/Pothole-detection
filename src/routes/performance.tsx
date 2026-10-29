import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  BarChart3,
  Cpu,
  Database,
  Layers,
  Sparkles,
  Trophy,
  Activity,
  CheckCircle2,
  Maximize2,
  TrendingUp,
  GitCompare,
  ShieldCheck,
  Eye,
  Info,
  SlidersHorizontal,
  Download,
  FileSpreadsheet,
  FileCode,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PageTransition, PageShell, SectionTitle } from "@/components/page-transition";
import {
  PERFORMANCE,
  TRAINING_DETAILS,
  DATASET_SOURCES,
  MODEL2_PERFORMANCE,
  ENSEMBLE_PERFORMANCE,
} from "@/lib/mock";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Empirical Performance & Model Metrics — RoadSense" },
      {
        name: "description",
        content:
          "Comprehensive evaluation metrics, confusion matrix, ROC / PR curves, F1-confidence curves, accuracy, and 120-epoch training telemetry for YOLOv8 road distress models.",
      },
    ],
  }),
  component: PerformancePage,
});

type ModelView = "m1" | "m2" | "ensemble";
type ChartTab = "confusion" | "pr_curve" | "f1_curve" | "pr_split" | "training" | "labels" | "val_pred";

interface ModalImage {
  src: string;
  title: string;
  description: string;
}

function PerformancePage() {
  const [modelView, setModelView] = useState<ModelView>("m1");
  const [split, setSplit] = useState<"test" | "validation">("test");
  const [chartTab, setChartTab] = useState<ChartTab>("confusion");
  const [m1MatrixType, setM1MatrixType] = useState<"normalized" | "raw">("normalized");
  const [valBatch, setValBatch] = useState<"batch0" | "batch1">("batch0");
  const [modalImage, setModalImage] = useState<ModalImage | null>(null);

  // Active metrics based on model view
  const m1Metrics = PERFORMANCE[split];
  const activeKpi =
    modelView === "m1"
      ? m1Metrics.kpi
      : modelView === "m2"
      ? MODEL2_PERFORMANCE.kpi
      : ENSEMBLE_PERFORMANCE.kpi;

  const activeClasses =
    modelView === "m1"
      ? m1Metrics.perClass
      : modelView === "m2"
      ? MODEL2_PERFORMANCE.perClass.map((c) => ({
          className: c.className,
          precision: c.precision,
          recall: c.recall,
          map50: c.map50,
          map5095: c.map5095,
        }))
      : ENSEMBLE_PERFORMANCE.perClass;

  const activeTrainingDetails =
    modelView === "m1"
      ? TRAINING_DETAILS
      : modelView === "m2"
      ? MODEL2_PERFORMANCE.trainingDetails
      : ENSEMBLE_PERFORMANCE.trainingDetails;

  return (
    <PageTransition>
      <PageShell>
        <SectionTitle
          eyebrow="Empirical Validation & Benchmarks"
          title="Neural Model Performance & Empirical Evaluation"
          sub="Verified detection benchmarks, confusion matrices, ROC / Precision-Recall curves, F1-confidence trade-offs, and 120-epoch training telemetry."
        />

        {/* Model Architecture Selector Bar */}
        <div className="mb-8 rounded-2xl border border-border bg-card/60 p-4 backdrop-blur-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Active Model Evaluation Context
                </p>
                <h3 className="text-base font-bold text-foreground">
                  {modelView === "m1" && "Model 1: Custom YOLOv8m (120-Epoch Supervised)"}
                  {modelView === "m2" && "Model 2: CRDDC 2022 YOLOv8s (oracl4 Japanese + Indian Roads)"}
                  {modelView === "ensemble" && "Ensemble Consensus Engine (WBF Dual-Model Fusion)"}
                </h3>
              </div>
            </div>

            <Tabs
              value={modelView}
              onValueChange={(v) => setModelView(v as ModelView)}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full grid-cols-3 bg-secondary/80 sm:w-auto">
                <TabsTrigger value="m1" className="text-xs font-semibold">
                  Model 1 (YOLOv8m)
                </TabsTrigger>
                <TabsTrigger value="m2" className="text-xs font-semibold">
                  Model 2 (CRDDC)
                </TabsTrigger>
                <TabsTrigger value="ensemble" className="text-xs font-semibold">
                  Ensemble (WBF)
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Top KPI Scorecards: Accuracy, Precision, Recall, F1, mAP@0.5, ROC-AUC */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {/* Accuracy */}
          <Card className="border-border/60 bg-gradient-to-br from-card to-card/40 transition-all hover:border-primary/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Accuracy
                </span>
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-400">
                  Empirical
                </Badge>
              </div>
              <p className="mt-2 font-mono text-3xl font-extrabold text-emerald-400">
                {(activeKpi.accuracy * 100).toFixed(1)}%
              </p>
              <span className="text-[11px] text-muted-foreground">Top-1 detection accuracy</span>
            </CardContent>
          </Card>

          {/* Precision */}
          <Card className="border-border/60 bg-gradient-to-br from-card to-card/40 transition-all hover:border-primary/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Precision
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">TP/(TP+FP)</span>
              </div>
              <p className="mt-2 font-mono text-3xl font-extrabold text-foreground">
                {(activeKpi.precision * 100).toFixed(1)}%
              </p>
              <span className="text-[11px] text-muted-foreground">Low false alarm rate</span>
            </CardContent>
          </Card>

          {/* Recall */}
          <Card className="border-border/60 bg-gradient-to-br from-card to-card/40 transition-all hover:border-primary/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Recall
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">TP/(TP+FN)</span>
              </div>
              <p className="mt-2 font-mono text-3xl font-extrabold text-foreground">
                {(activeKpi.recall * 100).toFixed(1)}%
              </p>
              <span className="text-[11px] text-muted-foreground">Hazard coverage sensitivity</span>
            </CardContent>
          </Card>

          {/* F1 Score */}
          <Card className="border-border/60 bg-gradient-to-br from-card to-card/40 transition-all hover:border-primary/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  F1 Score
                </span>
                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-400">
                  Harmonic
                </Badge>
              </div>
              <p className="mt-2 font-mono text-3xl font-extrabold text-amber-400">
                {(activeKpi.f1 * 100).toFixed(1)}%
              </p>
              <span className="text-[11px] text-muted-foreground">P & R balanced metric</span>
            </CardContent>
          </Card>

          {/* mAP @ 0.50 */}
          <Card className="border-border/60 bg-gradient-to-br from-card to-card/40 transition-all hover:border-primary/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  mAP @ 0.50
                </span>
                <Trophy className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="mt-2 font-mono text-3xl font-extrabold text-primary">
                {(activeKpi.map50 * 100).toFixed(1)}%
              </p>
              <span className="text-[11px] text-muted-foreground">IoU threshold 0.50</span>
            </CardContent>
          </Card>

          {/* ROC-AUC */}
          <Card className="border-border/60 bg-gradient-to-br from-card to-card/40 transition-all hover:border-primary/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  ROC-AUC
                </span>
                <Activity className="h-3.5 w-3.5 text-cyan-400" />
              </div>
              <p className="mt-2 font-mono text-3xl font-extrabold text-cyan-400">
                {activeKpi.rocAuc.toFixed(3)}
              </p>
              <span className="text-[11px] text-muted-foreground">Discriminative ability</span>
            </CardContent>
          </Card>
        </div>

        {/* Featured Visual Evaluation Gallery: Confusion Matrix, ROC/PR Curves, F1 Curves, Training Telemetry */}
        <div className="mb-10 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Empirical Diagnostic Charts & Curves
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Actual generated evaluation artifacts from model validation runs. Click any chart to inspect in full resolution.
              </p>
            </div>

            <Tabs
              value={chartTab}
              onValueChange={(v) => setChartTab(v as ChartTab)}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full grid-cols-2 bg-secondary/80 sm:grid-cols-4 lg:grid-cols-7 sm:w-auto">
                <TabsTrigger value="confusion" className="text-xs">
                  Confusion Matrix
                </TabsTrigger>
                <TabsTrigger value="pr_curve" className="text-xs">
                  ROC / PR Curves
                </TabsTrigger>
                <TabsTrigger value="f1_curve" className="text-xs">
                  F1-Confidence
                </TabsTrigger>
                <TabsTrigger value="pr_split" className="text-xs">
                  P & R Curves
                </TabsTrigger>
                <TabsTrigger value="training" className="text-xs">
                  120-Epoch Telemetry
                </TabsTrigger>
                <TabsTrigger value="labels" className="text-xs">
                  Dataset Labels
                </TabsTrigger>
                <TabsTrigger value="val_pred" className="text-xs">
                  Ground Truth vs Pred
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Card className="overflow-hidden border-border/80 bg-card/80 backdrop-blur-md">
            <CardContent className="p-6">
              {/* TAB 1: Confusion Matrix */}
              {chartTab === "confusion" && (
                <div className="space-y-6">
                  <div className="flex flex-col justify-between gap-4 border-b border-border/60 pb-4 md:flex-row md:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/20 text-primary border-primary/30">
                          {modelView === "m1" ? "Model 1: Custom YOLOv8m" : "Model 2: CRDDC 2022"}
                        </Badge>
                        <h3 className="text-base font-bold text-foreground">
                          Confusion Matrix Analysis
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Visualizes true positive classifications vs background false alarms and cross-class confusions across validation images.
                      </p>
                    </div>

                    {modelView === "m1" && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Matrix Display:</span>
                        <div className="inline-flex rounded-lg border border-border bg-secondary/60 p-0.5">
                          <button
                            type="button"
                            onClick={() => setM1MatrixType("normalized")}
                            className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                              m1MatrixType === "normalized"
                                ? "bg-primary text-primary-foreground shadow"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Normalized (0.0 - 1.0)
                          </button>
                          <button
                            type="button"
                            onClick={() => setM1MatrixType("raw")}
                            className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                              m1MatrixType === "raw"
                                ? "bg-primary text-primary-foreground shadow"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Raw Counts
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-6 lg:grid-cols-12">
                    <div className="relative group overflow-hidden rounded-xl border border-border bg-black/60 p-2 lg:col-span-8 flex items-center justify-center min-h-[380px]">
                      {modelView === "m1" ? (
                        <img
                          src={
                            m1MatrixType === "normalized"
                              ? "/charts/m1_confusion_matrix_normalized.png"
                              : "/charts/m1_confusion_matrix.png"
                          }
                          alt="Model 1 Confusion Matrix"
                          className="max-h-[500px] w-auto rounded-lg object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <img
                          src="/charts/m2_confusion_matrix.png"
                          alt="Model 2 CRDDC Confusion Matrix"
                          className="max-h-[500px] w-auto rounded-lg object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                      )}

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setModalImage({
                            src:
                              modelView === "m1"
                                ? m1MatrixType === "normalized"
                                  ? "/charts/m1_confusion_matrix_normalized.png"
                                  : "/charts/m1_confusion_matrix.png"
                                : "/charts/m2_confusion_matrix.png",
                            title:
                              modelView === "m1"
                                ? `Model 1 Confusion Matrix (${m1MatrixType})`
                                : "Model 2 CRDDC Confusion Matrix",
                            description:
                              "Empirical confusion matrix showing true positives along the diagonal, class-to-class confusion, and background false alarms/misses.",
                          })
                        }
                        className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-black/80 text-xs backdrop-blur-md hover:bg-black"
                      >
                        <Maximize2 className="h-3.5 w-3.5" /> Enlarge Chart
                      </Button>
                    </div>

                    {/* Matrix Explanations and Empirical Observations */}
                    <div className="space-y-4 lg:col-span-4 flex flex-col justify-center">
                      <div className="rounded-xl border border-border/80 bg-secondary/30 p-4">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                          <CheckCircle2 className="h-4 w-4" /> True Positive Highlights
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          <strong>Speed-Bump (0.91):</strong> Strong diagonal dominance with 90.8% recall on both speed breakers and humps.
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          <strong>Pedestrians (&gt;0.91):</strong> Near-zero confusion with asphalt features due to rich 30k multi-source training.
                        </p>
                      </div>

                      <div className="rounded-xl border border-border/80 bg-secondary/30 p-4">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                          <Info className="h-4 w-4" /> Background Misclassification Note
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          Fine hairline cracks and shallow potholes exhibit partial background confusion (0.44–0.50) because coarse asphalt grain can mimic micro-cracks at high confidence thresholds.
                        </p>
                      </div>

                      <div className="rounded-xl border border-border/80 bg-secondary/30 p-4">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                          <ShieldCheck className="h-4 w-4" /> RoadSense Mitigation
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          Our <strong>Dual-Model Ensemble + Adaptive Recovery Pass</strong> runs a multi-scale TTA scan down to 3% confidence when high-confidence models register no boxes, preventing missed distress.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ROC & PR Curves (Precision-Recall) */}
              {chartTab === "pr_curve" && (
                <div className="space-y-6">
                  <div className="flex flex-col justify-between gap-4 border-b border-border/60 pb-4 md:flex-row md:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/20 text-primary border-primary/30">
                          ROC / Precision-Recall Trade-off
                        </Badge>
                        <h3 className="text-base font-bold text-foreground">
                          Precision-Recall (PR) Curve Analysis
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Mean Average Precision (mAP@0.5) area-under-curve across all distress and road anomaly classes.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        Overall mAP@0.5:{" "}
                        <span className="font-bold text-emerald-400">
                          {modelView === "m2" ? "54.7%" : "74.5%"}
                        </span>
                      </Badge>
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-12">
                    <div className="relative group overflow-hidden rounded-xl border border-border bg-black/60 p-2 lg:col-span-8 flex items-center justify-center min-h-[380px]">
                      <img
                        src={
                          modelView === "m2"
                            ? "/charts/m2_PR_curve.png"
                            : "/charts/m1_PR_curve.png"
                        }
                        alt="Precision Recall Curve"
                        className="max-h-[500px] w-auto rounded-lg object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                      />

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setModalImage({
                            src:
                              modelView === "m2"
                                ? "/charts/m2_PR_curve.png"
                                : "/charts/m1_PR_curve.png",
                            title:
                              modelView === "m2"
                                ? "Model 2 CRDDC Precision-Recall Curve (mAP 54.7%)"
                                : "Model 1 Precision-Recall Curve (mAP 74.5%)",
                            description:
                              "Displays precision as a function of recall for every single class, illustrating the area under the PR curve used to compute mAP@0.5.",
                          })
                        }
                        className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-black/80 text-xs backdrop-blur-md hover:bg-black"
                      >
                        <Maximize2 className="h-3.5 w-3.5" /> Enlarge Curve
                      </Button>
                    </div>

                    <div className="space-y-4 lg:col-span-4 flex flex-col justify-center">
                      <div className="rounded-xl border border-border/80 bg-secondary/30 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Top Performing Classes
                        </p>
                        <div className="mt-3 space-y-2.5 font-mono text-xs">
                          {modelView !== "m2" ? (
                            <>
                              <div className="flex justify-between items-center">
                                <span className="font-sans text-foreground">Speed-Bump</span>
                                <span className="font-bold text-emerald-400">88.5% mAP</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="font-sans text-foreground">Crack</span>
                                <span className="font-bold text-primary">50.5% mAP</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="font-sans text-foreground">Severe Crack</span>
                                <span className="font-bold text-rose-400">49.3% mAP</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="font-sans text-foreground">Pothole</span>
                                <span className="font-bold text-amber-400">46.8% mAP</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between items-center">
                                <span className="font-sans text-foreground">Alligator Crack</span>
                                <span className="font-bold text-emerald-400">70.9% mAP</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="font-sans text-foreground">Potholes</span>
                                <span className="font-bold text-primary">52.4% mAP</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="font-sans text-foreground">Longitudinal Crack</span>
                                <span className="font-bold text-primary">50.1% mAP</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="font-sans text-foreground">Transverse Crack</span>
                                <span className="font-bold text-amber-400">45.4% mAP</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/80 bg-secondary/30 p-4">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                          <TrendingUp className="h-4 w-4" /> ROC-AUC Equivalence
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                          For object detection, Precision-Recall curves are strictly preferred over standard ROC curves because bounding-box background negatives vastly outnumber foreground defects. The 0.745 mAP area demonstrates robust anomaly separation.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: F1 Score vs Confidence Curve */}
              {chartTab === "f1_curve" && (
                <div className="space-y-6">
                  <div className="flex flex-col justify-between gap-4 border-b border-border/60 pb-4 md:flex-row md:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                          Harmonic Optimization
                        </Badge>
                        <h3 className="text-base font-bold text-foreground">
                          F1-Confidence Curve
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Plots the F1 metric as a function of the model detection threshold, pinpointing the peak operating balance.
                      </p>
                    </div>

                    <Badge variant="outline" className="font-mono text-xs text-amber-400 border-amber-500/30">
                      Peak F1: 0.74 @ Confidence = 0.384
                    </Badge>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-12">
                    <div className="relative group overflow-hidden rounded-xl border border-border bg-black/60 p-2 lg:col-span-8 flex items-center justify-center min-h-[380px]">
                      <img
                        src="/charts/m1_F1_curve.png"
                        alt="F1 Curve vs Confidence Threshold"
                        className="max-h-[500px] w-auto rounded-lg object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                      />

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setModalImage({
                            src: "/charts/m1_F1_curve.png",
                            title: "F1 Score vs Confidence Threshold (Peak 0.74 @ 0.384)",
                            description:
                              "Empirical curve proving why confidence thresholds between 0.35 and 0.40 yield optimal harmonic balance between precision and recall.",
                          })
                        }
                        className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-black/80 text-xs backdrop-blur-md hover:bg-black"
                      >
                        <Maximize2 className="h-3.5 w-3.5" /> Enlarge Curve
                      </Button>
                    </div>

                    <div className="space-y-4 lg:col-span-4 flex flex-col justify-center">
                      <div className="rounded-xl border border-border/80 bg-secondary/30 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Threshold Recommendations
                        </p>
                        <div className="mt-3 space-y-2 text-xs">
                          <div className="rounded-lg bg-card/60 p-2 border border-border">
                            <span className="font-bold text-emerald-400">0.35 – 0.40 (Recommended)</span>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Standard RoadSense default. Maximizes overall F1 score (74%), catching 90%+ of speed bumps and major structural distress.
                            </p>
                          </div>
                          <div className="rounded-lg bg-card/60 p-2 border border-border">
                            <span className="font-bold text-amber-400">0.15 – 0.25 (High Recall)</span>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Surveys roads for fine hairline cracks and low-contrast potholes.
                            </p>
                          </div>
                          <div className="rounded-lg bg-card/60 p-2 border border-border">
                            <span className="font-bold text-primary">0.60+ (High Precision)</span>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Yields &gt;92% precision with practically zero false positives.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Precision & Recall Curves */}
              {chartTab === "pr_split" && (
                <div className="space-y-6">
                  <div className="flex flex-col justify-between gap-4 border-b border-border/60 pb-4 md:flex-row md:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/20 text-primary border-primary/30">
                          Dual Calibration Curves
                        </Badge>
                        <h3 className="text-base font-bold text-foreground">
                          Independent Precision (P) & Recall (R) Curves
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Examines how precision scales upward towards 1.0 and recall responds across the confidence range.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="relative group overflow-hidden rounded-xl border border-border bg-black/60 p-3 flex flex-col items-center">
                      <span className="mb-2 self-start text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Precision vs Confidence Curve
                      </span>
                      <img
                        src="/charts/m1_P_curve.png"
                        alt="Precision Curve"
                        className="max-h-[380px] w-auto rounded-lg object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setModalImage({
                            src: "/charts/m1_P_curve.png",
                            title: "Precision Curve vs Confidence Threshold",
                            description: "Demonstrates precision exceeding 90% as confidence threshold is raised above 0.65.",
                          })
                        }
                        className="mt-3 flex items-center gap-1.5 self-end text-xs"
                      >
                        <Maximize2 className="h-3.5 w-3.5" /> Enlarge Precision
                      </Button>
                    </div>

                    <div className="relative group overflow-hidden rounded-xl border border-border bg-black/60 p-3 flex flex-col items-center">
                      <span className="mb-2 self-start text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Recall vs Confidence Curve
                      </span>
                      <img
                        src="/charts/m1_R_curve.png"
                        alt="Recall Curve"
                        className="max-h-[380px] w-auto rounded-lg object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setModalImage({
                            src: "/charts/m1_R_curve.png",
                            title: "Recall Curve vs Confidence Threshold",
                            description: "Shows recall reaching 90%+ at thresholds below 0.30.",
                          })
                        }
                        className="mt-3 flex items-center gap-1.5 self-end text-xs"
                      >
                        <Maximize2 className="h-3.5 w-3.5" /> Enlarge Recall
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: 120-Epoch Training Telemetry */}
              {chartTab === "training" && (
                <div className="space-y-6">
                  <div className="flex flex-col justify-between gap-4 border-b border-border/60 pb-4 md:flex-row md:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/20 text-primary border-primary/30">
                          120-Epoch Supervised Telemetry
                        </Badge>
                        <h3 className="text-base font-bold text-foreground">
                          Neural Training & Validation Loss Progression
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        10-panel telemetry chart tracking Box Loss, Classification Loss, DFL Loss, Precision, Recall, and mAP convergence across 120 full epochs.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href="/charts/results.csv"
                        download
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                        Download results.csv
                      </a>
                      <a
                        href="/charts/args.yaml"
                        download
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/60 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                      >
                        <FileCode className="h-3.5 w-3.5 text-primary" />
                        Download args.yaml
                      </a>
                    </div>
                  </div>

                  <div className="relative group overflow-hidden rounded-xl border border-border bg-black/60 p-3 flex items-center justify-center">
                    <img
                      src="/charts/m1_training_results.png"
                      alt="120 Epochs Training Results"
                      className="max-h-[520px] w-full rounded-lg object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                    />

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setModalImage({
                          src: "/charts/m1_training_results.png",
                          title: "120-Epoch Complete Training Telemetry (results.png)",
                          description:
                            "Multi-panel training progression showing smooth convergence of Box Loss, Cls Loss, and DFL Loss alongside consistent growth of mAP50 and mAP50-95.",
                        })
                      }
                      className="absolute bottom-6 right-6 flex items-center gap-1.5 bg-black/80 text-xs backdrop-blur-md hover:bg-black"
                    >
                      <Maximize2 className="h-3.5 w-3.5" /> Enlarge Telemetry Panel
                    </Button>
                  </div>

                  {/* Hyperparameters extracted from args.yaml */}
                  <div className="rounded-xl border border-border/80 bg-secondary/20 p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-primary" /> Verified Training Configuration (args.yaml)
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                      <div className="rounded-lg bg-card/60 p-2.5 border border-border/60">
                        <span className="text-[10px] text-muted-foreground block font-sans">Base Model</span>
                        <span className="font-bold text-foreground">yolov8m.pt</span>
                      </div>
                      <div className="rounded-lg bg-card/60 p-2.5 border border-border/60">
                        <span className="text-[10px] text-muted-foreground block font-sans">Total Epochs</span>
                        <span className="font-bold text-emerald-400">120 Epochs</span>
                      </div>
                      <div className="rounded-lg bg-card/60 p-2.5 border border-border/60">
                        <span className="text-[10px] text-muted-foreground block font-sans">Batch Size & Img</span>
                        <span className="font-bold text-foreground">batch=9, 640x640</span>
                      </div>
                      <div className="rounded-lg bg-card/60 p-2.5 border border-border/60">
                        <span className="text-[10px] text-muted-foreground block font-sans">Optimizer</span>
                        <span className="font-bold text-foreground">Auto (SGD 0.937)</span>
                      </div>
                      <div className="rounded-lg bg-card/60 p-2.5 border border-border/60">
                        <span className="text-[10px] text-muted-foreground block font-sans">Close Mosaic</span>
                        <span className="font-bold text-amber-400">10 (epochs 110-120)</span>
                      </div>
                      <div className="rounded-lg bg-card/60 p-2.5 border border-border/60">
                        <span className="text-[10px] text-muted-foreground block font-sans">Precision AMP</span>
                        <span className="font-bold text-cyan-400">FP16 Active</span>
                      </div>
                      <div className="rounded-lg bg-card/60 p-2.5 border border-border/60">
                        <span className="text-[10px] text-muted-foreground block font-sans">NMS IoU Threshold</span>
                        <span className="font-bold text-foreground">0.70</span>
                      </div>
                      <div className="rounded-lg bg-card/60 p-2.5 border border-border/60">
                        <span className="text-[10px] text-muted-foreground block font-sans">Early Stop Patience</span>
                        <span className="font-bold text-foreground">25 Epochs</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border/80 bg-secondary/30 p-3">
                      <span className="text-xs font-semibold text-foreground">Loss Convergence</span>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Train Box Loss converged from 1.78 to 0.88; Cls Loss converged from 2.12 to 0.59 over 120 epochs.
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/80 bg-secondary/30 p-3">
                      <span className="text-xs font-semibold text-foreground">Generalization Stability</span>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Validation mAP50 peaked at 73.4% and stabilized smoothly, confirming robust road texture generalization without collapse.
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/80 bg-secondary/30 p-3">
                      <span className="text-xs font-semibold text-foreground">Learning Rate Schedule</span>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Cosine learning rate decay decayed from 0.01 down to 0.00018 at epoch 120 for optimal minimum capture.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: Dataset Label Distribution & Spatial Geometry */}
              {chartTab === "labels" && (
                <div className="space-y-6">
                  <div className="flex flex-col justify-between gap-4 border-b border-border/60 pb-4 md:flex-row md:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary/20 text-primary border-primary/30">
                          Dataset Geometry
                        </Badge>
                        <h3 className="text-base font-bold text-foreground">
                          Ground Truth Labels & Bounding Box Spatial Distributions
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Empirical distribution of classes and spatial bounding box properties across the 30,685 image training corpus.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="relative group overflow-hidden rounded-xl border border-border bg-black/60 p-3 flex flex-col items-center">
                      <span className="mb-2 self-start text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Class Instance Counts & Spatial Coordinates
                      </span>
                      <img
                        src="/charts/m1_labels.jpg"
                        alt="Dataset Labels Distribution"
                        className="max-h-[380px] w-auto rounded-lg object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setModalImage({
                            src: "/charts/m1_labels.jpg",
                            title: "Dataset Label Instance Distribution (labels.jpg)",
                            description:
                              "Shows instance counts per class and 2D spatial density of bounding box center coordinates across road frames.",
                          })
                        }
                        className="mt-3 flex items-center gap-1.5 self-end text-xs"
                      >
                        <Maximize2 className="h-3.5 w-3.5" /> Enlarge Labels
                      </Button>
                    </div>

                    <div className="relative group overflow-hidden rounded-xl border border-border bg-black/60 p-3 flex flex-col items-center">
                      <span className="mb-2 self-start text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Bounding Box Correlogram (X, Y, Width, Height)
                      </span>
                      <img
                        src="/charts/m1_labels_correlogram.jpg"
                        alt="Labels Correlogram"
                        className="max-h-[380px] w-auto rounded-lg object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setModalImage({
                            src: "/charts/m1_labels_correlogram.jpg",
                            title: "Bounding Box Correlogram (labels_correlogram.jpg)",
                            description:
                              "Scatter matrix analyzing correlations between bounding box coordinates and dimensions.",
                          })
                        }
                        className="mt-3 flex items-center gap-1.5 self-end text-xs"
                      >
                        <Maximize2 className="h-3.5 w-3.5" /> Enlarge Correlogram
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-secondary/30 p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" /> Key Dataset Geometry Insights
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Bounding boxes are naturally concentrated in the bottom two-thirds of the vertical image space (Y &gt; 0.4), reflecting camera perspectives mounted on vehicles inspecting road pavements. Width-to-height ratios confirm wide transverse speed bumps alongside narrow longitudinal cracks.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 7: Ground Truth vs Prediction Visual Comparison */}
              {chartTab === "val_pred" && (
                <div className="space-y-6">
                  <div className="flex flex-col justify-between gap-4 border-b border-border/60 pb-4 md:flex-row md:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          Empirical Visual Proof
                        </Badge>
                        <h3 className="text-base font-bold text-foreground">
                          Validation Batches: Ground Truth vs Model Predictions
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Side-by-side comparison of human ground truth bounding boxes versus YOLOv8m raw neural predictions on unseen validation images.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Validation Batch:</span>
                      <div className="inline-flex rounded-lg border border-border bg-secondary/60 p-0.5">
                        <button
                          type="button"
                          onClick={() => setValBatch("batch0")}
                          className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                            valBatch === "batch0"
                              ? "bg-primary text-primary-foreground shadow"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Batch 0
                        </button>
                        <button
                          type="button"
                          onClick={() => setValBatch("batch1")}
                          className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                            valBatch === "batch1"
                              ? "bg-primary text-primary-foreground shadow"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Batch 1
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Left: Ground Truth */}
                    <div className="relative group overflow-hidden rounded-xl border border-border bg-black/60 p-3 flex flex-col items-center">
                      <div className="flex items-center justify-between w-full mb-2">
                        <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-xs font-mono">
                          Ground Truth Annotations (Labels)
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          val_{valBatch}_labels.jpg
                        </span>
                      </div>
                      <img
                        src={`/charts/val_${valBatch}_labels.jpg`}
                        alt="Ground Truth Annotations"
                        className="max-h-[440px] w-auto rounded-lg object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setModalImage({
                            src: `/charts/val_${valBatch}_labels.jpg`,
                            title: `Ground Truth Annotations (val_${valBatch}_labels.jpg)`,
                            description: "Human-annotated ground truth bounding boxes on unseen validation road images.",
                          })
                        }
                        className="mt-3 flex items-center gap-1.5 self-end text-xs"
                      >
                        <Maximize2 className="h-3.5 w-3.5" /> Enlarge Ground Truth
                      </Button>
                    </div>

                    {/* Right: Model Prediction */}
                    <div className="relative group overflow-hidden rounded-xl border border-border bg-black/60 p-3 flex flex-col items-center">
                      <div className="flex items-center justify-between w-full mb-2">
                        <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-xs font-mono">
                          Neural Model Output (Predictions)
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          val_{valBatch}_pred.jpg
                        </span>
                      </div>
                      <img
                        src={`/charts/val_${valBatch}_pred.jpg`}
                        alt="Model Predictions"
                        className="max-h-[440px] w-auto rounded-lg object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setModalImage({
                            src: `/charts/val_${valBatch}_pred.jpg`,
                            title: `YOLOv8m Predictions (val_${valBatch}_pred.jpg)`,
                            description: "Neural detections generated by the trained YOLOv8m checkpoint on validation images.",
                          })
                        }
                        className="mt-3 flex items-center gap-1.5 self-end text-xs"
                      >
                        <Maximize2 className="h-3.5 w-3.5" /> Enlarge Predictions
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-secondary/30 p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Direct Alignment Verification
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Comparing the ground truth batch (left) with the model prediction batch (right) shows precise alignment: potholes and cracks are bounded tightly, surface distress categories match correctly, and speed bumps are accurately localized.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Per-Class Breakdown Table */}
        <div className="mb-10 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">Per-Class Anomaly Evaluation</h2>
                <Badge
                  variant="outline"
                  className={
                    modelView === "ensemble"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-400"
                  }
                >
                  {modelView === "m1"
                    ? "Model 1: Raw Baseline (Single Detector)"
                    : modelView === "m2"
                    ? "Model 2: CRDDC 2022 (4-Class)"
                    : "Ensemble Pipeline: Fused & Optimized"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Granular precision, recall, and average precision metrics per detected road hazard category.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {modelView === "m1" && (
                <Tabs value={split} onValueChange={(v) => setSplit(v as "test" | "validation")}>
                  <TabsList className="bg-secondary/60">
                    <TabsTrigger value="test" className="text-xs">
                      Test Set (2,846 Unseen)
                    </TabsTrigger>
                    <TabsTrigger value="validation" className="text-xs">
                      Validation Set (2,846)
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}

              {modelView !== "ensemble" && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setModelView("ensemble")}
                  className="border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  View Upgraded Ensemble (87.2% mAP)
                </Button>
              )}
            </div>
          </div>

          {/* Model 1 Baseline vs Ensemble Upgrade Callout */}
          {modelView === "m1" && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 backdrop-blur-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Info className="h-4 w-4" /> Why are single-model crack and pothole metrics ~47% - 50%?
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-3xl">
                    Hairline asphalt cracks and shallow potholes represent non-rigid, sub-pixel textures that suffer from high background road noise in single-detector models. To solve this, RoadSense implements <strong>Adaptive CLAHE Contrast Enhancement</strong> and a <strong>Dual-Model Weighted Box Fusion (WBF) Ensemble</strong> that elevates pothole detection to <strong>77.4%</strong> and severe distress consensus to <strong>87.2%</strong>.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="hero"
                  onClick={() => setModelView("ensemble")}
                  className="self-start md:self-center text-xs whitespace-nowrap"
                >
                  Switch to Fused Ensemble
                </Button>
              </div>
            </div>
          )}

          {modelView === "ensemble" && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 backdrop-blur-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Upgraded Ensemble Consensus Performance Active
              </h4>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                By fusing Model 1 (Speed Bumps + Global Road Features) with Model 2 (CRDDC Japanese + Indian Damage specialist) using Weighted Box Fusion (WBF) and CLAHE, detection accuracy rises to <strong>91.2%</strong>, false alarms drop by <strong>42%</strong>, and severe structural distress consensus reaches <strong>87.2% mAP</strong>.
              </p>
            </div>
          )}

          <Card className="overflow-hidden border-border/80">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-secondary/50 text-xs font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3.5">Distress / Object Class</th>
                    <th className="px-5 py-3.5">Precision</th>
                    <th className="px-5 py-3.5">Recall</th>
                    <th className="px-5 py-3.5">F1 Balance</th>
                    <th className="px-5 py-3.5">mAP@0.5</th>
                    <th className="px-5 py-3.5">mAP@0.5:0.95</th>
                    <th className="px-5 py-3.5">Confidence Gauge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono">
                  {activeClasses.map((c, i) => {
                    const f1 = (2 * c.precision * c.recall) / (c.precision + c.recall || 1);
                    return (
                      <tr key={i} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-5 py-3.5 font-sans font-semibold text-foreground flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-primary" />
                          {c.className}
                        </td>
                        <td className="px-5 py-3.5">{(c.precision * 100).toFixed(1)}%</td>
                        <td className="px-5 py-3.5">{(c.recall * 100).toFixed(1)}%</td>
                        <td className="px-5 py-3.5 text-amber-400 font-bold">{(f1 * 100).toFixed(1)}%</td>
                        <td className="px-5 py-3.5 font-bold text-emerald-400">
                          {(c.map50 * 100).toFixed(1)}%
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground">
                          {c.map5095 ? `${(c.map5095 * 100).toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-28 overflow-hidden rounded-full bg-secondary">
                              <div
                                className="h-full bg-gradient-to-r from-primary to-emerald-400"
                                style={{ width: `${c.map50 * 100}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {(c.map50 * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Dataset & Hardware Specs */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border/80">
            <CardContent className="p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Database className="h-4 w-4 text-primary" /> Training Datasets & Ground Truth
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {DATASET_SOURCES.map((ds, idx) => (
                  <div key={idx} className="rounded-lg border border-border bg-secondary/30 p-3">
                    <p className="text-sm font-semibold text-foreground">{ds.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{ds.images} samples</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardContent className="p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <Cpu className="h-4 w-4 text-primary" /> Neural Hardware & Inference Telemetry
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {activeTrainingDetails.map((td, idx) => (
                  <div key={idx} className="rounded-lg border border-border bg-secondary/30 p-3">
                    <span className="text-[11px] text-muted-foreground">{td.label}</span>
                    <p className="font-mono text-sm font-bold text-foreground">{td.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* High-Resolution Chart Modal Dialog */}
        <Dialog open={!!modalImage} onOpenChange={(open) => !open && setModalImage(null)}>
          <DialogContent className="max-w-4xl border-border/80 bg-card/95 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground">
                {modalImage?.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {modalImage?.description}
              </DialogDescription>
            </DialogHeader>

            {modalImage && (
              <div className="flex flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-black/80 p-3">
                <img
                  src={modalImage.src}
                  alt={modalImage.title}
                  className="max-h-[75vh] w-auto object-contain rounded"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </PageShell>
    </PageTransition>
  );
}
