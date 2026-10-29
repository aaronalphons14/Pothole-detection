import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Cpu,
  Layers,
  Network,
  Route as RouteIcon,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageTransition, PageShell, SectionTitle } from "@/components/page-transition";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About the Architecture — RoadSense" },
      {
        name: "description",
        content: "Technical architecture of the dual-model YOLOv8 road defect detection platform.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <PageTransition>
      <PageShell>
        <SectionTitle
          eyebrow="System Architecture"
          title="About RoadSense Vision Platform"
          sub="Dual-model deep learning architecture engineered for highway maintenance, municipal defect mapping, and autonomous dashcam auditing."
        />

        <div className="space-y-8">
          {/* Dual Engine Card */}
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                <Network className="h-5 w-5 text-primary" /> Dual Ensemble Neural Engine
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                RoadSense unifies two specialized YOLOv8 convolutional neural network architectures to achieve industry-leading recall across diverse road surfaces, lighting conditions, and distress types:
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <span className="font-mono text-xs uppercase tracking-wider text-amber-400 font-bold">
                    Model 1 · YOLOv8 Medium (Custom)
                  </span>
                  <h4 className="mt-1 text-base font-bold text-foreground">Infrastructure Distress Core</h4>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Fine-tuned across 120 epochs on a curated dataset of over 30,000 roadway images. Detects macro road hazards including severe cracks, deep potholes, speed bumps, and pedestrians.
                  </p>
                </div>

                <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">
                  <span className="font-mono text-xs uppercase tracking-wider text-blue-400 font-bold">
                    Model 2 · YOLOv8 Small (CRDDC2022)
                  </span>
                  <h4 className="mt-1 text-base font-bold text-foreground">Fine Surface Morphology</h4>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    Trained specifically on the Crowd-sensing Road Damage Detection Challenge (CRDDC) taxonomy. Pinpoints fine-grained crack orientations: longitudinal cracks, transverse cracks, and alligator fatigue cracking.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pipeline Features */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <ShieldCheck className="h-8 w-8 text-primary mb-3" />
                <h4 className="font-bold text-foreground">Autonomous Auditing</h4>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  Calculates road severity indices and flags high-risk surface cavities before vehicle tyre failure or suspension damage occurs.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <Zap className="h-8 w-8 text-primary mb-3" />
                <h4 className="font-bold text-foreground">Ultra-Low Latency</h4>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  Inference executes at ~12ms per frame, enabling 30+ FPS real-time processing on standard edge hardware and vehicle-mounted cameras.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <Layers className="h-8 w-8 text-primary mb-3" />
                <h4 className="font-bold text-foreground">Supervision Overlays</h4>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  Interactive normalized bounding boxes with precision confidence telemetry, class filtering, and JSON/CSV exportable compliance audits.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageShell>
    </PageTransition>
  );
}
