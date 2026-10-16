"use client";

import Link from "next/link";
import { Menu, Search, UserRound } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROUTES } from "@/lib/constants";
import { roleLabel } from "@/lib/rbac";
import { sectionTitle } from "@/lib/navigation";
import type { SessionUser } from "@/lib/dal";

export function Header({
  user,
  pathname,
  onOpenMobileMenu,
  onLogout,
}: {
  user: SessionUser;
  pathname: string;
  onOpenMobileMenu: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur lg:px-6">
      <button
        type="button"
        onClick={onOpenMobileMenu}
        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:hidden"
        aria-label="Ouvrir le menu"
      >
        <Menu className="size-5" />
      </button>

      <h2 className="text-lg font-semibold tracking-tight">
        {sectionTitle(pathname)}
      </h2>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="hidden rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:inline-flex"
          aria-label="Rechercher"
        >
          <Search className="size-5" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 pr-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
            <Avatar name={user.fullName} className="size-8" />
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate text-sm font-semibold leading-tight">
                {user.fullName}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {roleLabel(user.role)}
              </span>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <span className="block">{user.fullName}</span>
              <span className="block text-xs font-normal text-muted-foreground">
                {user.email ?? user.username}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={ROUTES.account}>
                <UserRound />
                Mon compte
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onLogout}>
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
