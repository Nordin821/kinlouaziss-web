import Link from "next/link";
import { Activity, Building2, UserCog, Users } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { requirePermission } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { loadSettings } from "@/lib/settings";

import { SettingsForm, type SettingsFormValues } from "./settings-form";
import { TherapistsSection, type TherapistRow } from "./therapists-section";

export const metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  await requirePermission("settings.manage");

  const settings = await loadSettings();
  const values = settings.values;
  const pick = (key: string) => values[key] ?? "";

  const formValues: SettingsFormValues = {
    clinic_name: pick("clinic_name"),
    clinic_address: pick("clinic_address"),
    clinic_city: pick("clinic_city"),
    clinic_phone: pick("clinic_phone"),
    clinic_email: pick("clinic_email"),
    clinic_tax_id: pick("clinic_tax_id"),
    currency_code: pick("currency_code"),
    currency_symbol: pick("currency_symbol"),
    invoice_prefix: pick("invoice_prefix"),
    invoice_next_number: pick("invoice_next_number"),
    invoice_footer_note: pick("invoice_footer_note"),
    quote_prefix: pick("quote_prefix"),
    quote_next_number: pick("quote_next_number"),
    session_default_duration: pick("session_default_duration"),
    session_default_price: pick("session_default_price"),
    date_format: pick("date_format") || "dd/MM/yyyy",
    time_format: pick("time_format") || "HH:mm",
    auto_backup_enabled: pick("auto_backup_enabled") || "false",
    auto_backup_frequency: pick("auto_backup_frequency") || "daily",
    backup_folder: pick("backup_folder"),
    demo_mode: pick("demo_mode") || "false",
  };

  const [therapists, activeUsers, recentLogs] = await Promise.all([
    prisma.therapist.findMany({
      where: { deletedAt: null },
      orderBy: [{ status: "asc" }, { lastName: "asc" }],
    }),
    prisma.appUser.count({ where: { deletedAt: null, isActive: true } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const therapistRows: TherapistRow[] = therapists.map((therapist) => ({
    id: therapist.id,
    firstName: therapist.firstName,
    lastName: therapist.lastName,
    phone: therapist.phone ?? "",
    email: therapist.email ?? "",
    specialty: therapist.specialty ?? "",
    professionalNumber: therapist.professionalNumber ?? "",
    status: therapist.status,
    notes: therapist.notes ?? "",
  }));

  const activeTherapists = therapists.filter(
    (therapist) => therapist.status === "active",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres"
        description="Configuration du cabinet, des documents et de l'équipe soignante."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Cabinet"
          value={settings.clinicName}
          hint={settings.clinicCity || "Ville non renseignée"}
          icon={Building2}
          tone="primary"
        />
        <StatCard
          label="Thérapeutes"
          value={therapists.length}
          hint={`${activeTherapists} actif${activeTherapists > 1 ? "s" : ""}`}
          icon={Users}
          tone="info"
        />
        <StatCard
          label="Comptes actifs"
          value={activeUsers}
          hint="utilisateurs du système"
          icon={UserCog}
          tone="success"
        />
        <StatCard
          label="Devise"
          value={`${settings.currencyCode} (${settings.currencySymbol})`}
          hint="utilisée sur les documents"
          icon={Activity}
          tone="warning"
        />
      </div>

      <SettingsForm values={formValues} />

      <Card className="p-5">
        <TherapistsSection therapists={therapistRows} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
            <Activity className="size-4 text-muted-foreground" />
            Activité récente
          </h2>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune action enregistrée pour le moment.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {recentLogs.map((log) => (
                <li
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-primary">
                      {log.action}
                    </span>
                    {log.details ? (
                      <span className="ml-2 text-muted-foreground">
                        {log.details}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {log.userName ? `${log.userName} · ` : ""}
                    {formatDateTime(log.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="space-y-3 p-5">
          <h2 className="text-base font-semibold">Utilisateurs du système</h2>
          <p className="text-sm text-muted-foreground">
            La création des comptes, les rôles et les permissions se gèrent dans
            le module Utilisateurs.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={ROUTES.users}>
              <UserCog />
              Ouvrir Utilisateurs
            </Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}
