import { Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { PATIENT_STATUS_LABELS, PATIENT_STATUSES } from "@/lib/validations/patient";

import { NewPatientButton, PatientsTable, type PatientRow } from "./patients-table";

export const metadata = { title: "Patients" };

const PER_PAGE = 20;

export default async function PatientsPage({
  searchParams,
}: PageProps<"/patients">) {
  await requireUser();

  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.statut === "string" ? params.statut : "";
  const page = Math.max(1, Number(params.page) || 1);

  const where = {
    deletedAt: null,
    ...(status && PATIENT_STATUSES.includes(status as never)
      ? { status }
      : {}),
    ...(query
      ? {
          OR: [
            { firstName: { contains: query, mode: "insensitive" as const } },
            { lastName: { contains: query, mode: "insensitive" as const } },
            { fileNumber: { contains: query, mode: "insensitive" as const } },
            { phone: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, patients] = await Promise.all([
    prisma.patient.count({ where }),
    prisma.patient.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
  ]);

  const rows: PatientRow[] = patients.map((patient) => ({
    id: patient.id,
    fileNumber: patient.fileNumber,
    firstName: patient.firstName,
    lastName: patient.lastName,
    gender: patient.gender,
    birthDate: patient.birthDate ? patient.birthDate.toISOString() : null,
    phone: patient.phone,
    email: patient.email,
    address: patient.address,
    city: patient.city,
    occupation: patient.occupation,
    referringDoctor: patient.referringDoctor,
    referringDoctorPhone: patient.referringDoctorPhone,
    status: patient.status,
    notes: patient.notes,
    registeredAt: patient.registeredAt.toISOString(),
  }));

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patients"
        description={`${total} patient${total > 1 ? "s" : ""} enregistré${total > 1 ? "s" : ""}`}
        actions={<NewPatientButton />}
      />

      <Card className="p-4">
        <form
          method="get"
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={query}
              placeholder="Rechercher un nom, un dossier, un téléphone…"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select name="statut" defaultValue={status || "all"}>
              <SelectTrigger className="w-40">
                <SlidersHorizontal className="size-4 opacity-60" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {PATIENT_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {PATIENT_STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline">
              Filtrer
            </Button>
          </div>
        </form>
      </Card>

      <PatientsTable patients={rows} />

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} sur {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page <= 1}
              aria-disabled={page <= 1}
            >
              <a href={buildPageHref(page - 1, query, status)}>Précédent</a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              aria-disabled={page >= totalPages}
            >
              <a href={buildPageHref(page + 1, query, status)}>Suivant</a>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildPageHref(
  page: number,
  query: string,
  status: string,
): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status && status !== "all") params.set("statut", status);
  params.set("page", String(Math.max(1, page)));
  return `/patients?${params.toString()}`;
}
