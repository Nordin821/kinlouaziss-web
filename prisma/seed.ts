/**
 * Données de référence de l'application.
 *
 * Crée les rôles, les permissions, les paramètres du cabinet et le compte
 * administrateur. Exécution : `npm run db:seed` (ajouter `-- --demo` pour
 * injecter un jeu de démonstration).
 */

import { existsSync, readFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

import {
  PERMISSIONS,
  ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  type RoleCode,
} from "../src/lib/rbac";

/** Charge les variables depuis .env.local puis .env (sans dépendance). */
function loadEnv(): void {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = /^\s*([\w.]+)\s*=\s*(.*)\s*$/.exec(line);
      if (!match) continue;
      const key = match[1];
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
}

const DEFAULT_SETTINGS: Record<string, string> = {
  clinic_name: "Cabinet KinLouaziss",
  clinic_address: "",
  clinic_city: "",
  clinic_phone: "",
  clinic_email: "",
  clinic_logo_path: "",
  clinic_tax_id: "",
  currency_code: "MAD",
  currency_symbol: "DH",
  invoice_prefix: "FAC",
  invoice_next_number: "1",
  invoice_footer_note: "",
  quote_prefix: "DEV",
  session_default_duration: "45",
  session_default_price: "250",
  date_format: "dd/MM/yyyy",
  time_format: "HH:mm",
  auto_backup_enabled: "false",
  auto_backup_frequency: "daily",
  backup_folder: "",
  demo_mode: "false",
  first_run_completed: "false",
};

async function seedReferenceData(prisma: PrismaClient): Promise<void> {
  for (const code of Object.values(ROLES)) {
    await prisma.role.upsert({
      where: { code },
      update: {
        label: ROLE_LABELS[code],
        description: ROLE_DESCRIPTIONS[code],
      },
      create: {
        code,
        label: ROLE_LABELS[code],
        description: ROLE_DESCRIPTIONS[code],
      },
    });
  }
  console.log(`✔ ${Object.values(ROLES).length} rôles`);

  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { label: permission.label, category: permission.category },
      create: permission,
    });
  }
  console.log(`✔ ${PERMISSIONS.length} permissions`);

  await prisma.rolePermission.deleteMany({});
  for (const [role, codes] of Object.entries(ROLE_PERMISSIONS)) {
    for (const permissionCode of codes) {
      await prisma.rolePermission.create({
        data: { roleCode: role, permissionCode },
      });
    }
  }
  console.log("✔ permissions par rôle");

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.clinicSetting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }
  console.log(`✔ ${Object.keys(DEFAULT_SETTINGS).length} paramètres`);
}

async function seedAdmin(prisma: PrismaClient): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@kinlouaziss.ma";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "KinLouaziss2026!";
  const fullName = process.env.SEED_ADMIN_NAME ?? "Administrateur";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const role: RoleCode = "admin";

  if (!supabaseUrl || !serviceRole) {
    console.warn(
      "⚠ SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL manquant : " +
        "le compte administrateur n'a pas été créé.",
    );
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existing } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  let userId = existing?.users.find((user) => user.email === email)?.id;

  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !data.user) {
      throw new Error(`Création du compte échouée : ${error?.message}`);
    }
    userId = data.user.id;
  } else {
    await supabase.auth.admin.updateUserById(userId, { password });
  }

  await prisma.appUser.upsert({
    where: { id: userId },
    update: { roleCode: role, fullName, email, isActive: true, deletedAt: null },
    create: {
      id: userId,
      username: email.split("@")[0],
      fullName,
      email,
      roleCode: role,
      isActive: true,
    },
  });

  console.log(`✔ compte administrateur : ${email} / ${password}`);
}

async function seedDemo(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.patient.count();
  if (existing > 0) {
    console.log("↷ jeu de démonstration ignoré (des patients existent déjà)");
    return;
  }

  const therapists = [
    { firstName: "Youssef", lastName: "El Amrani", specialty: "Rééducation" },
    { firstName: "Salma", lastName: "Benali", specialty: "Kinésithérapie du sport" },
  ];
  for (const therapist of therapists) {
    await prisma.therapist.create({ data: therapist });
  }

  const demoPatients = [
    {
      firstName: "Karim",
      lastName: "Alaoui",
      gender: "male",
      phone: "0661223344",
      city: "Casablanca",
    },
    {
      firstName: "Nadia",
      lastName: "Chraibi",
      gender: "female",
      phone: "0662556677",
      city: "Rabat",
    },
    {
      firstName: "Omar",
      lastName: "Tazi",
      gender: "male",
      phone: "0663889900",
      city: "Marrakech",
    },
  ];

  let sequence = 0;
  for (const patient of demoPatients) {
    sequence += 1;
    await prisma.patient.create({
      data: {
        ...patient,
        fileNumber: `P-${String(sequence).padStart(5, "0")}`,
        medicalRecord: { create: {} },
        medicalHistory: { create: {} },
      },
    });
  }

  console.log(`✔ jeu de démonstration : ${demoPatients.length} patients`);
}

async function main(): Promise<void> {
  loadEnv();
  const prisma = new PrismaClient();
  const withDemo = process.argv.includes("--demo");

  try {
    await seedReferenceData(prisma);
    await seedAdmin(prisma);
    if (withDemo) await seedDemo(prisma);
    console.log("\nSeed terminé.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
