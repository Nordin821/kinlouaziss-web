# KinLouaziss Web

Version web de l'application de gestion de cabinet de kinésithérapie **KinLouaziss**
( projet desktop `projetKenis`, Flutter ).

Ce dépôt constitue le portage web complet des modules métier de l'application
desktop : authentification, rôles, patients, dossiers médicaux, agenda,
séances, exercices, paiements, factures, devis, paramètres (avec la gestion des
thérapeutes), rapports et sauvegarde.

---

## 1. Stack

| Élément | Choix |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19, Turbopack) |
| Langage | TypeScript |
| Styles | Tailwind CSS 4 |
| Base de données | PostgreSQL (Supabase) |
| ORM | Prisma 6 |
| Authentification | Supabase Auth (`@supabase/ssr`) |
| Composants | Radix UI, lucide-react, class-variance-authority |
| Validation | Zod 4 |
| Toasts | sonner |
| Hébergement | Vercel (offre gratuite) |

> **Pourquoi Prisma 6 et non 7 ?** Prisma 7 impose `prisma.config.ts` et un
> adaptateur de pilote obligatoire, sans bénéfice immédiat pour ce projet.
> La version 6 est stable et utilisée volontairement ici.

---

## 2. Mise en route

### 2.1. Créer le projet Supabase

