"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { computeTotals, type LineItemInput } from "@/lib/documents";
import { formatCurrency } from "@/lib/format";
import type { PatientOption } from "@/lib/options";

type ActionState = { ok: true } | { error: string } | undefined;

export type DocumentKind = "invoice" | "quote";

export type DocumentFormValues = {
  id: number;
  patientId: number;
  issueDate: string;
  /** Échéance (facture) ou date de validité (devis). */
  secondDate: string;
  discount: number;
  vatRate: number;
  notes: string;
  items: LineItemInput[];
  /** Statut modifiable : devis uniquement. */
  status?: string;
};

const TEXT = {
  invoice: {
    titleNew: "Nouvelle facture",
    titleEdit: "Modifier la facture",
    description:
      "Ajoutez les prestations réalisées : le total est calculé automatiquement avec la remise et la TVA.",
    secondDateLabel: "Échéance",
    submitNew: "Créer la facture",
    created: "Facture créée.",
    updated: "Facture mise à jour.",
  },
  quote: {
    titleNew: "Nouveau devis",
    titleEdit: "Modifier le devis",
    description:
      "Chiffrez une prise en charge : le total est calculé automatiquement avec la remise et la TVA.",
    secondDateLabel: "Valable jusqu'au",
    submitNew: "Créer le devis",
    created: "Devis créé.",
    updated: "Devis mis à jour.",
  },
} as const;

/**
 * Génère des clés React stables pour les lignes du tableau.
 *
 * React exige des clés stables pour les éléments de liste. Ce compteur vit en
 * module : il est incrémenté dans les gestionnaires d'événements (ajout de
 * ligne) lors de l'initialisation du formuleur, sans lecture de `ref.current`
 * pendant le rendu, ce que le lint React interdit.
 */
let rowKeySeed = 0;
function nextRowKey(): number {
  rowKeySeed += 1;
  return rowKeySeed;
}

/**
 * Formulaire partagé des documents facturés (facture et devis).
 *
 * Le numéro du document est attribué côté serveur ; l'action serveur est
 * fournie déjà liée à l'identifiant en modification.
 */
