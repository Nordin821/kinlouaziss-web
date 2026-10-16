import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/rbac";

import { PasswordForm, ProfileForm } from "./account-forms";

export const metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const user = await requireUser();

  const profile = await prisma.appUser.findUnique({
    where: { id: user.id },
    select: { fullName: true, phone: true, email: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mon compte"
        description="Vos informations personnelles et votre mot de passe."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profil</CardTitle>
            <CardDescription>
              Nom et coordonnées utilisés dans l&apos;application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              fullName={profile?.fullName ?? user.fullName}
              phone={profile?.phone ?? ""}
              email={profile?.email ?? user.email ?? "—"}
              roleLabel={roleLabel(user.role)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mot de passe</CardTitle>
            <CardDescription>
              Votre mot de passe actuel est exigé. Votre session en cours est
              conservée, mais vos autres appareils seront déconnectés.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
