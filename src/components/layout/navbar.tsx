import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Route as RouteIcon, Crosshair } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const LINKS = [
  { label: "Home", to: "/" },
  { label: "Detect", to: "/detect" },
  { label: "Live", to: "/live" },
  { label: "Results", to: "/results" },
  { label: "Performance", to: "/performance" },
  { label: "History", to: "/history" },
  { label: "About", to: "/about" },
];

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/40">
        <RouteIcon className="h-5 w-5 text-primary" />
      </span>
      <span className="font-display text-lg font-bold tracking-tight text-foreground">
        Road<span className="text-primary">Sense</span>
      </span>
    </Link>
  );
}

function NavLink({ label, to, active }: { label: string; to: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
        active
          ? "font-semibold text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

export function Navbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  return (
    <header className="glass sticky top-0 z-50 border-b border-border">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <NavLink key={l.to} {...l} active={pathname === l.to} />
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="hero" size="sm" className="hidden sm:inline-flex">
            <Link to="/detect">
              <Crosshair className="h-4 w-4" />
              Start detecting
            </Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="glass w-72 border-border">
              <SheetTitle className="font-display text-foreground">RoadSense</SheetTitle>
              <nav className="mt-4 flex flex-col gap-1">
                {LINKS.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className={`rounded-lg px-3 py-2.5 text-sm ${
                      pathname === l.to
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {l.label}
                  </Link>
                ))}
                <Button asChild variant="hero" className="mt-3">
                  <Link to="/detect" onClick={() => setOpen(false)}>
                    <Crosshair className="h-4 w-4" />
                    Start detecting
                  </Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
