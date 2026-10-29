import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** Smooth page-transition wrapper used by every route. */
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

/** Shared page shell: consistent width, vertical rhythm and section title. */
export function PageShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export function SectionTitle({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="mb-8">
      {eyebrow && (
        <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      )}
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h1>
      {sub && <p className="mt-3 max-w-2xl text-muted-foreground">{sub}</p>}
    </div>
  );
}
