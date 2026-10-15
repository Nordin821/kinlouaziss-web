"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Déclenche l'impression du navigateur (export PDF via « Enregistrer en PDF »). */
export function PrintButton({ label = "Imprimer" }: { label?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="no-print"
      onClick={() => window.print()}
    >
      <Printer />
      {label}
    </Button>
  );
}
