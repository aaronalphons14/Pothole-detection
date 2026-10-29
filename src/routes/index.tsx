import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Camera,
  Crosshair,
  FileSearch,
  Image as ImageIcon,
  ScanLine,
  Upload,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageTransition } from "@/components/page-transition";
import { BoxOverlay } from "@/components/box-overlay";
import { useCountUp } from "@/hooks/use-count-up";
import { CLASSES } from "@/lib/classes";
import { sampleById, type Detection } from "@/lib/mock";
import potholeImg from "@/assets/sample-pothole.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RoadSense — See every pothole before your tyres do" },
      {
        name: "description",
        content:
          "AI-powered road anomaly detection. Find potholes, cracks, severe cracks and speed bumps in images, videos and live dash-cam feeds with YOLOv8.",
      },
      { property: "og:title", content: "RoadSense — See every pothole before your tyres do" },
      {
        property: "og:description",
        content: "AI-powered road anomaly detection with YOLOv8 — images, videos and live dash-cam feeds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const HERO_BOXES: Detection[] = [
  { model: "m1", className: "Pothole", confidence: 0.87, box: [0.28, 0.31, 0.62, 0.62] },
  { model: "m1", className: "Crack", confidence: 0.74, box: [0.05, 0.08, 0.36, 0.2] },
  { model: "m1", className: "Speed-Bump", confidence: 0.91, box: [0.62, 0.78, 0.97, 0.9] },
];

function Stat({ value, decimals = 0, prefix = "", suffix = "", label }: {
  value: number; decimals?: number; prefix?: string; suffix?: string; label: string;
}) {
  const { ref, text } = useCountUp(value, decimals);
  return (
    <div className="text-center sm:text-left">
      <span ref={ref} className="font-mono text-3xl font-bold text-foreground sm:text-4xl">
        {prefix}
        {text}
        {suffix}
      </span>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

const STEPS = [
  { icon: Upload, title: "Upload", text: "Drop in a road image, a dash-cam clip or connect a live feed." },
  { icon: ScanLine, title: "YOLOv8 analysis", text: "Two fine-tuned YOLOv8 models scan every frame for anomalies." },
  { icon: FileSearch, title: "Annotated results & report", text: "Get labeled boxes, confidence scores and exportable reports." },
];

const FEATURES = [
  {
    icon: ImageIcon,
    title: "Image detection",
    text: "Upload road photos and get annotated bounding boxes, per-class confidence and exportable reports.",
    to: "/detect",
    cta: "Detect in an image",
  },
  {
    icon: Video,
    title: "Video analysis",
    text: "Feed a dash-cam recording through the pipeline and review frame-by-frame anomaly findings.",
    to: "/detect",
    cta: "Analyze a video",
  },
  {
    icon: Camera,
    title: "Live dash cam",
    text: "Run detection on a live camera feed with a real-time event feed and session statistics.",
    to: "/live",
    cta: "Open live view",
  },
];

function Index() {
  return (
    <PageTransition>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="hero-grid absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24 lg:px-8">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs text-primary">
              <ScanLine className="h-3.5 w-3.5" />
              YOLOv8 · Real-time road inspection
            </p>
            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              See every pothole <span className="text-primary">before your tyres do.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              RoadSense finds potholes, cracks, severe cracks and speed bumps in road images,
              dash-cam videos and live camera feeds — annotated, scored and exportable in seconds.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="lg">
                <Link to="/detect">
                  <Crosshair className="h-4 w-4" />
                  Start detecting
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/live">
                  Watch live demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Animated preview card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <div className="relative rounded-xl border border-border bg-card p-3 shadow-2xl">
              <div className="flex items-center justify-between px-1 pb-2">
                <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  <span className="live-dot inline-block h-2 w-2 rounded-full bg-destructive" />
                  yolov8m-custom · detecting
                </span>
                <span className="font-mono text-xs text-muted-foreground">1280×720</span>
              </div>
              <div className="relative overflow-hidden rounded-lg">
                <img
                  src={potholeImg}
                  alt="Road surface being analyzed by YOLOv8"
                  width={1024}
                  height={576}
                  className="h-auto w-full"
                />
                <BoxOverlay boxes={HERO_BOXES} animated stagger={0.6} pulse />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-b border-border bg-card/40">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-4 lg:px-8">
          <Stat value={74.5} decimals={1} suffix="%" label="mAP@0.5 on the test set" />
          <Stat value={12} prefix="~" suffix=" ms" label="per image inference" />
          <Stat value={30685} label="training images" />
          <Stat value={7} label="detectable classes" />
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Three ways to inspect</h2>
        <p className="mt-2 max-w-xl text-muted-foreground">
          From a single photo to a full dash-cam session — the same two YOLOv8 models power every mode.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {FEATURES.map((f) => (
            <Link key={f.title} to={f.to}>
              <Card className="card-hover h-full">
                <CardContent className="p-6">
                  <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/12 ring-1 ring-primary/30">
                    <f.icon className="h-5 w-5 text-primary" />
                  </span>
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
                  <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {f.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-card/40">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative">
                <div className="flex items-center gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 font-mono text-sm font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="hidden h-px flex-1 bg-border md:block" aria-hidden />
                </div>
                <h3 className="mt-4 flex items-center gap-2 font-semibold">
                  <s.icon className="h-4 w-4 text-primary" />
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Class chips */}
      <section className="mx-auto w-full max-w-7xl px-4 py-14 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">7 classes, one pass</h2>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {CLASSES.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
              {c.label}
            </span>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-10 text-center sm:p-14">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to inspect your roads?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            Upload an image or open the live view — no setup required. {sampleById("pothole").label} samples included.
          </p>
          <Button asChild variant="hero" size="lg" className="mt-7">
            <Link to="/detect">
              <Crosshair className="h-4 w-4" />
              Start detecting
            </Link>
          </Button>
        </div>
      </section>
    </PageTransition>
  );
}
