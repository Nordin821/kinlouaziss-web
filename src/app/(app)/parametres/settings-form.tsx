"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { saveSettings } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

export type SettingsFormValues = {
  clinic_name: string;
  clinic_address: string;
  clinic_city: string;
  clinic_phone: string;
  clinic_email: string;
  clinic_tax_id: string;
  currency_code: string;
  currency_symbol: string;
  invoice_prefix: string;
  invoice_next_number: string;
  invoice_footer_note: string;
  quote_prefix: string;
  quote_next_number: string;
  session_default_duration: string;
  session_default_price: string;
  date_format: string;
  time_format: string;
  auto_backup_enabled: string;
  auto_backup_frequency: string;
  backup_folder: string;
  demo_mode: string;
};

export function SettingsForm({ values }: { values: SettingsFormValues }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      const result = await saveSettings(formData);
      if (result && "error" in result) {
        setError(result.error);
        toast.error(result.error);
      } else {
        toast.success("Paramètres enregistrés.");
        router.refresh();
      }
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold">Identité du cabinet</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Nom du cabinet"
            htmlFor="clinic_name"
            required
            className="sm:col-span-2"
          >
            <Input
              id="clinic_name"
              name="clinic_name"
              defaultValue={values.clinic_name}
              required
            />
          </Field>
          <Field label="Adresse" htmlFor="clinic_address">
            <Input
              id="clinic_address"
              name="clinic_address"
              defaultValue={values.clinic_address}
            />
          </Field>
          <Field label="Ville" htmlFor="clinic_city">
            <Input
              id="clinic_city"
              name="clinic_city"
              defaultValue={values.clinic_city}
            />
          </Field>
          <Field label="Téléphone" htmlFor="clinic_phone">
            <Input
              id="clinic_phone"
              name="clinic_phone"
              defaultValue={values.clinic_phone}
            />
          </Field>
          <Field label="E-mail" htmlFor="clinic_email">
            <Input
              id="clinic_email"
              name="clinic_email"
              type="email"
              defaultValue={values.clinic_email}
            />
          </Field>
          <Field
            label="Identifiant fiscal (ICE)"
            htmlFor="clinic_tax_id"
            className="sm:col-span-2"
          >
            <Input
              id="clinic_tax_id"
              name="clinic_tax_id"
              defaultValue={values.clinic_tax_id}
            />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold">Facturation</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Devise (code)" htmlFor="currency_code">
            <Input
              id="currency_code"
              name="currency_code"
              defaultValue={values.currency_code}
              placeholder="MAD"
            />
          </Field>
          <Field label="Symbole monétaire" htmlFor="currency_symbol">
            <Input
              id="currency_symbol"
              name="currency_symbol"
              defaultValue={values.currency_symbol}
              placeholder="DH"
            />
          </Field>
          <Field label="Préfixe des factures" htmlFor="invoice_prefix">
            <Input
              id="invoice_prefix"
              name="invoice_prefix"
              defaultValue={values.invoice_prefix}
              placeholder="FAC"
            />
          </Field>
          <Field
            label="Prochain n° de facture"
            htmlFor="invoice_next_number"
            hint="Sert de plancher : la numérotation reste unique en base."
          >
            <Input
              id="invoice_next_number"
              name="invoice_next_number"
              type="number"
              min={0}
              defaultValue={values.invoice_next_number}
            />
          </Field>
          <Field label="Préfixe des devis" htmlFor="quote_prefix">
            <Input
              id="quote_prefix"
              name="quote_prefix"
              defaultValue={values.quote_prefix}
              placeholder="DEV"
            />
          </Field>
          <Field
            label="Prochain n° de devis"
            htmlFor="quote_next_number"
            hint="Sert de plancher : la numérotation reste unique en base."
          >
            <Input
              id="quote_next_number"
              name="quote_next_number"
              type="number"
              min={0}
              defaultValue={values.quote_next_number}
            />
          </Field>
          <Field
            label="Pied de page des documents"
            htmlFor="invoice_footer_note"
            className="sm:col-span-2"
          >
            <Textarea
              id="invoice_footer_note"
              name="invoice_footer_note"
              rows={2}
              defaultValue={values.invoice_footer_note}
            />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold">Séances</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Durée par défaut (min)" htmlFor="session_default_duration">
            <Input
              id="session_default_duration"
              name="session_default_duration"
              type="number"
              min={0}
              max={600}
              step={5}
              defaultValue={values.session_default_duration}
            />
          </Field>
          <Field label="Tarif par défaut" htmlFor="session_default_price">
            <Input
              id="session_default_price"
              name="session_default_price"
              type="number"
              min={0}
              step="0.01"
              defaultValue={values.session_default_price}
            />
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-base font-semibold">
          Format des dates et sauvegardes
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Format de date" htmlFor="date_format">
            <NativeSelect
              id="date_format"
              name="date_format"
              defaultValue={values.date_format}
            >
              <option value="dd/MM/yyyy">31/12/2026</option>
              <option value="d MMMM yyyy">31 décembre 2026</option>
              <option value="yyyy-MM-dd">2026-12-31</option>
            </NativeSelect>
          </Field>
          <Field label="Format d'heure" htmlFor="time_format">
            <NativeSelect
              id="time_format"
              name="time_format"
              defaultValue={values.time_format}
            >
              <option value="HH:mm">24 heures (14:30)</option>
              <option value="hh:mm a">12 heures (02:30 PM)</option>
            </NativeSelect>
          </Field>
          <Field
            label="Dossier de sauvegarde"
            htmlFor="backup_folder"
            hint="Chemin indicatif affiché à l'écran Sauvegarde."
          >
            <Input
              id="backup_folder"
              name="backup_folder"
              defaultValue={values.backup_folder}
            />
          </Field>
          <Field label="Fréquence" htmlFor="auto_backup_frequency">
            <NativeSelect
              id="auto_backup_frequency"
              name="auto_backup_frequency"
              defaultValue={values.auto_backup_frequency}
            >
              <option value="daily">Quotidienne</option>
              <option value="weekly">Hebdomadaire</option>
              <option value="monthly">Mensuelle</option>
            </NativeSelect>
          </Field>
        </div>

        <div className="mt-4 space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="auto_backup_enabled"
              defaultChecked={values.auto_backup_enabled === "true"}
              className="size-4 rounded border-input accent-primary transition"
            />
            Activer le rappel de sauvegarde automatique
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="demo_mode"
              defaultChecked={values.demo_mode === "true"}
              className="size-4 rounded border-input accent-primary transition"
            />
            Mode démonstration (données fictives)
          </label>
        </div>
      </Card>

      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <Save />
          {pending ? "Enregistrement…" : "Enregistrer les paramètres"}
        </Button>
      </div>
    </form>
  );
}
