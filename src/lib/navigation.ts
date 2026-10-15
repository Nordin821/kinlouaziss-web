import { ROUTES } from "@/lib/constants";
import { ROLE_PERMISSIONS, type RoleCode } from "@/lib/rbac";

export type NavItemMeta = {
  href: string;
  label: string;
  iconName: string;
  permission?: string;
};

/** Entrées du menu principal (métadonnées sérialisables). */
export const NAV_ITEMS_META: NavItemMeta[] = [
  { href: ROUTES.dashboard, label: "Tableau de bord", iconName: "LayoutDashboard" },
  { href: ROUTES.patients, label: "Patients", iconName: "Users", permission: "patients.view" },
  { href: ROUTES.medicalRecords, label: "Dossiers médicaux", iconName: "FolderHeart", permission: "records.view" },
  { href: ROUTES.appointments, label: "Rendez-vous", iconName: "CalendarDays", permission: "appointments.view" },
  { href: ROUTES.sessions, label: "Séances", iconName: "Stethoscope", permission: "sessions.view" },
  { href: ROUTES.exercises, label: "Exercices", iconName: "Dumbbell", permission: "exercises.view" },
  { href: ROUTES.payments, label: "Paiements", iconName: "Wallet", permission: "payments.view" },
  { href: ROUTES.invoices, label: "Factures", iconName: "ReceiptText", permission: "invoices.view" },
  { href: ROUTES.quotes, label: "Devis", iconName: "FileText", permission: "quotes.view" },
  { href: ROUTES.reports, label: "Rapports", iconName: "BarChart3", permission: "reports.view" },
  { href: ROUTES.users, label: "Utilisateurs", iconName: "UserCog", permission: "users.view" },
  { href: ROUTES.settings, label: "Paramètres", iconName: "Settings", permission: "settings.manage" },
  { href: ROUTES.backup, label: "Sauvegarde", iconName: "DatabaseBackup", permission: "backup.manage" },
];

/** Entrées visibles pour un rôle donné. */
export function navMetaForRole(role: RoleCode): NavItemMeta[] {
  const granted = ROLE_PERMISSIONS[role] ?? [];
  return NAV_ITEMS_META.filter((item) => !item.permission || granted.includes(item.permission));
}

/** Indique si une entrée doit apparaître « active » pour un chemin donné. */
export function isActiveRoute(href: string, pathname: string): boolean {
  if (href === ROUTES.dashboard) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Titre de la section correspondant à un chemin. */
export function sectionTitle(pathname: string): string {
  const match = NAV_ITEMS_META.find((item) => isActiveRoute(item.href, pathname));
  return match?.label ?? "KinLouaziss";
}