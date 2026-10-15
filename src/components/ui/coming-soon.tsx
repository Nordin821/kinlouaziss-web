import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

/** Écran affiché pour les modules en cours de portage vers le web. */
export function ComingSoon({
  title,
  description,
  icon: Icon = Construction,
  features = [],
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  features?: string[];
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Icon className="size-7" />
          </span>
          <div className="space-y-1">
            <p className="text-base font-semibold">Module en préparation</p>
            <p className="mx-auto max-w-lg text-sm text-muted-foreground">
              Ce module sera porté depuis l&apos;application desktop dans une
              prochaine étape. La base de données et les règles d&apos;accès sont
              déjà en place.
            </p>
          </div>
          {features.length > 0 ? (
            <ul className="mt-2 grid gap-1 text-left text-sm text-muted-foreground">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
