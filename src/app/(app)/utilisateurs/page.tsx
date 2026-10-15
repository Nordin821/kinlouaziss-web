import { AlertTriangle, Search, SlidersHorizontal, Stethoscope, UserCheck, UserCog } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { requirePermission } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, ROLES, ROLE_LABELS, ROLE_PERMISSIONS, type RoleCode } from "@/lib/rbac";
import { isServiceRoleConfigured } from "@/lib/supabase/admin";

import { NewUserButton, UsersTable, type UserRow } from "./users-table";

export const metadata = { title: "Utilisateurs" };

const roleCodes: RoleCode[] = [ROLES.admin, ROLES.therapist, ROLES.receptionist];

export default async function UsersPage({
  searchParams,
}: PageProps<"/utilisateurs">) {
  const session = await requirePermission("users.view");

  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";

  const where = {
    deletedAt: null,
    ...(query
      ? {
          OR: [
            { fullName: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
            { username: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, activeCount, users, roleGroup] = await Promise.all([
    prisma.appUser.count({ where: { deletedAt: null } }),
    prisma.appUser.count({ where: { deletedAt: null, isActive: true } }),
    prisma.appUser.findMany({
      where,
      orderBy: [{ fullName: "asc" }],
    }),
    prisma.appUser.groupBy({
      by: ["roleCode"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  const rows: UserRow[] = users.map((user) => ({
    id: user.id,
    fullName: user.fullName,
    email: user.email ?? user.username,
    phone: user.phone,
    roleCode: user.roleCode,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
  }));

  const roleCounts = roleCodes.map((code) => ({
    code,
    count: roleGroup.find((group) => group.roleCode === code)?._count._all ?? 0,
  }));

  const serviceRoleConfigured = isServiceRoleConfigured();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs"
        description="Comptes, rôles et permissions des membres du cabinet."
        actions={<NewUserButton />}
      />

      {!serviceRoleConfigured ? (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-soft p-4 text-warning">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">
              Création des comptes indisponible
            </p>
            <p className="mt-0.5 text-warning-foreground/80">
              La variable d&apos;environnement serveur
              <code className="mx-1 rounded bg-background/60 px-1 py-0.5">
                SUPABASE_SERVICE_ROLE_KEY
              </code>
              n&apos;est pas configurée. Ajoutez-la dans Vercel pour pouvoir
              créer et gérer les comptes.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Comptes"
          value={total}
          hint={`${activeCount} actif${activeCount > 1 ? "s" : ""}`}
          icon={UserCheck}
          tone="success"
        />
        {roleCounts.map((role) => (
          <StatCard
            key={role.code}
            label={ROLE_LABELS[role.code]}
            value={role.count}
            hint={
              role.code === ROLES.therapist
                ? "Accès clinique"
                : role.code === ROLES.receptionist
                  ? "Accueil et facturation"
                  : "Administration"
            }
            icon={role.code === ROLES.therapist ? Stethoscope : UserCog}
            tone={role.code === ROLES.admin ? "info" : "primary"}
          />
        ))}
      </div>

      <Card className="p-4">
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Rechercher un nom, une adresse e-mail, un identifiant…"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline">
            <SlidersHorizontal />
            Filtrer
          </Button>
        </form>
      </Card>

      <UsersTable users={rows} currentUserId={session.id} />

      <Card>
        <CardHeader>
          <CardTitle>Rôles et permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {roleCodes.map((code) => (
            <div key={code} className="rounded-lg border border-border p-4">
              <p className="text-sm font-semibold">{ROLE_LABELS[code]}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {roleCounts.find((role) => role.code === code)?.count ?? 0} compte(s)
              </p>
              <ul className="mt-3 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                {PERMISSIONS.filter((permission) =>
                  ROLE_PERMISSIONS[code].includes(permission.code),
                ).map((permission) => (
                  <li key={permission.code} className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-primary" />
                    {permission.label}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
