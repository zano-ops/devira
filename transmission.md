# Transmission — Devira (devira.fr)
> À lire en début de session pour reprendre sans poser de questions.
> Mis à jour : 4 juillet 2026

---

## Objectif du projet
App SaaS BTP pour artisans : génération de devis PDF professionnel par IA en 2 minutes.
- Stack : Vite 8 + React + TypeScript + Tailwind, Supabase (auth/DB/Edge Functions), Claude AI, jsPDF + jspdf-autotable, Stripe
- Repo GitHub : `zano-ops/devira` → déploiement auto Vercel sur push `master`
- Supabase projet ACTIF : `osvwlgchubgtklyonqpv` (nom : "devis", org : kjnidduptvjlfyydybyf, région : eu-central-2)
  ⚠️ Ne PAS sélectionner le projet 1 (sixdraffgihnhhxpgjcd) — il est INACTIF

---

## État actuel du code

### Landing page (`src/pages/Landing.tsx`)
- Section PDF : affiche les **2 pages du devis en images PNG** (`/devis-apercu-p1.png` et `/devis-apercu-p2.png`)
  - Desktop : côte à côte
  - Mobile : empilées verticalement
- Cliquer sur une image ouvre `/devis-exemple.pdf`
- Images générées avec PyMuPDF depuis `Devis-2026-0015.pdf` (dpi=180 → 1489×2105px)
- Section témoignages (TESTIMONIALS) : **supprimée**
- PDF de référence : `public/devis-exemple.pdf` = copie de `Devis-2026-0015.pdf`

### PDF généré (`src/lib/generatePdf.ts`)
- Quadrillage visible : `lineColor: [235, 235, 235]`, `lineWidth: 0.5`
- En-tête bleu foncé : `fillColor: [30, 58, 95]`
- Appliqué aux devis ET aux factures

### Réglages / Abonnement (`src/pages/Parametres.tsx`)
- Bouton "Gérer mon abonnement" → appelle Edge Function `create-portal-session`
- Ouvre le portail Stripe dans un nouvel onglet (`window.open(..., '_blank')`)
- En cas d'erreur : toast avec `contact@devira.fr`
- ⚠️ Fonctionne uniquement pour les comptes avec un `stripe_customer_id` (vrais clients payants). L'admin n'en a pas — c'est normal.

### Edge Functions Supabase déployées
- `create-portal-session` — crée une session Stripe Customer Portal
- `analyse-catalogue` — analyse image/PDF et extrait des prestations BTP (Claude Haiku)
- À redéployer si besoin : `send-quote-email`, `send-sms`

### Catalogue (`src/pages/Catalogue.tsx`)
- Table `catalogue_items` créée via `SETUP_catalogue.sql` (RLS activé)
- Bouton "Ajouter des exemples BTP" et bouton "Importer" → fonctionnels

---

## Fichiers modifiés (session du 4 juillet 2026)

| Fichier | Changement |
|---|---|
| `src/pages/Landing.tsx` | Images PNG à la place de l'iframe PDF ; suppression testimonials |
| `src/pages/Parametres.tsx` | Stripe Customer Portal réel, email corrigé |
| `src/pages/DevisDetail.tsx` | Suppression variables YouSign inutilisées (fix build TS6133) |
| `src/lib/generatePdf.ts` | Quadrillage visible (235/0.5) |
| `public/devis-exemple.pdf` | Remplacé par Devis-2026-0015.pdf |
| `public/devis-apercu-p1.png` | Page 1 du devis en image |
| `public/devis-apercu-p2.png` | Page 2 du devis en image |
| `supabase/functions/create-portal-session/index.ts` | Nouveau — Stripe portal |
| `supabase/functions/analyse-catalogue/index.ts` | Nouveau — analyse catalogue IA |
| `SETUP_catalogue.sql` | Nouveau — création table catalogue_items |

---

## Ce qui a été testé et n'a pas marché

| Tentative | Problème |
|---|---|
| `window.location.href` pour le portail Stripe | Ouvrait dans le mauvais navigateur |
| `lineColor: [235,235,235]` + `lineWidth: 0.3` | Quadrillage invisible dans le PDF |
| Iframe PDF sur mobile | Ne s'affiche pas sur iOS Safari (limitation Apple) |
| `<object>` / `<embed>` PDF sur mobile | Même problème iOS |
| Aperçu HTML/CSS simulé du devis (1 page) | "On voit pas tout c'est nul" |
| Iframe unique responsive desktop + mobile | Toujours le problème iOS |
| ✅ Images PNG des 2 pages | **Solution finale retenue — fonctionne partout** |

---

## À faire ensuite

### Urgent
- [ ] Tester "Ajouter des exemples BTP" dans Catalogue sur un vrai compte (pas admin)
- [ ] Lancer `SETUP_sms_tracking.sql` dans Supabase SQL Editor (ajoute `sms_count` à `profiles` + fonction `admin_get_users`)
- [ ] Redéployer si besoin : `send-quote-email` et `send-sms`

### Quand prêt
- [ ] Ajouter `YOUSIGN_API_KEY` dans les secrets Supabase pour activer la signature électronique
- [ ] Premier client : prospection Facebook groupes BTP artisans

### Secrets Supabase
- `STRIPE_SECRET_KEY` ✅
- `ANTHROPIC_API_KEY` ✅
- `YOUSIGN_API_KEY` ❌ (à ajouter quand prêt)

---

## Commandes utiles

```bash
# Déployer une Edge Function (depuis le dossier projet)
cd "C:\Users\Chowm\OneDrive\Bureau\claudecode\devispro-btp"
npx supabase functions deploy <nom-fonction>
# → sélectionner projet 4 (osvwlgchubgtklyonqpv)

# Build + push
npm run build && git add -A && git commit -m "..." && git push
```