export function DocumentFormDialog({
  kind,
  patients,
  document: documentData,
  secondDateName,
  statusOptions,
  defaultDate,
  defaultUnitPrice,
  action,
  trigger,
}: {
  kind: DocumentKind;
  patients: PatientOption[];
  document?: DocumentFormValues;
  secondDateName: "dueDate" | "validUntil";
  statusOptions?: { value: string; label: string }[];
  defaultDate?: string;
  defaultUnitPrice?: string;
  action: (formData: FormData) => Promise<ActionState>;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const text = TEXT[kind];
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fallbackPrice = Number(defaultUnitPrice) || 0;
  const [rows, setRows] = useState<{ key: number; value: LineItemInput }[]>(
    () =>
      documentData && documentData.items.length > 0
        ? documentData.items.map((item) => ({
            key: nextRowKey(),
            value: item,
          }))
        : [
            {
              key: nextRowKey(),
              value: { description: "", quantity: 1, unitPrice: fallbackPrice },
            },
          ],
  );
  const [discount, setDiscount] = useState(documentData?.discount ?? 0);
  const [vatRate, setVatRate] = useState(documentData?.vatRate ?? 0);

  const isEdit = Boolean(documentData?.id);
  const totals = computeTotals(
    rows.map((row) => row.value),
    discount,
    vatRate,
  );

  function updateRow(key: number, patch: Partial<LineItemInput>) {
    setRows((prev) =>
      prev.map((row) =>
        row.key === key ? { ...row, value: { ...row.value, ...patch } } : row,
      ),
    );
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    setPending(true);
    try {
      const result = await action(formData);
      if (result && "error" in result) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setOpen(false);
        toast.success(isEdit ? text.updated : text.created);
        router.refresh();
      }
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? text.titleEdit : text.titleNew}</DialogTitle>
          <DialogDescription>{text.description}</DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Patient"
              htmlFor="patientId"
              required
              className="sm:col-span-2"
            >
              <NativeSelect
                id="patientId"
                name="patientId"
                defaultValue={documentData ? String(documentData.patientId) : ""}
                required
              >
                <option value="">— Sélectionner un patient —</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} ({patient.fileNumber})
                  </option>
                ))}
              </NativeSelect>
            </Field>

            <Field label="Date d'émission" htmlFor="issueDate" required>
              <Input
                id="issueDate"
                name="issueDate"
                type="date"
                defaultValue={documentData?.issueDate ?? defaultDate ?? ""}
                required
              />
            </Field>

            <Field label={text.secondDateLabel} htmlFor={secondDateName}>
              <Input
                id={secondDateName}
                name={secondDateName}
                type="date"
                defaultValue={documentData?.secondDate ?? ""}
              />
            </Field>

            {statusOptions ? (
              <Field label="Statut" htmlFor="status" className="sm:col-span-2">
                <NativeSelect
                  id="status"
                  name="status"
                  defaultValue={documentData?.status ?? statusOptions[0]?.value}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-border pb-1.5">
              <h3 className="text-sm font-semibold">Prestations</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setRows((prev) => [
                    ...prev,
                    {
                      key: nextRowKey(),
                      value: {
                        description: "",
                        quantity: 1,
                        unitPrice: fallbackPrice,
                      },
                    },
                  ])
                }
              >
                <Plus />
                Ajouter une ligne
              </Button>
            </div>

            <div className="space-y-2">
              {rows.map((row) => (
                <div
                  key={row.key}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-end"
                >
                  <Field label="Description" className="flex-1">
                    <Input
                      name="itemDescription"
                      value={row.value.description}
                      placeholder="Séance de rééducation…"
                      onChange={(event) =>
                        updateRow(row.key, { description: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Qté" className="sm:w-24">
                    <Input
                      name="itemQuantity"
                      type="number"
                      min={0}
                      step="0.5"
                      value={row.value.quantity}
                      onChange={(event) =>
                        updateRow(row.key, {
                          quantity: Number(event.target.value),
                        })
                      }
                    />
                  </Field>
                  <Field label="Prix unitaire" className="sm:w-32">
                    <Input
                      name="itemUnitPrice"
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.value.unitPrice}
                      onChange={(event) =>
                        updateRow(row.key, {
                          unitPrice: Number(event.target.value),
                        })
                      }
                    />
                  </Field>
                  <div className="flex items-center gap-2">
                    <span className="w-24 pb-2.5 text-right text-sm tabular-nums text-muted-foreground">
                      {formatCurrency(row.value.quantity * row.value.unitPrice)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Retirer la ligne"
                      className="text-danger"
                      onClick={() =>
                        setRows((prev) =>
                          prev.filter((item) => item.key !== row.key),
                        )
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-4">
              <Field label="Remise (montant)" htmlFor="discount">
                <Input
                  id="discount"
                  name="discount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={discount}
                  onChange={(event) => setDiscount(Number(event.target.value))}
                />
              </Field>
              <Field label="TVA (%)" htmlFor="vatRate">
                <Input
                  id="vatRate"
                  name="vatRate"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={vatRate}
                  onChange={(event) => setVatRate(Number(event.target.value))}
                />
              </Field>
            </div>

            <dl className="space-y-1 rounded-lg bg-muted/60 p-4 text-sm">
              <Row label="Sous-total" value={formatCurrency(totals.subtotal)} />
              <Row label="Remise" value={`− ${formatCurrency(totals.discount)}`} />
              <Row label="TVA" value={formatCurrency(totals.vatAmount)} />
              <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatCurrency(totals.total)}</dd>
              </div>
            </dl>
          </div>

          <Field label="Notes" htmlFor="notes">
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={documentData?.notes ?? ""}
            />
          </Field>

          {error ? (
            <p
              role="alert"
              className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger"
            >
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Enregistrement…"
                : isEdit
                  ? "Enregistrer"
                  : text.submitNew}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
