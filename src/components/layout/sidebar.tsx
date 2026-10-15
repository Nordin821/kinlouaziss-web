"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, LogOut } from "lucide-react";

import { Brand } from "@/components/brand";
import { NavIcon } from "@/components/layout/nav-icon";
import { cn } from "@/lib/utils";
import { isActiveRoute, type NavItemMeta } from "@/lib/navigation";

export function Sidebar({
  items,
  collapsed,
  onToggleCollapse,
  onNavigate,
  onLogout,
}: {
  items: NavItemMeta[];
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div
        className={cn(
          "flex h-16 items-center border-b border-border px-4",
          collapsed && "justify-center px-2",
        )}
      >
        <Brand collapsed={collapsed} />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {items.map((item) => {
          const active = isActiveRoute(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-primary-soft text-primary-soft-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <NavIcon
                name={item.iconName}
                className={cn("size-5 shrink-0", active && "text-primary")}
              />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={onLogout}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-danger-soft hover:text-danger",
            collapsed && "justify-center px-0",
          )}
          title="Se déconnecter"
        >
          <LogOut className="size-5 shrink-0" />
          {!collapsed ? <span>Se déconnecter</span> : null}
        </button>

        {onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              "mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted",
              collapsed && "justify-center px-0",
            )}
          >
            <ChevronLeft
              className={cn("size-4 transition-transform", collapsed && "rotate-180")}
            />
            {!collapsed ? <span>Réduire le menu</span> : null}
          </button>
        ) : null}
      </div>
    </div>
  );
}
