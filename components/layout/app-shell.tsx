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
  SlidersHorizontal,
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
    icon: SlidersHorizontal,
  },
  {
    href: "/methodology",
    label: "Methodology",
    icon: BookOpenText,
  },
] as const;

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="h-8 w-8" aria-hidden="true">
      <path
        d="M5 24.5C7.5 17 11 11.5 16 7.5c5 4 8.5 9.5 11 17"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M16 7.5v17M9.5 20c1.6-2.8 3.7-5 6.5-6.5M22.5 20c-1.6-2.8-3.7-5-6.5-6.5"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        opacity=".65"
      />
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
        "flex min-h-11 items-center gap-3 rounded-md border border-transparent px-3 text-sm font-medium transition-colors",
        active
          ? "border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/72 hover:bg-sidebar-accent/55 hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px]",
          active ? "text-sidebar-primary" : "text-sidebar-foreground/55",
        )}
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
            className="absolute inset-0 bg-foreground/28"
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
            className="absolute inset-x-3 bottom-[calc(4.7rem+env(safe-area-inset-bottom))] rounded-lg border border-border bg-background p-3 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border px-2 pb-2">
              <p
                id="mobile-more-title"
                className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
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
                    className="flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-semibold hover:bg-muted"
                  >
                    <Icon className="h-5 w-5 text-primary" />
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/my-land#farm-settings"
                onClick={close}
                className="flex min-h-12 items-center gap-3 rounded-md px-3 text-sm font-semibold hover:bg-muted"
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
          "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-[10px] font-semibold",
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
    <div className="min-h-dvh bg-background md:grid md:grid-cols-[216px_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-50 -translate-y-20 bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-transform focus:translate-y-0"
      >
        Skip to main content
      </a>
      <aside className="paper-grain hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:flex md:h-dvh md:self-start md:flex-col">
        <header className="flex h-20 items-center gap-3 border-b border-sidebar-border px-5">
          <span className="text-sidebar-primary">
            <BrandMark />
          </span>
          <div>
            <p className="font-editorial text-xl font-medium leading-none text-sidebar-accent-foreground">
              AgriView
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
              Weekly farm brief
            </p>
          </div>
        </header>

        <div className="flex flex-1 flex-col px-3 py-5">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/38">
            Farm
          </p>
          <nav aria-label="Primary navigation" className="grid gap-1">
            {primaryNav.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>

          <p className="mb-2 mt-7 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/38">
            Evidence
          </p>
          <nav aria-label="Evidence navigation" className="grid gap-1">
            {secondaryNav.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </nav>
        </div>

        <footer className="border-t border-sidebar-border p-3">
          <div className="flex items-center justify-between px-2">
            <Link
              href="/my-land#farm-settings"
              className="flex min-h-11 items-center gap-2 text-xs font-medium text-sidebar-foreground/60 hover:text-sidebar-accent-foreground"
            >
              <Settings2 className="h-4 w-4" />
              Farm settings
            </Link>
            <ThemeToggle />
          </div>
        </footer>
      </aside>

      <div className="min-w-0">
        <header className="paper-grain sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
          <Link href="/this-week" className="flex items-center gap-2">
            <span className="text-primary">
              <BrandMark />
            </span>
            <span className="font-editorial text-xl font-medium">AgriView</span>
          </Link>
          <ThemeToggle surface="page" />
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto min-h-dvh w-full max-w-[1120px] px-4 pb-28 pt-7 sm:px-7 md:px-10 md:pb-16 md:pt-10"
        >
          {children}
        </main>
      </div>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-background/96 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur md:hidden"
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
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-[10px] font-semibold",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.shortLabel}
            </Link>
          );
        })}
        <MobileMoreMenu />
      </nav>
    </div>
  );
}
