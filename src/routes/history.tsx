import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Clock,
  Eye,
  FileSearch,
  Filter,
  History as HistoryIcon,
  RotateCcw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageTransition, PageShell, SectionTitle } from "@/components/page-transition";
import { loadHistory, saveResult } from "@/lib/detection-store";
import type { HistoryEntry } from "@/lib/mock";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Inspection History — RoadSense" },
      {
        name: "description",
        content: "Audit trail and history of previous road distress scans, anomaly detections, and reports.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string>("All");

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const filtered = history.filter((h) => {
    if (filterSeverity === "All") return true;
    return h.severity === filterSeverity;
  });

  const handleOpenResult = (entry: HistoryEntry) => {
    saveResult(entry);
    navigate({ to: "/results" });
  };

  const handleClearHistory = () => {
    localStorage.removeItem("roadsense:history");
    setHistory(loadHistory());
    toast.info("Inspection history cleared.");
  };

  return (
    <PageTransition>
      <PageShell>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <SectionTitle
            eyebrow="Audit Trail"
            title="Pavement Inspection History"
            sub="Review past anomaly inspections, telemetry metrics, and load previous scans directly into the visual segmenter."
          />

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleClearHistory}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" /> Clear History
            </Button>
          </div>
        </div>

        {/* Severity Filter Tabs */}
        <div className="mb-6 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Filter:</span>
          {["All", "High", "Medium", "Low"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterSeverity(s)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                filterSeverity === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* History List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileSearch className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                {history.length === 0 ? (
                  <>
                    <p className="font-semibold text-foreground">No inspection scans recorded yet.</p>
                    <p className="mt-1 text-xs text-muted-foreground">Upload a road photo on the Detect page to run live ML inference.</p>
                  </>
                ) : (
                  <p>No scans found matching "{filterSeverity}".</p>
                )}
              </CardContent>
            </Card>
          ) : (
            filtered.map((entry) => (
              <Card
                key={entry.id}
                className="overflow-hidden transition-all hover:border-primary/50 hover:bg-secondary/20"
              >
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <img
                      src={entry.imageUrl}
                      alt={entry.fileName}
                      className="h-16 w-24 rounded-lg object-cover border border-border"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{entry.fileName}</p>
                        <Badge
                          variant={
                            entry.severity === "High"
                              ? "destructive"
                              : entry.severity === "Medium"
                              ? "secondary"
                              : "outline"
                          }
                          className="font-mono text-[10px]"
                        >
                          {entry.severity}
                        </Badge>
                      </div>

                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(entry.createdAt).toLocaleDateString()} {new Date(entry.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span>·</span>
                        <span>{entry.detections.length} Anomalies</span>
                        <span>·</span>
                        <span className="font-mono">{entry.inferenceMs} ms</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="hero" size="sm" onClick={() => handleOpenResult(entry)}>
                      <Eye className="mr-1 h-3.5 w-3.5" /> View Inspection
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </PageShell>
    </PageTransition>
  );
}
