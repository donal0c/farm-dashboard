"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChatSidebar } from "@/components/genui/chat-sidebar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useUiStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/my-land", label: "My Land", key: "my-land" },
  { href: "/markets-income", label: "Markets & Income", key: "markets-income" },
  { href: "/weather-water", label: "Weather & Water", key: "weather-water" },
  {
    href: "/environment-compliance",
    label: "Environment & Compliance",
    key: "environment-compliance",
  },
] as const;

const genUiEnabled = process.env.NEXT_PUBLIC_ENABLE_GENUI === "true";

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
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Farm Dashboard
          </p>
          <h1 className="text-lg font-semibold">Agricultural Intelligence</h1>
        </SidebarHeader>
        <SidebarContent>
          <nav className="grid gap-2">
            {tabs.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <Button
                    variant={active ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      !active && "text-muted-foreground",
                    )}
                  >
                    {tab.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </SidebarContent>
        <SidebarFooter>
          <ThemeToggle />
        </SidebarFooter>
      </Sidebar>
      <main className="p-4 md:p-6">{children}</main>
      {genUiEnabled ? (
        <div className="hidden md:block">
          <ChatSidebar />
        </div>
      ) : null}
    </div>
  );
}
