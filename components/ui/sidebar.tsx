"use client";

import type { PropsWithChildren } from "react";

import { cn } from "@/lib/utils";

export function Sidebar({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <aside
      className={cn(
        "flex w-full flex-col border-b border-sidebar-border bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:h-screen md:w-72 md:border-r md:border-b-0",
        className,
      )}
    >
      {children}
    </aside>
  );
}

export function SidebarHeader({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn("border-b border-sidebar-border p-4", className)}>
      {children}
    </div>
  );
}

export function SidebarContent({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("flex-1 p-3", className)}>{children}</div>;
}

export function SidebarFooter({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn("border-t border-sidebar-border p-3", className)}>
      {children}
    </div>
  );
}
