"use client";

import { CloudRain, Leaf, MapPin, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChatSidebar } from "@/components/genui/chat-sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useUiStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/my-land", label: "My Land", key: "my-land", icon: MapPin },
  {
    href: "/markets-income",
    label: "Markets & Income",
    key: "markets-income",
    icon: TrendingUp,
  },
  {
    href: "/weather-water",
    label: "Weather & Water",
    key: "weather-water",
    icon: CloudRain,
  },
  {
    href: "/environment-compliance",
    label: "Environment & Compliance",
    key: "environment-compliance",
    icon: Leaf,
  },
] as const;

const genUiEnabled = process.env.NEXT_PUBLIC_ENABLE_GENUI === "true";

function BrandMark() {
  return (
    <svg viewBox="0 0 28 28" fill="none" className="h-7 w-7" aria-hidden="true">
      <rect width="28" height="28" rx="6" className="fill-sidebar-primary" />
      <path
        d="M7 20 C7 14, 10 10, 14 8 C18 10, 21 14, 21 20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
        className="text-sidebar-primary-foreground"
      />
      <path
        d="M14 8 L14 20"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        className="text-sidebar-primary-foreground"
      />
      <path
        d="M10 15 C11 13, 13 11, 14 11"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        className="text-sidebar-primary-foreground/60"
      />
      <path
        d="M18 15 C17 13, 15 11, 14 11"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        className="text-sidebar-primary-foreground/60"
      />
    </svg>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const setActiveTab = useUiStore((state) => state.setActiveTab);

  return (
    <div
      className={cn(
        "min-h-screen bg-background md:grid",
        genUiEnabled
          ? "md:grid-cols-[18rem_1fr_22rem]"
          : "md:grid-cols-[18rem_1fr]",
      )}
    >
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <h1 className="text-sm font-semibold tracking-tight text-sidebar-primary-foreground">
                AgriView
              </h1>
              <p className="text-xs text-sidebar-foreground/50">
                Farm Intelligence
              </p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/40">
            Dashboard
          </p>
          <nav className="grid gap-1">
            {tabs.map((tab) => {
              const active = pathname === tab.href;
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "border-l-2 border-sidebar-primary bg-sidebar-accent text-sidebar-primary-foreground"
                      : "border-l-2 border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-primary-foreground",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active
                        ? "text-sidebar-primary"
                        : "text-sidebar-foreground/50 group-hover:text-sidebar-primary",
                    )}
                  />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </SidebarContent>
        <SidebarFooter>
          <ThemeToggle />
          <p className="mt-2 text-center text-[10px] text-sidebar-foreground/30">
            v0.1.0
          </p>
        </SidebarFooter>
      </Sidebar>
      <main className="overflow-y-auto p-4 md:h-screen md:p-6">{children}</main>
      {genUiEnabled ? (
        <div className="hidden md:block">
          <ChatSidebar />
        </div>
      ) : null}
    </div>
  );
}
