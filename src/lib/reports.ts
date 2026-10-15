import { prisma } from "@/lib/prisma";
import { SESSION_TYPE_LABELS } from "@/lib/validations/session";

/** Période analysée par un rapport. */
export type ReportRange = {
  from: Date;
  to: Date;
  /** Valeur `yyyy-MM-dd` pour les champs de formulaire. */
  fromInput: string;
  toInput: string;
};

export type TherapistActivity = {
  therapistId: number | null;
  name: string;
  sessions: number;
  completed: number;
};

export type MonthlyActivity = {
  key: string;
  label: string;
  sessions: number;
  collected: number;
};

export type MethodBreakdown = {
  method: string;
  label: string;
  count: number;
  amount: number;
};

export type TypeBreakdown = {
  sessionType: string;
  label: string;
  count: number;
};

export type ReportData = {
  range: ReportRange;
  totals: {
    sessions: number;
    completedSessions: number;
    appointments: number;
    newPatients: number;
    invoiced: number;
    collected: number;
    outstanding: number;
    quotesTotal: number;
    acceptedQuotes: number;
  };
  byTherapist: TherapistActivity[];
  byMonth: MonthlyActivity[];
  byMethod: MethodBreakdown[];
  byType: TypeBreakdown[];
};

const MONTH_LABELS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function parseInput(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toInput(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Détermine la période du rapport (mois en cours par défaut). */
export function resolveRange(du?: string, au?: string): ReportRange {
  const now = new Date();
  const from =
    parseInput(du) ?? new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const to = parseInput(au) ?? now;

  const safeFrom = startOfDay(from);
  const safeTo = endOfDay(to);

  return {
    from: safeFrom,
    to: safeTo,
    fromInput: toInput(safeFrom),
    toInput: toInput(safeTo),
  };
}

/**
 * Agrège l'activité du cabinet sur la période : séances, agenda, patients et
 * finances. Toutes les requêtes sont filtrées sur `deletedAt: null`.
 */
export async function loadReport(range: ReportRange): Promise<ReportData> {
  const { from, to } = range;
  const dateFilter = { gte: from, lte: to };
  const paymentMethodLabels: Record<string, string> = {
    cash: "Espèces",
    card: "Carte bancaire",
    cheque: "Chèque",
    transfer: "Virement",
    insurance: "Mutuelle / assurance",
  };

  const [
    sessions,
    appointments,
    newPatients,
    invoiceAggregate,
    paymentAggregate,
    quoteAggregate,
    acceptedQuotes,
    payments,
    therapists,
  ] = await Promise.all([
    prisma.session.findMany({
      where: { deletedAt: null, sessionDate: dateFilter },
      select: {
        id: true,
        therapistId: true,
        status: true,
        sessionType: true,
        sessionDate: true,
      },
    }),
    prisma.appointment.count({
      where: { deletedAt: null, startsAt: dateFilter },
    }),
    prisma.patient.count({
      where: { deletedAt: null, createdAt: dateFilter },
    }),
    prisma.invoice.aggregate({
      where: { deletedAt: null, issueDate: dateFilter },
      _sum: { total: true, remainingAmount: true },
    }),
    prisma.payment.aggregate({
      where: { deletedAt: null, paymentDate: dateFilter },
      _sum: { paidAmount: true },
    }),
    prisma.quote.aggregate({
      where: { deletedAt: null, issueDate: dateFilter },
      _sum: { total: true },
    }),
    prisma.quote.count({
      where: { deletedAt: null, issueDate: dateFilter, status: "accepted" },
    }),
    prisma.payment.findMany({
      where: { deletedAt: null, paymentDate: dateFilter },
      select: { method: true, paidAmount: true, paymentDate: true },
    }),
    prisma.therapist.findMany({
      where: { deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  // --- Activité par thérapeute --------------------------------------------
  const therapistMap = new Map<number, TherapistActivity>();
  for (const therapist of therapists) {
    therapistMap.set(therapist.id, {
      therapistId: therapist.id,
      name: `${therapist.firstName} ${therapist.lastName}`,
      sessions: 0,
      completed: 0,
    });
  }
  let unassigned = 0;
  for (const session of sessions) {
    if (session.therapistId === null) {
      unassigned += 1;
      continue;
    }
    const entry = therapistMap.get(session.therapistId);
    if (!entry) continue;
    entry.sessions += 1;
    if (session.status === "completed") entry.completed += 1;
  }
  const byTherapist = [...therapistMap.values()]
    .filter((entry) => entry.sessions > 0)
    .sort((a, b) => b.sessions - a.sessions);
  if (unassigned > 0) {
    byTherapist.push({
      therapistId: null,
      name: "Non assigné",
      sessions: unassigned,
      completed: 0,
    });
  }

  // --- Répartition mensuelle (séances + encaissements) ---------------------
  const monthMap = new Map<string, MonthlyActivity>();
  let cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const lastMonth = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cursor <= lastMonth) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, {
      key,
      label: `${MONTH_LABELS[cursor.getMonth()]} ${cursor.getFullYear()}`,
      sessions: 0,
      collected: 0,
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  const monthKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  for (const session of sessions) {
    const entry = monthMap.get(monthKey(session.sessionDate));
    if (entry) entry.sessions += 1;
  }

  // --- Répartition par méthode de paiement ---------------------------------
  const methodMap = new Map<string, MethodBreakdown>();
  for (const payment of payments) {
    const key = payment.method;
    const entry = methodMap.get(key) ?? {
      method: key,
      label: paymentMethodLabels[key] ?? key,
      count: 0,
      amount: 0,
    };
    entry.count += 1;
    entry.amount += payment.paidAmount;
    methodMap.set(key, entry);
  }

  // --- Répartition par type de séance --------------------------------------
  const typeMap = new Map<string, number>();
  for (const session of sessions) {
    const key = session.sessionType ?? "unspecified";
    typeMap.set(key, (typeMap.get(key) ?? 0) + 1);
  }
  const byType: TypeBreakdown[] = [...typeMap.entries()]
    .map(([sessionType, count]) => ({
      sessionType,
      label: SESSION_TYPE_LABELS[sessionType] ?? sessionType,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const collected = paymentAggregate._sum.paidAmount ?? 0;

  // Les encaissements mensuels proviennent des mêmes paiements bruts.
  for (const payment of payments) {
    const entry = monthMap.get(monthKey(payment.paymentDate));
    if (entry) entry.collected += payment.paidAmount;
  }

  return {
    range,
    totals: {
      sessions: sessions.length,
      completedSessions: sessions.filter((s) => s.status === "completed").length,
      appointments,
      newPatients,
      invoiced: invoiceAggregate._sum.total ?? 0,
      collected,
      outstanding: invoiceAggregate._sum.remainingAmount ?? 0,
      quotesTotal: quoteAggregate._sum.total ?? 0,
      acceptedQuotes,
    },
    byTherapist,
    byMonth: [...monthMap.values()],
    byMethod: [...methodMap.values()].sort((a, b) => b.amount - a.amount),
    byType,
  };
}
