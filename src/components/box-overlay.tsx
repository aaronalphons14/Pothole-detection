import { motion } from "framer-motion";
import { classInfo, MODEL2_COLOR } from "@/lib/classes";
import type { Detection } from "@/lib/mock";

/**
 * Absolutely-positioned detection boxes drawn over a relatively positioned
 * image container. Model 1 boxes are solid in class colors; Model 2 boxes
 * are dashed blue.
 */
export function BoxOverlay({
  boxes,
  animated = false,
  stagger = 0.45,
  pulse = false,
}: {
  boxes: Detection[];
  animated?: boolean;
  stagger?: number;
  pulse?: boolean;
}) {
  return (
    <>
      {boxes.map((d, i) => {
        const isM2 = d.model === "m2";
        const color = isM2 ? MODEL2_COLOR : classInfo(d.className).color;
        const [x1, y1, x2, y2] = d.box;
        const style: React.CSSProperties = {
          left: `${x1 * 100}%`,
          top: `${y1 * 100}%`,
          width: `${(x2 - x1) * 100}%`,
          height: `${(y2 - y1) * 100}%`,
          borderColor: color,
          borderStyle: isM2 ? "dashed" : "solid",
        };

        const label = (
          <span
            className="absolute -top-5 left-0 max-w-full truncate rounded px-1 font-mono text-[10px] font-medium text-[#0E1116]"
            style={{ backgroundColor: color }}
          >
            {d.className} {(d.confidence * 100).toFixed(0)}%
          </span>
        );

        const box = (
          <div className="absolute" style={style}>
            <div
              className={`h-full w-full rounded-sm border-2 ${
                pulse ? "shadow-[0_0_18px_-2px_currentColor]" : ""
              }`}
              style={{ color }}
            />
            {label}
          </div>
        );

        if (!animated) return <div key={i}>{box}</div>;

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * stagger, duration: 0.4, ease: "easeOut" }}
          >
            {box}
          </motion.div>
        );
      })}
    </>
  );
}