1. Créez un projet sur [supabase.com](https://supabase.com) (offre gratuite).
2. Ouvrez **Project Settings → API** et notez :
   - `Project URL`
   - `anon public` key
   - `service_role` key
3. Ouvrez **Project Settings → Database** et notez les deux chaînes :
   - **Connection pooling** (port `6543`) → `DATABASE_URL`
   - **Direct connection** (port `5432`) → `DIRECT_URL`

> **Important — format de l'hôte pooler.** Les chaînes de connexion
> contiennent la **région** du projet, par exemple
> `aws-0-eu-west-1.pooler.supabase.com`, et l'identifiant doit être
> `postgres.<project-ref>` (et **non** `postgres`). Sinon PostgreSQL répond
> `no tenant identifier provided` ou `tenant/user ... not found`.
> Copiez les chaînes telles quelles depuis le tableau de bord.

### 2.2. Configurer l'environnement

```bash
cd kinlouaziss-web
copy .env.example .env      # Windows : copy / .env.example .env
```

Puis complétez `.env` avec les valeurs ci-dessus.

### 2.3. Installer et initialiser

```bash
npm install
npm run db:push            # crée les tables dans PostgreSQL
npm run db:seed            # rôles, permissions, paramètres, compte admin
```

Compte administrateur créé par défaut :

```
admin@kinlouaziss.ma / KinLouaziss2026!
```

Changez-le via `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` et `SEED_ADMIN_NAME`
dans `.env` **avant** d'exécuter `npm run db:seed`.

Données de démonstration (facultatif) :

```bash
npm run db:seed -- --demo
```

### 2.4. Lancer l'application

```bash
npm run dev                # http://localhost:3000
```

Si Supabase n'est pas encore configuré, l'application affiche l'écran
`/installation` qui rappelle ces étapes.

### 2.5. Dépannage de la connexion

| Message | Cause | Solution |
| --- | --- | --- |
| `P1001: Can't reach database server` sur `db.<ref>.supabase.co` | L'hôte de connexion directe n'existe pas pour ce projet | Utilisez l'hôte régional du pooler (`aws-0-<région>.pooler.supabase.com`) |
| `FATAL: (ENOIDENTIFIER) no tenant identifier provided` | Utilisateur `postgres` sans référence de projet | Utilisez `postgres.<project-ref>` |
| `FATAL: (ENOTFOUND) tenant/user ... not found` | Mauvaise région | Vérifiez la région dans **Project Settings → General** |

---

## 3. Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Lance le build de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification des types |
| `npm run db:push` | Synchronise le schéma Prisma avec la base |
| `npm run db:migrate` | Crée une migration Prisma |
| `npm run db:seed` | Données de référence (+ `--demo`) |
| `npm run db:studio` | Éditeur visuel de la base |
| `npm run db:generate` | Régénère le client Prisma |

---

## 4. Rôles et permissions

Trois rôles, identiques à l'application desktop :

| Rôle | Code | Périmètre |
| --- | --- | --- |
| Administrateur | `admin` | Accès complet, y compris utilisateurs, paramètres, sauvegardes |
| Thérapeute | `therapist` | Clinique : patients, dossiers, séances, exercices |
| Réceptionniste | `receptionist` | Accueil : agenda, facturation, encaissement |

Les permissions sont stockées dans `roles` / `permissions` / `role_permissions`
et appliquées :

1. **Au niveau du menu** — `navMetaForRole()` filtre la barre latérale
   (seuls des métadonnées sérialisables traversent la frontière
   serveur → client ; les icônes sont résolues côté client) ;
2. **Au niveau de l'authentification** — `requireUser()` dans `src/lib/dal.ts`,
   appelé par chaque page et chaque Server Action ;
3. **Au niveau des permissions** — `requirePermission()` protège les pages
   réservées (utilisateurs, paramètres, sauvegarde) et `userHasPermission()`
   contrôle les Server Actions sensibles.

> **Note de sécurité** : toutes les requêtes passent par le serveur. Aucune
> clé de base de données n'est exposée au navigateur. La mise en place du Row
> Level Security côté Supabase est une étape de durcissement complémentaire.

---

## 5. Structure du projet

```
kinlouaziss-web/
├── prisma/
│   ├── schema.prisma        # 26 modèles (patients, dossiers, agenda, finance…)
│   └── seed.ts              # rôles, permissions, paramètres, admin
├── src/
│   ├── proxy.ts             # session + redirections (ex-middleware Next 16)
│   ├── app/
│   │   ├── actions/         # Server Actions (auth, patients, séances…)
│   │   ├── (auth)/          # page de connexion
│   │   ├── (app)/           # section authentifiée (gabarit + modules)
│   │   │   ├── tableau-de-bord/
│   │   │   ├── patients/        # liste, formulaire, fiche détaillée
│   │   │   ├── dossiers-medicaux/
│   │   │   ├── rendez-vous/     # agenda
│   │   │   ├── seances/         # séances + compte rendu imprimable
│   │   │   ├── exercices/
│   │   │   ├── paiements/
│   │   │   ├── factures/        # facture + impression
│   │   │   ├── devis/           # devis + conversion en facture
│   │   │   ├── rapports/        # statistiques + export CSV
│   │   │   ├── utilisateurs/    # comptes, rôles, activation, suppression
│   │   │   ├── parametres/      # cabinet, facturation, thérapeutes
│   │   │   └── sauvegarde/      # export JSON/CSV + historique
│   │   └── installation/    # écran affiché si Supabase est absent
│   ├── components/
│   │   ├── ui/              # composants génériques (bouton, table, dialog…)
│   │   ├── document-form-dialog.tsx # éditeur partagé facture / devis
│   │   ├── record-form.tsx  # formulaires de dossier médical
│   │   └── layout/          # gabarit, barre latérale, en-tête
│   └── lib/
│       ├── dal.ts           # utilisateur courant et contrôle d'accès
│       ├── prisma.ts        # client Prisma partagé
│       ├── rbac.ts          # rôles et permissions
│       ├── documents.ts     # totaux de facture / devis
│       ├── document-numbers.ts # numérotation FAC / DEV
│       ├── reports.ts       # agrégations de rapports
│       ├── backup.ts        # registre d'export des tables
│       ├── settings.ts      # paramètres du cabinet
│       ├── navigation.ts    # entrées de menu filtrées par rôle
│       ├── supabase/        # clients navigateur / serveur / proxy
│       └── validations/     # schémas Zod
└── public/                  # logo et ressources
```

---

## 6. Portage depuis l'application desktop

Le schéma Prisma reprend intégralement le modèle métier de `projetKenis`
(vousers, patients, dossiers médicaux, évaluations, plans de traitement,
rendez-vous, séances, exercices, paiements, factures, devis, paramètres,
journal d'audit). Les tables `therapists`, `quotes` et `patient_documents`
sont ajoutées pour le multi-utilisateur en ligne.

### Étapes réalisées

- [x] Socle Next.js, thème et identité KinLouaziss (palette issue du logo :
      bleu pétrole `#1b6e8f`, vert feuille `#336e11`)
- [x] Authentification Supabase + proxy de session
- [x] Rôles et permissions
- [x] Barre latérale filtrée par rôle
- [x] Tableau de bord (statistiques, prochains rendez-vous)
- [x] Module **Patients** complet (liste, recherche, création, fiche, suppression)
- [x] Module **Utilisateurs** (comptes Supabase Auth, trois rôles, activation,
      réinitialisation de mot de passe, suppression, matrice des permissions)
- [x] Module **Dossiers médicaux** (antécédents, bilans, objectifs, plans)
- [x] Module **Rendez-vous** (agenda ; un rendez-vous terminé crée la séance liée)
- [x] Module **Séances** (déroulé, progression, exercices, compte rendu imprimable)
- [x] Module **Exercices** (bibliothèque réutilisable)
- [x] Module **Paiements** (méthodes, rattachement facture / séance)
- [x] Module **Factures** (lignes, remise, TVA, encaissements, impression)
- [x] Module **Devis** (statuts, validité, conversion en facture, impression)
- [x] Module **Paramètres** (cabinet, devise, numérotation, formats, thérapeutes)
- [x] Module **Rapports** (activité, encaissements, export CSV)
- [x] Module **Sauvegarde** (export JSON complet + CSV par table, historique)

### Pistes d'évolution

- [ ] Row Level Security côté Supabase (durcissement complémentaire)
- [ ] Corbeille / restauration des éléments supprimés (`deletedAt` déjà en base)
- [ ] Graphiques de synthèse dans les rapports

---

## 7. Points d'attention

- **`force-dynamic`** : les pages authentifiées sont explicitement dynamiques,
  l'autorisation ne doit jamais être figée au moment du build.
- **Types de routes** : après l'ajout ou le renommage d'un dossier de route,
  exécutez `npx next typegen` avant `npm run typecheck` ; sinon `PageProps<"/…">`
  ne connaît pas encore la nouvelle route.
- **Documents PDF** : les factures, devis et comptes rendus s'impriment depuis le
  navigateur (`window.print()`), avec les règles `@media print` de
  `src/app/globals.css`. Aucun moteur PDF côté serveur n'est utilisé.
- **Montants** : stockés en `Float` pour rester alignés avec l'application
  d'origine (SQLite `REAL`). Un passage à `Decimal` reste envisageable.
- **Numérotation** : les préfixes et compteurs (`FAC`, `DEV`) viennent des
  paramètres ; la base reste la source de vérité pour éviter toute collision.
- **Traductions** : la version web est en **français uniquement**. L'application
  desktop reste trilingue (`fr`, `en`, `ar`).
- **Logo** : `public/kinlouaziss_logo.png`, copié depuis `projetKenis/assets/images/`.

## 8. Déploiement (Vercel)

1. Poussez le dépôt sur GitHub.
2. Importez-le dans [vercel.com](https://vercel.com).
3. Ajoutez les variables d'environnement (identiques à `.env`) :
   `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` et
   `SUPABASE_SERVICE_ROLE_KEY`.
4. `SUPABASE_SERVICE_ROLE_KEY` est **indispensable au module Utilisateurs**
   (création, activation et suppression des comptes Supabase Auth). C'est une
   clé **strictement côté serveur** : ne la préfixez jamais par
   `NEXT_PUBLIC_`, ne l'exposez à aucun composant client. Sans elle, la page
   `/utilisateurs` affiche un avertissement et la création de comptes échoue.
5. `NEXT_PUBLIC_SITE_URL` doit correspondre à l'URL publique du site pour que
   les redirections d'authentification fonctionnent.
6. Déployez. Exécutez ensuite `npm run db:push` et `npm run db:seed` depuis
   votre poste, pointé sur `DATABASE_URL` de production.
