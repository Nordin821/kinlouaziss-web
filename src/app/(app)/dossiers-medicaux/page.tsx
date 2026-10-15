import Link from "next/link";
import { ChevronRight, FolderHeart, Search } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROUTES } from "@/lib/constants";
import { requirePermission } from "@/lib/dal";
import { calculateAge, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dossiers médicaux" };

export default async function MedicalRecordsPage({
  searchParams,
}: PageProps<"/dossiers-medicaux">) {
  await requirePermission("records.view");

  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";

  const patients = await prisma.patient.findMany({
    where: {
      deletedAt: null,
      ...(query
        ? {
            OR: [
              { firstName: { contains: query, mode: "insensitive" as const } },
              { lastName: { contains: query, mode: "insensitive" as const } },
              { fileNumber: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 100,
    select: {
      id: true,
      fileNumber: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      phone: true,
      medicalRecord: { select: { diagnosis: true, chiefComplaint: true } },
      _count: { select: { assessments: true, treatmentPlans: true } },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dossiers médicaux"
        description="Ouvrez le dossier clinique d'un patient : motif, diagnostic, antécédents, bilans et plans de traitement."
      />

      <Card className="p-4">
        <form method="get" className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Rechercher un patient par nom ou numéro de dossier…"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline">
            Rechercher
          </Button>
        </form>
      </Card>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Dossier</TableHead>
              <TableHead>Diagnostic</TableHead>
              <TableHead>Bilans</TableHead>
              <TableHead>Plans</TableHead>
              <TableHead className="w-12 text-right">Ouvrir</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.length === 0 ? (
              <TableEmpty colSpan={6}>
                <EmptyState
                  icon={FolderHeart}
                  title="Aucun patient"
                  description="Créez d'abord un patient pour ouvrir son dossier médical."
                />
              </TableEmpty>
            ) : (
              patients.map((patient) => {
                const age = calculateAge(patient.birthDate);
                const diagnosis = patient.medicalRecord?.diagnosis;
                return (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={`${patient.firstName} ${patient.lastName}`}
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {patient.lastName.toUpperCase()} {patient.firstName}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {age !== null ? `${age} ans` : "Âge non renseigné"}
                            {patient.phone ? ` · ${patient.phone}` : ""}
                          </span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {patient.fileNumber}
                      <span className="mt-1 block font-sans">
                        {formatDate(patient.birthDate)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-xs text-sm text-muted-foreground">
                      <span className="line-clamp-2">
                        {diagnosis ?? patient.medicalRecord?.chiefComplaint ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          badgeVariants({
                            variant:
                              patient._count.assessments > 0
                                ? "info"
                                : "neutral",
                          }),
                        )}
                      >
                        {patient._count.assessments}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          badgeVariants({
                            variant:
                              patient._count.treatmentPlans > 0
                                ? "primary"
                                : "neutral",
                          }),
                        )}
                      >
                        {patient._count.treatmentPlans}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="icon">
                        <Link
                          href={`${ROUTES.medicalRecords}/${patient.id}`}
                          aria-label="Ouvrir le dossier"
                        >
                          <ChevronRight />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {patients.length >= 100 ? (
        <p className="text-sm text-muted-foreground">
          Seuls les 100 premiers patients sont affichés. Affinez la recherche
          pour trouver un patient précis.
        </p>
      ) : null}
    </div>
  );
}
