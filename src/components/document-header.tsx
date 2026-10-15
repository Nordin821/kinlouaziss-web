import type { ClinicSettings } from "@/lib/settings";

/** En-tête imprimable d'un document (compte rendu, facture, devis). */
export function DocumentHeader({
  settings,
  title,
  subtitle,
}: {
  settings: ClinicSettings;
  title: string;
  subtitle?: string;
}) {
  const locality = [settings.clinicAddress, settings.clinicCity]
    .filter(Boolean)
    .join(", ");
  const contact = [settings.clinicPhone, settings.clinicEmail]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
      <div className="space-y-0.5">
        <p className="text-lg font-semibold text-primary">
          {settings.clinicName}
        </p>
        {locality ? (
          <p className="text-xs text-muted-foreground">{locality}</p>
        ) : null}
        {contact ? (
          <p className="text-xs text-muted-foreground">{contact}</p>
        ) : null}
        {settings.clinicTaxId ? (
          <p className="text-xs text-muted-foreground">
            ICE : {settings.clinicTaxId}
          </p>
        ) : null}
      </div>
      <div className="text-right">
        <p className="text-base font-semibold uppercase tracking-wide">
          {title}
        </p>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
