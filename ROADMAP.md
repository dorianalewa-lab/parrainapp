# Roadmap V1 — ParrainApp

**Objectif** : transformer le prototype actuel (3 HTML statiques + Airtable + Make) en une V1 démontrable, sécurisée et multi-salons, en ~2 semaines de dev.

**Cible V1** : 1 à 3 salons pilotes, gratuits, démo commerciale.

**Cible V2 (hors périmètre)** : self-service inscription salon, billing Stripe, migration Infomaniak.

---

## 1. Décisions techniques (validées)

| Sujet | Choix | Raison |
|---|---|---|
| Hébergement | Vercel (V1) → Infomaniak (V2) | Vercel = zero-config pour V1. Code Node.js standard donc portable plus tard. |
| Backend | Vercel Serverless Functions (Node.js) | Suffit pour 1-3 salons. Facturation à l'usage, gratuit à ce volume. |
| Base de données | Airtable (conservé) | Déjà en place, UI éditable par toi. Limite ~1000 records/base gratuit, ~50k payant — largement suffisant pour V1. |
| SMS | Brevo API directe | Suppression de Make → une brique en moins, code plus simple, moins cher. |
| Auth | iron-session (cookie signé) + bcrypt | Simple, robuste, pas de JWT à gérer. |
| Anti-spam | Rate limit in-memory + honeypot + validation numéro | Suffit à ce stade. Upstash Redis en V2 si besoin distribué. |
| QR code | Package `qrcode` npm | Génération server-side, téléchargeable en SVG/PNG. |

**Alternatives écartées et pourquoi** :
- *Cloudflare Pages/Workers* : meilleure perf et prix à l'échelle, mais DX moins bonne pour un premier SaaS et Airtable SDK plus friction.
- *Supabase* : idéal pour V2, mais oblige à migrer les data existantes maintenant → surcoût pour rien.
- *Full no-code (Softr/Bubble)* : impose leur modèle d'auth et de tarification, très limitant dès que tu veux customiser le SMS ou le tracking.

**Portabilité vers Infomaniak** : on écrit les handlers API en Node.js standard (`(req, res) => ...`), sans APIs Vercel-spécifiques (pas de `@vercel/kv`, `@vercel/postgres`, etc.). Le jour où tu migres, tu wrappes les handlers dans un Express minimal et tu déploies sur Infomaniak Node.js hosting. Coût de migration estimé : 1-2 jours.

---

## 2. Structure du projet

Choix simplifié : HTML statiques à la racine (zero-config Vercel), pas de dossier `public/` inutile. Vercel sert automatiquement les fichiers racine, et détecte les serverless functions dans `/api/`.

```
parrainapp/
├── index.html                    # inscription parrain (?salon=xxx)
├── parrainage.html               # landing filleul (?ref=Julie&salon=xxx)
├── dashboard.html                # dashboard salon (Sprint 2 : reconstruit avec auth)
├── admin.html                    # onboarding salon (Sprint 4)
├── privacy.html                  # politique de confidentialité (Sprint 5)
├── assets/                       # extraction CSS commun (Sprint 5)
│   └── styles.css
├── api/                          # serverless functions Vercel
│   ├── lead.js                   # ✅ Sprint 1 — POST inscription parrain
│   ├── track/
│   │   ├── click.js              # Sprint 3 — POST tracking clic landing
│   │   └── rdv.js                # Sprint 3 — GET redirect + tracking booking_url
│   ├── auth/
│   │   ├── login.js              # Sprint 2 — POST login salon
│   │   └── logout.js             # Sprint 2 — POST logout
│   ├── dashboard/
│   │   ├── clients.js            # Sprint 2 — GET liste parrains + filleuls
│   │   ├── validate.js           # Sprint 3 — POST valider visite filleul
│   │   └── settings.js           # Sprint 4 — GET/PATCH réglages salon
│   ├── admin/
│   │   └── create-salon.js       # Sprint 4 — POST création salon (mdp maître)
│   └── _lib/                     # utilitaires partagés (non exposés comme routes)
│       ├── airtable.js           # ✅ wrapper Airtable
│       ├── brevo.js              # ✅ wrapper Brevo SMS
│       ├── validation.js         # ✅ validation prénom / téléphone / slug
│       ├── ratelimit.js          # ✅ rate limiter in-memory
│       ├── shortid.js            # ✅ génération codes courts
│       └── auth.js               # Sprint 2 — session cookie helpers
├── package.json                  # ✅
├── vercel.json                   # ✅ cleanUrls
├── .env.example                  # ✅ template variables
├── .gitignore                    # ✅
├── SETUP.md                      # ✅ guide pas-à-pas Sprint 1
└── ROADMAP.md                    # ce fichier
```

