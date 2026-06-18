# Transmission — Devira (devispro-btp)
_Mis à jour : 17 juin 2026_

---

## Objectif du projet

**Devira** — générateur de devis IA pour artisans BTP français.  
Site : `devira.fr` | Repo : `github.com/zano-ops/devira` | Dossier local : `claudecode/devispro-btp/`

**Goal business :** 1 000 €/mois d'ici ~août 2026, 10 000 €/mois d'ici ~novembre 2026.

**Stack :** Vite + React + TypeScript + Tailwind · Supabase (auth + DB + Edge Functions) · Claude API (opus-4-5 pour devis, haiku pour catalogue) · Vercel (auto-deploy sur push `master`) · Brevo (emails lifecycle) · Resend (emails devis PDF) · Stripe (paiement via Payment Links)

**Pricing :** Trial = 1 devis gratuit. Essentiel = 10 devis/mois, 29,81€ TTC. Pro = illimité, 79,48€ TTC.

---

## État actuel du code

### Déploiement Vercel
- **Dernier commit pushé** : `5a2e48a` — build vérifié localement (`npm run build` ✓ en 3.29s)
- **Production précédente** : `a4c9e85` (admin dashboard) — les commits entre les deux échouaient à cause d'erreurs TypeScript résolues
- Vérifier dans Vercel → Deployments que `5a2e48a` est bien "Prêt"

### Fonctionnalités livrées dans la session du 17/06
| Feature | Commit | État Vercel |
|---|---|---|
| Webhook Stripe (activation/annulation abo) | `4446d26` + SQL | Déployé, **SQL + secret à configurer** |
| Email bienvenue au signup (fix email NULL) | `4446d26` | Déployé ✓ confirmé par user |
| PWA bottom nav iPhone (viewport-fit=cover) | `33337e4` | Déployé ✓ confirmé par user |
| Dashboard admin `/admin` | `a4c9e85` | Déployé, **SQL à exécuter** |
| Auto-save Réglages (debounce 1.5s, sans bouton) | `5a2e48a` | En attente déploiement |
| Fix overscroll/rebond iOS + Android | `5a2e48a` | En attente déploiement |
| Redirect `/admin` conservé après login | `5a2e48a` | En attente déploiement |

---

## Étapes manuelles encore à faire (BLOQUANTES)

### 1. SQL dashboard admin — `/admin` ne fonctionne pas sans ça
**Supabase → SQL Editor** → coller `SETUP_admin_dashboard.sql` → Run.  
Résultat attendu : `Fonction admin_get_users créée !`  
Ensuite, aller sur `devira.fr/admin` connecté avec `chowmathias@gmail.com`.

### 2. SQL Stripe webhook — abonnements jamais activés sans ça
**Supabase → SQL Editor** → coller `SETUP_stripe_webhook.sql` → Run.

### 3. Secret Stripe dans Supabase Edge Functions
**Stripe → Workbench → devira-webhook → Signing secret** → copier.  
**Supabase → Edge Functions → Secrets** → ajouter `STRIPE_WEBHOOK_SECRET`.

### 4. Événements Stripe webhook à vérifier
Dans Stripe → devira-webhook → cocher si pas déjà fait :
- `checkout.session.completed`
- `customer.subscription.deleted`

### 5. Google OAuth — corriger l'URL privacy policy
**Google Cloud Console → Branding** → changer :
`https://devira.fr/privacy` → `https://devira.fr/confidentialite`  
(sinon la validation bloque sur une 404)

---

## Fichiers modifiés dans cette session (17/06)

