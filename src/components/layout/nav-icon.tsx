import {
  BarChart3,
  CalendarDays,
  DatabaseBackup,
  Dumbbell,
  FileText,
  FolderHeart,
  LayoutDashboard,
  ReceiptText,
  Settings,
  Stethoscope,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Correspondance nom → composant d'icône.
 *
 * Les entrées de menu traversent la frontière serveur → client sous forme de
 * chaînes (`iconName`) : les composants eux-mêmes ne sont pas sérialisables.
 */
const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  FolderHeart,
  CalendarDays,
  Stethoscope,
  Dumbbell,
  Wallet,
  ReceiptText,
  FileText,
  BarChart3,
  UserCog,
  Settings,
  DatabaseBackup,
};

export function NavIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] ?? LayoutDashboard;
  return <Icon className={className} />;
}