Note migration Infomaniak V2 : cette structure `api/*.js` avec handlers `(req, res) => ...` est portable telle quelle sur un serveur Node standard (Express en 20 lignes wrappe le tout).

---

## 3. Schéma de données Airtable (3 tables)

### Table `Salons`

| Champ | Type | Notes |
|---|---|---|
| `id` (auto) | Airtable ID | clé primaire native |
| `slug` | Single line text | ex: `coiffeur-jean` — unique, utilisé dans URLs |
| `nom` | Single line text | affiché sur la landing |
| `password_hash` | Long text | bcrypt hash |
| `booking_url` | URL | site salon / fiche Google / Planity — cible du bouton "Prendre RDV" |
| `panier_moyen_chf` | Number (integer) | ex: 65 — utilisé pour calculer le CA généré |
| `pourcentage_reduc_filleul` | Number (integer) | ex: 15 — affiché sur la landing |
| `recompense_parrain_texte` | Single line text | ex: "10 CHF de bon" — envoyé dans le SMS de récompense |
| `sms_template_parrain` | Long text | template avec `{prenom}` `{lien}` `{salon}` — envoyé à l'inscription |
| `sms_template_recompense` | Long text | template envoyé quand filleul validé |
| `created_at` | Created time | auto |
| `parrains_count` (rollup) | Count | rollup depuis Parrains |
| `filleuls_count` (rollup) | Count | rollup depuis Filleuls |

### Table `Parrains` (l'ancienne "Clients")

| Champ | Type | Notes |
|---|---|---|
| `id` (auto) | Airtable ID | clé primaire |
| `salon` | Link → Salons | relation |
| `prenom` | Single line text |  |
| `telephone` | Phone | format E.164 (+41...) |
| `code_court` | Single line text | ex: `a7f3k9` — unique, sert d'URL `/r/a7f3k9` |
| `consent_at` | Date/time | horodatage RGPD/LPD |
| `consent_ip` | Single line text | preuve consentement |
| `source` | Single select | `qr_code`, `manuel`, autre |
| `created_at` | Created time |  |
| `filleuls` (linked) | Link → Filleuls | inverse |
| `nb_filleuls_venus` (rollup) | Count | via filter statut=Récompensé |
| `ca_genere_chf` (formula) | Formula | `nb_filleuls_venus * salon.panier_moyen_chf` |

### Table `Filleuls`

| Champ | Type | Notes |
|---|---|---|
| `id` (auto) | Airtable ID |  |
| `parrain` | Link → Parrains |  |
| `salon` | Link → Salons | dénormalisé pour perf query |
| `clicked_at` | Date/time | premier clic sur `/r/[code]` |
| `rdv_clicked_at` | Date/time | clic bouton "Prendre RDV" |
| `visited_at` | Date/time | validé par le salon |
| `panier_estime_chf` | Number | copie du `panier_moyen_chf` au moment de la validation |
| `statut` | Single select | `Curieux` (clic landing), `Intéressé` (clic RDV), `Venu` (validé salon) |
| `created_at` | Created time |  |

---

## 4. Contrat d'API