```
src/pages/Parametres.tsx          auto-save debounce 1.5s, bouton Sauvegarder supprimé
src/pages/Admin.tsx               NOUVEAU : dashboard admin (KPIs, coûts, tableau users)
src/pages/Login.tsx               redirect param ?redirect= après connexion
src/pages/AuthCallback.tsx        redirect param après Google OAuth
src/App.tsx                       route /admin, PrivateRoute passe ?redirect=
src/index.css                     overscroll-behavior sur html ET body (iOS/Android)
src/components/UpgradeModal.tsx   URLs Stripe avec ?client_reference_id=USER_ID
src/pages/Landing.tsx             même chose
src/lib/supabase.ts               triggerWelcomeEmail avec fallback email param
index.html                        viewport-fit=cover (PWA iPhone safe-area)
SETUP_admin_dashboard.sql         NOUVEAU : fonction SQL admin_get_users()
SETUP_stripe_webhook.sql          NOUVEAU : colonne stripe_customer_id dans profiles
EDGE_FUNCTION_stripe-webhook.ts   NOUVEAU : Edge Function webhook Stripe
EDGE_FUNCTION_send-lifecycle-emails.ts   mis à jour : fallback email dans welcome
supabase/functions/stripe-webhook/index.ts          NOUVEAU
supabase/functions/send-lifecycle-emails/index.ts   mis à jour
```

---

## Ce qui a été testé et n'a pas marché

### 4 déploiements Vercel consécutifs en erreur (TypeScript)
1. **`useRef<typeof form | null>(null)` déclaré AVANT `form`** — TypeScript ne résout pas `typeof` sur une variable déclarée plus bas dans la même fonction. Fix : déplacer `lastSavedRef` après `const [form, setForm]`.
2. **`useRef<ReturnType<typeof setTimeout>>()`** sans valeur initiale — TypeScript strict exige un argument quand le type est spécifié. Fix : `useRef<ReturnType<typeof setTimeout> | undefined>(undefined)`.
3. `vite dev` ne détecte PAS ces erreurs. Seulement `npm run build` (= `tsc -b && vite build`). **Toujours faire `npm run build` avant de pusher.**

### Overscroll bounce
- `overscroll-behavior: none` sur `body` seul ignoré par iOS Safari.
- Fix : ajouter aussi sur `html`.

### Google OAuth — URL Supabase dans le sélecteur de compte
- Affiche `osvwlgchubgtklyonqpv.supabase.co` au lieu de "Devira"
- Cause structurelle : Supabase enregistre son domaine comme redirect URI (limite plan gratuit)
- Partiellement résolu : app name "Devira" + logo configurés → en cours d'examen chez Google

---

## Gotchas importants

- **Edge functions** : double fichier (`supabase/functions/<nom>/index.ts` + `EDGE_FUNCTION_<nom>.ts`). Toujours garder les deux IDENTIQUES à la main.
- **`/home` et non `/`** pour les liens "retour au site" quand l'utilisateur est connecté (`/` redirige vers `/dashboard`).
- **`profiles.email` est NULL au signup** jusqu'à la fin de l'onboarding. Utiliser `session.user.email` comme fallback.
- **Stripe webhook** : détection du plan via `session.metadata?.plan` en priorité, sinon fallback `amount_total` en centimes (2981 = Essentiel, 7948 = Pro).
- **Vercel silent fail** : si un push ne se déploie pas, faire `git commit --allow-empty -m "trigger deploy" && git push`.
- **Jamais `as React.CSSProperties`** sur des props cross-browser (scrollbarWidth, etc.) — crash en prod même si build passe. Utiliser une classe CSS.

---

## Ce qu'il comptait faire ensuite

1. **Tester le dashboard admin** : exécuter le SQL → aller sur `devira.fr/admin`
2. **Tester le webhook Stripe** : faire un vrai paiement test pour confirmer `subscription_status` → `active` automatiquement
3. **Vérifier emails lifecycle** : faire un signup test et confirmer que l'email de bienvenue arrive
4. **Conversion trial → payant** : la priorité business est d'atteindre 1000€/mois d'ici août — actions landing page, onboarding, relances

---

## Accès rapides

| Service | URL |
|---|---|
| Vercel | `vercel.com/zano5w/devispro-btp/deployments` |
| Supabase | `app.supabase.com` → projet `osvwlgchubgtklyonqpv` |
| Stripe | `dashboard.stripe.com` → Workbench → devira-webhook |
| Google Cloud OAuth | APIs & Services → Google Auth Platform → Branding |
| Brevo logs | Transactionnel → Logs |
| Repo GitHub | `github.com/zano-ops/devira` |
