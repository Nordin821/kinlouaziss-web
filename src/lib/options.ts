import { prisma } from "@/lib/prisma";

/** Option de sélection d'un patient (formulaires agenda, séances, finance). */
export type PatientOption = {
  id: number;
  fileNumber: string;
  name: string;
};

/** Option de sélection d'un thérapeute. */
export type TherapistOption = {
  id: number;
  name: string;
};

/** Patients actifs, triés par nom — prêts pour un `<select>`. */
export async function loadPatientOptions(): Promise<PatientOption[]> {
  const patients = await prisma.patient.findMany({
    where: { deletedAt: null },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, fileNumber: true, firstName: true, lastName: true },
  });

  return patients.map((patient) => ({
    id: patient.id,
    fileNumber: patient.fileNumber,
    name: `${patient.lastName.toUpperCase()} ${patient.firstName}`,
  }));
}

/** Thérapeutes actifs, triés par nom. */
export async function loadTherapistOptions(): Promise<TherapistOption[]> {
  const therapists = await prisma.therapist.findMany({
    where: { deletedAt: null, status: "active" },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
  });

  return therapists.map((therapist) => ({
    id: therapist.id,
    name: `${therapist.firstName} ${therapist.lastName}`,
  }));
}

/** Option de sélection d'une facture (encaissements, rattachements). */
export type InvoiceOption = {
  id: number;
  patientId: number;
  number: string;
  remaining: number;
  label: string;
};

/** Factures non soldées, les plus récentes d'abord. */
export async function loadInvoiceOptions(): Promise<InvoiceOption[]> {
  const invoices = await prisma.invoice.findMany({
    where: { deletedAt: null, status: { in: ["unpaid", "partial"] } },
    orderBy: [{ issueDate: "desc" }, { id: "desc" }],
    take: 200,
    select: {
      id: true,
      patientId: true,
      invoiceNumber: true,
      total: true,
      remainingAmount: true,
      patient: { select: { firstName: true, lastName: true } },
    },
  });

  return invoices.map((invoice) => {
    const patient = `${invoice.patient.lastName.toUpperCase()} ${invoice.patient.firstName}`;
    return {
      id: invoice.id,
      patientId: invoice.patientId,
      number: invoice.invoiceNumber,
      remaining: invoice.remainingAmount,
      label: `${invoice.invoiceNumber} — ${patient} — reste ${invoice.remainingAmount.toFixed(2)} (sur ${invoice.total.toFixed(2)})`,
    };
  });
}

/** Option de sélection d'une séance (rattachement d'un paiement). */
export type SessionOption = {
  id: number;
  patientId: number;
  label: string;
};

/** Séances récentes (90 jours), les plus récentes d'abord. */
export async function loadSessionOptions(): Promise<SessionOption[]> {
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const sessions = await prisma.session.findMany({
    where: { deletedAt: null, sessionDate: { gte: since } },
    orderBy: [{ sessionDate: "desc" }, { id: "desc" }],
    take: 200,
    select: {
      id: true,
      patientId: true,
      sessionDate: true,
      startTime: true,
      patient: { select: { firstName: true, lastName: true } },
    },
  });

  return sessions.map((session) => {
    const patient = `${session.patient.lastName.toUpperCase()} ${session.patient.firstName}`;
    const date = session.sessionDate.toLocaleDateString("fr-FR");
    return {
      id: session.id,
      patientId: session.patientId,
      label: `${patient} — ${date}${session.startTime ? ` ${session.startTime}` : ""}`,
    };
  });
}