Toutes les routes retournent JSON `{ ok: true, ... }` ou `{ ok: false, error: "..." }`.

### 4.1 Public (sans auth)

**`POST /api/lead`** — inscription parrain
```json
Request:  { "prenom": "Julie", "telephone": "+41791234567", "salon": "coiffeur-jean", "consent": true }
Response: { "ok": true, "code_court": "a7f3k9" }
```
Effets : rate-limit par IP (5/min), vérifie que le salon existe, refuse doublons `(salon, telephone)` sur 30j, crée Parrain, envoie SMS via Brevo avec le lien `https://parrainapp.vercel.app/r/a7f3k9`.

**`GET /r/[code]`** — landing filleul (page HTML)
Rendue côté serveur avec les données du parrain + salon. Enregistre `clicked_at` à la première visite (si null).

**`GET /api/track/rdv?code=a7f3k9`** — clic bouton RDV
Enregistre `rdv_clicked_at` puis 302 redirect vers `salon.booking_url`.

### 4.2 Auth

**`POST /api/auth/login`**
```json
Request:  { "slug": "coiffeur-jean", "password": "..." }
Response: { "ok": true } + Set-Cookie signé
```

**`POST /api/auth/logout`** — clear cookie

### 4.3 Dashboard (auth requise)

**`GET /api/dashboard/clients`**
```json
Response: {
  "ok": true,
  "salon": { "nom": "Coiffeur Jean", "panier_moyen_chf": 65, ... },
  "parrains": [
    {
      "id": "recXXX", "prenom": "Julie", "telephone": "+417...",
      "created_at": "...", "nb_clics": 3, "nb_rdv": 2, "nb_venus": 1,
      "ca_genere_chf": 65,
      "filleuls": [ { "id":"...", "statut":"Venu", ... } ]
    }
  ],
  "stats": { "total_parrains": 12, "total_filleuls_venus": 5, "ca_total_chf": 325 }
}
```

**`POST /api/dashboard/validate`** — valider visite d'un filleul
```json
Request:  { "filleul_id": "recYYY" }
Response: { "ok": true }
```
Effets : passe statut à `Venu`, écrit `visited_at` + copie `panier_estime_chf`, envoie SMS récompense au parrain.

**`GET/PATCH /api/dashboard/settings`** — lire/modifier réglages salon
Champs modifiables : `booking_url`, `panier_moyen_chf`, `pourcentage_reduc_filleul`, `recompense_parrain_texte`, templates SMS.

### 4.4 Admin (mdp maître dans env var)

**`POST /api/admin/create-salon`**
```json
Request: { "master_password": "...", "nom": "Coiffeur Jean", "slug": "coiffeur-jean", "password": "temp1234", "booking_url": "https://..." }
Response: { "ok": true, "qr_url_svg": "..." }
```

---

## 5. Sécurité & conformité LPD (Suisse)

### 5.1 Sécurité applicative
- **Aucune clé secrète côté client**. Airtable token, Brevo key, session secret → uniquement en env vars Vercel.
- **Rate limiting** : `/api/lead` limité à 5/min/IP + 1/24h par téléphone/salon.
- **Honeypot** : champ caché dans le formulaire, refus si rempli (anti-bot basique).
- **Validation stricte** : téléphone au format E.164 via regex + libphonenumber-js, prénom ≤ 40 chars, slug salon existant.
- **Password salon** : bcrypt cost 12. Pas de compte "admin" global.
- **CORS** : `/api/*` restreint au domaine de prod.
- **HTTPS obligatoire** (natif Vercel).

