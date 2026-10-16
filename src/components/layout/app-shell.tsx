"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";
import { navMetaForRole } from "@/lib/navigation";
import type { RoleCode } from "@/lib/rbac";
import type { SessionUser } from "@/lib/dal";

/**
 * Gabarit principal : barre latérale repliable + en-tête + contenu.
 *
 * Seul le `role` (une chaîne) franchit la frontière serveur → client : les
 * entrées de menu, qui contiennent des composants d'icônes, sont construites
 * côté client.
 */
export function AppShell({
  user,
  role,
  onLogout,
  children,
}: {
  user: SessionUser;
  role: RoleCode;
  onLogout: () => void;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = navMetaForRole(role);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Barre latérale fixe (bureau) */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-border transition-[width] duration-200 lg:block",
          collapsed ? "w-[72px]" : "w-[248px]",
        )}
      >
        <div className="fixed inset-y-0 left-0 z-40 w-[inherit]">
          <Sidebar
            items={items}
            collapsed={collapsed}
            onToggleCollapse={() => setCollapsed((value) => !value)}
            onLogout={onLogout}
          />
        </div>
      </aside>

      {/* Tiroir mobile */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-[248px] shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 z-10 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Fermer le menu"
            >
              <X className="size-4" />
            </button>
            <Sidebar
              items={items}
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
              onLogout={onLogout}
            />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          user={user}
          pathname={pathname}
          onOpenMobileMenu={() => setMobileOpen(true)}
          onLogout={onLogout}
        />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
