"use client";

import {
  BookOpenText,
  CalendarDays,
  ChartNoAxesCombined,
  CloudSun,
  Ellipsis,
  LandPlot,
  Leaf,
  Settings2,
  Waves,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { containTabFocus } from "@/lib/client/focus-management";
import { useUiStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";

const primaryNav = [
  { href: "/this-week", label: "This week", shortLabel: "Week", icon: Leaf },
  { href: "/my-land", label: "Land", shortLabel: "Land", icon: LandPlot },
  {
    href: "/weather-water",
    label: "Conditions",
    shortLabel: "Conditions",
    icon: CloudSun,
  },
  {
    href: "/calendar",
    label: "Calendar",
    shortLabel: "Calendar",
    icon: CalendarDays,
  },
] as const;

const secondaryNav = [
  {
    href: "/markets-income",
    label: "Markets",
    icon: ChartNoAxesCombined,
  },
  {
    href: "/environment-compliance",
    label: "Environment",
    icon: Waves,
  },
  {
    href: "/methodology",
    label: "Methodology",
    icon: BookOpenText,
  },
] as const;

export function BrandMark({ className }: { className?: string }) {
  // Three furrows meeting a field horizon: the notebook's stamp.
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("h-8 w-8", className)}
      aria-hidden="true"
    >
      <path
        d="M4 23.5h24"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 23.5c1.5-6.5 4.2-11.5 8-15 3.8 3.5 6.5 8.5 8 15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 8.5v15M11.5 18c1.4-2 2.9-3.5 4.5-4.5M20.5 18c-1.4-2-2.9-3.5-4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity=".7"
      />
      <circle cx="24.5" cy="9.5" r="2.2" fill="currentColor" opacity=".8" />
    </svg>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof Leaf;
}) {
  const pathname = usePathname();
  const active = pathname === href;
  const setActiveTab = useUiStore((state) => state.setActiveTab);

  return (
    <Link
      href={href}
      onClick={() => setActiveTab(href.slice(1))}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-10 items-center gap-3 rounded-md border px-3 text-[15px] transition-colors duration-150",
        active
          ? "border-rule bg-sheet font-semibold text-foreground"
          : "border-transparent font-medium text-rail-foreground/85 hover:bg-background/70 hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px]",
          active ? "text-primary" : "text-rail-foreground/60",
        )}
        strokeWidth={active ? 2.25 : 1.9}
      />
      {label}
    </Link>
  );
}

function MobileMoreMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const moreIsActive = secondaryNav.some((item) => item.href === pathname);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (panelRef.current) {
        containTabFocus(event, panelRef.current);
      }
    };
    document.addEventListener("keydown", handleDialogKeys);
    return () => document.removeEventListener("keydown", handleDialogKeys);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close more menu"
            tabIndex={-1}
            className="absolute inset-0 bg-foreground/30"
            onClick={() => {
              close();
              triggerRef.current?.focus();
            }}
          />
          <div
            id="mobile-more-menu"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-more-title"
            className="sheet dock-enter absolute inset-x-3 bottom-[calc(4.6rem+env(safe-area-inset-bottom))] p-3 shadow-dock"
          >
            <div className="flex items-center justify-between border-b border-rule px-2 pb-2">
              <p id="mobile-more-title" className="text-sm font-semibold">
                More evidence
              </p>
              <button
                type="button"
                aria-label="Close more menu"
                onClick={() => {
                  close();
                  triggerRef.current?.focus();
                }}
                className="grid min-h-11 min-w-11 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav aria-label="More navigation" className="grid gap-1 pt-2">
              {secondaryNav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className="flex min-h-12 items-center gap-3 rounded-md px-3 text-[15px] font-medium hover:bg-muted"
                  >
                    <Icon className="h-5 w-5 text-primary" />
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/this-week#farm-context"
                onClick={close}
                className="flex min-h-12 items-center gap-3 rounded-md px-3 text-[15px] font-medium hover:bg-muted"
              >
                <Settings2 className="h-5 w-5 text-primary" />
                Farm settings
              </Link>
            </nav>
          </div>
        </div>
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls="mobile-more-menu"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold",
          moreIsActive ? "text-primary" : "text-muted-foreground",
        )}
      >
        <Ellipsis className="h-5 w-5" />
        More
      </button>
    </>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-background md:grid md:grid-cols-[232px_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-50 -translate-y-20 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-transform focus:translate-y-0"
      >
        Skip to main content
      </a>
      <aside
        data-print="hide"
        className="paper-grain hidden border-r border-rule bg-rail text-rail-foreground md:sticky md:top-0 md:flex md:h-dvh md:self-start md:flex-col"
      >
        <header className="field mx-3 mt-3 flex items-center gap-3 rounded-lg px-4 py-4">
          <span className="text-field-accent">
            <BrandMark className="h-9 w-9" />
          </span>
          <div>
            <p className="font-editorial text-[1.45rem] font-medium leading-none tracking-[-0.02em] text-field-foreground">
              AgriView
            </p>
            <p className="mt-1 text-xs text-field-muted">Weekly farm brief</p>
          </div>
        </header>

        <div className="flex flex-1 flex-col px-3 pt-5">
          <p className="mb-1.5 px-3 text-[11px] font-semibold text-muted-foreground">
            Farm
          </p>
          <nav aria-label="Primary navigation" className="grid gap-0.5">
            {primaryNav.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>

          <p className="mb-1.5 mt-7 px-3 text-[11px] font-semibold text-muted-foreground">
            Evidence
          </p>
          <nav aria-label="Evidence navigation" className="grid gap-0.5">
            {secondaryNav.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>
        </div>

        <footer className="border-t border-rule p-3">
          <div className="flex items-center justify-between gap-2 px-1">
            <Link
              href="/this-week#farm-context"
              className="flex min-h-11 items-center gap-2 rounded-md px-2 text-[13px] font-medium text-muted-foreground hover:bg-background/70 hover:text-foreground"
            >
              <Settings2 className="h-4 w-4" />
              Farm settings
            </Link>
            <ThemeToggle />
          </div>
        </footer>
      </aside>

      <div className="min-w-0">
        <header
          data-print="hide"
          className="paper-grain sticky top-0 z-30 flex h-14 items-center justify-between border-b border-rule bg-background/92 px-4 backdrop-blur md:hidden"
        >
          <Link href="/this-week" className="flex items-center gap-2">
            <span className="text-primary">
              <BrandMark className="h-7 w-7" />
            </span>
            <span className="font-editorial text-xl font-medium tracking-[-0.02em]">
              AgriView
            </span>
          </Link>
          <ThemeToggle />
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto min-h-dvh w-full max-w-[1180px] px-4 pb-28 pt-6 sm:px-7 md:px-10 md:pb-16 md:pt-9"
        >
          {children}
        </main>
      </div>

      <nav
        aria-label="Mobile navigation"
        data-print="hide"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-rule bg-background/95 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur md:hidden"
      >
        {primaryNav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.9} />
              {item.shortLabel}
            </Link>
          );
        })}
        <MobileMoreMenu />
      </nav>
    </div>
  );
}