### 5.2 Conformité nLPD (Suisse) — checklist minimale V1
- [x] Consentement explicite avant envoi SMS (case décochée par défaut → à cocher activement).
- [x] Horodatage + IP du consentement stockés (`consent_at`, `consent_ip`).
- [x] Politique de confidentialité en pied de page (fichier `/public/privacy.html` à rédiger).
- [x] Base de traitement : consentement (art. 6 nLPD).
- [x] Sous-traitants documentés : Vercel (US, DPF), Airtable (US, DPF), Brevo (FR/EU).
- [x] Droit à l'effacement : bouton "supprimer" dans le dashboard salon pour chaque parrain.
- [ ] *(V2)* Registre des activités de traitement formalisé.
- [ ] *(V2)* Contrat de sous-traitance signé avec chaque salon (le salon devient responsable de traitement, ParrainApp sous-traitant).

**Point d'attention** : Vercel héberge en US par défaut. Pour un vrai marché suisse, la V2 sur Infomaniak (data en Suisse) sera un argument commercial fort.

---

## 6. Plan sprint par sprint

### Sprint 0 — Sécurité d'urgence (à faire par toi, ~15 min)
- [ ] Révoquer le token Airtable exposé actuellement (`patvJ5u6oV1Tid...`) sur https://airtable.com/create/tokens
- [ ] Générer un nouveau PAT avec scope restreint : `data.records:read`, `data.records:write`, `schema.bases:read`, uniquement sur la base `appWzruoPWk9psmrx`
- [ ] Créer un compte Brevo si pas déjà fait, récupérer l'API key (Account → SMTP & API → API Keys)
- [ ] Créer projet Vercel (link le futur repo GitHub)

### Sprint 1 — Squelette + backend serverless (2-3 jours)
Livrable : le formulaire d'inscription parrain fonctionne via une API sécurisée. Token Airtable plus jamais côté client.
- Transformation structure : `public/` + `api/` + `package.json` + `vercel.json`
- Extraction CSS commun dans `assets/styles.css`
- Wrappers `_lib/airtable.js` + `_lib/brevo.js`
- Route `POST /api/lead` complète (validation, rate limit, écriture Airtable, SMS Brevo)
- Migration `index.html` pour appeler `/api/lead` au lieu du webhook Make
- Suppression du token Airtable de `dashboard.html` (dashboard temporairement KO, remis en route au Sprint 2)

### Sprint 2 — Auth + table Salons (1-2 jours)
Livrable : chaque salon a son compte, se connecte, voit uniquement ses données.
- Création table `Salons` dans Airtable
- Migration des données existantes (rattacher les Parrains actuels à un premier salon test)
- Routes `/api/auth/login` + `/api/auth/logout` (iron-session)
- Middleware `_lib/auth.js` : `requireSalon(req)` sur toutes les routes `/api/dashboard/*`
- Route `GET /api/dashboard/clients` isolée par salon
- Refonte `dashboard.html` : formulaire login réel, plus de `if (code === 'admin')`

### Sprint 3 — Fermer la boucle parrain → filleul (2-3 jours) ⭐ **le plus important**
Livrable : le dashboard montre pour chaque parrain combien de filleuls ont cliqué, cliqué RDV, sont venus. CA calculé.
- Création table `Filleuls` dans Airtable
- Génération `code_court` unique à l'inscription parrain (nanoid 6 chars)
- Route dynamique `/r/[code]` (via `vercel.json` rewrite → serverless function qui rend le HTML)
- Route `/api/track/rdv?code=xxx` (log `rdv_clicked_at` + redirect vers `booking_url`)
- Route `POST /api/dashboard/validate` (statut `Venu` + SMS récompense parrain)
- Refonte dashboard : liste parrains avec drilldown filleuls, stats CA (`panier_moyen * nb_venus`)

### Sprint 4 — Onboarding salon + QR (1 jour)
Livrable : tu crées un nouveau salon en 30 secondes avec QR code à imprimer.
- Route `POST /api/admin/create-salon` (protégée par `MASTER_PASSWORD`)
- Page `admin.html` : formulaire création + génération QR code téléchargeable (SVG + PNG)
- Page `/api/dashboard/settings` : le salon peut modifier son `booking_url`, panier moyen, templates SMS

### Sprint 5 — Polish démo (1 jour)
- Fix responsive dashboard (table → cards sur mobile)
- Export CSV parrains
- Page `/public/privacy.html` (politique de confidentialité minimale)
- Bouton suppression parrain (RGPD/LPD)
- README technique pour toi + README-salon.pdf pour les patrons

**Total : ~9-10 jours de dev.**
Démo commerciale viable dès la fin du Sprint 3 (jour 7-8).

---

## 7. Variables d'environnement Vercel

```
AIRTABLE_TOKEN=pat...              # nouveau token restreint
AIRTABLE_BASE_ID=appWzruoPWk9psmrx
BREVO_API_KEY=xkeysib-...
SESSION_SECRET=<32 bytes random>    # openssl rand -hex 32
MASTER_PASSWORD=<ton mdp admin fort>
PUBLIC_BASE_URL=https://parrainapp.vercel.app
```

Aucune de ces variables ne doit apparaître dans le code frontend.

---

## 8. Coûts estimés (V1, 1-3 salons pilotes)

| Poste | Coût mensuel | Notes |
|---|---|---|
| Vercel | 0 CHF | Free tier : 100 GB bandwidth, 100k function invocations |
| Airtable | 0 CHF | Free : 1000 records/base. Suffisant pour ~500 parrains + 500 filleuls. Passe à ~24 CHF/mo au-delà. |
| Brevo SMS | ~0.06 CHF/SMS en Suisse | 100 parrains inscrits = ~200 SMS (inscription + récompense) = ~12 CHF/mo |
| Domaine (optionnel) | ~15 CHF/an | `parrainapp.ch` chez Infomaniak |
| **Total V1** | **~15-30 CHF/mo** | pour 3 salons pilotes actifs |

---

## 9. Migration future vers Infomaniak (V2)

Points à respecter dès la V1 pour que la migration soit facile :
- **Handlers Node.js standards** `(req, res) => ...` — Vercel accepte ce format natif. Pour Infomaniak, on wrappera dans un `app.post('/api/lead', handler)` Express en 20 lignes.
- **Pas d'APIs Vercel proprios** (`@vercel/kv`, `@vercel/blob`, `@vercel/postgres`, `@vercel/edge-config`).
- **Rate-limit in-memory OK V1**, mais garder l'interface abstraite pour brancher Redis/Valkey plus tard (Infomaniak propose du Redis managé).
- **Airtable reste portable** tel quel côté Infomaniak. Si le jour vient de sortir d'Airtable (limite atteinte, contrôle des data en Suisse), la migration Airtable → Postgres est ~2-3 jours (structure simple, 3 tables).

Migration estimée : **1-2 jours de dev** pour porter le code, + éventuelle migration Airtable → Postgres si tu veux tout rapatrier en Suisse.

---

## 10. Hors périmètre V1 (backlog V2)

- Inscription salon self-service (avec paiement Stripe)
- Facturation SaaS Stripe (abo mensuel par salon)
- Envoi WhatsApp (via Twilio ou Brevo WhatsApp Business API)
- Intégration Google Reviews / demande d'avis auto
- Multi-langues (DE/IT pour marché suisse)
- Statistiques avancées (courbes temporelles, cohortes)
- Notifications push web pour le salon quand nouveau parrain / nouveau filleul
- App mobile PWA installable
- Rôles multiples par salon (patron / employé)
- Historique d'audit (qui a validé quoi et quand)
- Migration Airtable → Postgres (Supabase ou Infomaniak DB)

---

## 11. Points de décision restants

Avant d'attaquer le Sprint 1 :
1. Le domaine final V1 : on reste sur `parrainapp.vercel.app` ou tu veux acheter `parrainapp.ch` maintenant ? *(impact : lien SMS + QR code)*
2. Le nom du produit final est bien "ParrainApp" ou tu veux le changer ? *(le renommage coûte plus cher plus tard)*
3. Tu me donnes accès au repo GitHub (recommandé) ou on travaille en local et tu pushes toi-même ?
