# Setup Sprint 2 — Auth + Salons

Ce que tu déploies : vraie authentification par salon (slug + mot de passe), dashboard isolé par salon, création de salon via interface admin.

Ordre : **A → B → C → D → E**.

---

## A. Airtable — créer la table `Salons`

1. Dans ta base (`appWzruoPWk9psmrx`), clique **+ Add or import → Create empty table** → nomme-la exactement **`Salons`** (majuscule au S, sans accent).
2. Renomme le champ principal `Name` en **`slug`** (icône ✏️).
3. Ajoute les champs suivants (**noms exacts, minuscules, sans accent**) :

| Nom du champ | Type Airtable | Notes |
|---|---|---|
| `slug` | Single line text | champ principal, déjà renommé |
| `nom` | Single line text | affiché sur la landing et le dashboard |
| `password_hash` | Long text | bcrypt (généré automatiquement — ne jamais écrire à la main) |
| `booking_url` | URL | site salon / fiche Google / Planity — sera utilisé au Sprint 3 |
| `panier_moyen_chf` | Number → Integer | ex : 65 |
| `pourcentage_reduc_filleul` | Number → Integer | ex : 15 |
| `recompense_parrain_texte` | Single line text | ex : "10 CHF de bon d'achat" |
| `sms_template_parrain` | Long text | optionnel — laisse vide si tu utilises le template par défaut. Variables supportées : `{prenom}`, `{salon}`, `{lien}` |
| `sms_template_recompense` | Long text | optionnel — pour Sprint 3 |
| `created_at` | Created time | auto |

**Ne remplis aucune ligne à la main.** Tu vas créer ton premier salon via l'interface admin à l'étape D.

---

## B. Vercel — vérifier les variables d'environnement

Va sur Vercel → ton projet → **Settings → Environment Variables**. Confirme que tu as (au minimum) :

- `AIRTABLE_TOKEN`
- `AIRTABLE_BASE_ID`
- `BREVO_API_KEY`
- `BREVO_SMS_SENDER`
- `PUBLIC_BASE_URL`
- **`SESSION_SECRET`** ← indispensable pour Sprint 2. Doit faire **32 caractères ou plus**. Génère-le sur https://generate-secret.vercel.app/32 si ce n'est pas déjà fait.
- **`MASTER_PASSWORD`** ← indispensable pour Sprint 2. C'est TON mot de passe pour créer des salons via `/admin`. Choisis-en un fort (12+ chars, unique).

Si tu ajoutes ou modifies une variable → **Redéploie** ensuite (Deployments → dernier deploy → menu `⋯` → Redeploy).

---

## C. Push le code sur GitHub

Nouveaux fichiers à ajouter dans ton repo :

- `api/_lib/session.js`
- `api/_lib/auth.js`
- `api/auth/login.js`
- `api/auth/logout.js`
- `api/dashboard/clients.js`
- `api/admin/create-salon.js`
- `admin.html`
- `SETUP-SPRINT-2.md`

Fichiers modifiés :

- `package.json` (ajoute `bcryptjs` et `jsonwebtoken`)
- `api/_lib/airtable.js` (ajoute `findSalonBySlug`)
- `api/lead.js` (vérifie que le salon existe + supporte template SMS custom)
- `dashboard.html` (reconstruction complète : login + dashboard)

**Si tu utilises GitHub Desktop maintenant** (que je te recommande à nouveau — https://desktop.github.com) : ouvre-le, tu vois toutes les modifs, tu écris un message de commit et tu push.

**Si tu restes en drag & drop web** : sur ton repo GitHub → Add file → Upload files → sélectionne TOUT le dossier `parrainapp` (Ctrl+A) → drag → attends que tout charge → Commit changes. Message suggéré : `Sprint 2 — auth + table Salons + dashboard`.

Vercel va installer les 2 nouvelles dépendances (`bcryptjs`, `jsonwebtoken`) puis déployer. Compte 1-2 min de build.

---

## D. Créer ton premier salon

Une fois le déploiement vert :

1. Ouvre `https://parrainapp.vercel.app/admin`
2. Remplis le formulaire :
   - **Master password** : celui que tu as mis dans `MASTER_PASSWORD` sur Vercel
   - **Nom** : ex `Coiffeur Test`
   - **Slug** : ex `coiffeur-test` (a-z, 0-9, tirets uniquement)
   - **Mot de passe salon** : celui que le salon utilisera pour se connecter (min 8 chars)
   - **URL RDV** : facultatif, on l'exploite au Sprint 3
   - Le reste : les valeurs par défaut sont ok
3. Clique **Créer le salon**
4. Attendus :
   - Message "✓ Salon créé !"
   - Une nouvelle ligne dans la table `Salons` sur Airtable, avec un `password_hash` bcrypt (commence par `$2a$12$...`)
   - Un encadré te donnant les 2 liens à partager : page inscription parrain + dashboard

---

## E. Tests end-to-end (le vrai check)

### E1. Isolation multi-salon

1. Crée un 2ème salon via `/admin` avec un slug différent (ex `institut-beaute`)
2. Ouvre `/?salon=coiffeur-test` → inscris un parrain "Alice"
3. Ouvre `/?salon=institut-beaute` → inscris un parrain "Bruno"
4. Connecte-toi sur `/dashboard` avec `coiffeur-test` → tu dois voir **seulement Alice**
5. Déconnecte-toi, reconnecte-toi avec `institut-beaute` → tu dois voir **seulement Bruno**

Si tu vois Alice ET Bruno depuis un compte, l'isolation est cassée — copie-moi ce que tu vois.

### E2. Sécurité

- Ouvre `/dashboard` sans être connecté → doit afficher l'écran de login (pas de fuite de données)
- Sur `/dashboard`, tape un mauvais mot de passe → message "Slug ou mot de passe incorrect."
- Sur `/admin`, tape un mauvais master password → message "Master password incorrect."
- Sur `/?salon=inconnu` → soumets le formulaire → doit refuser "Ce salon n'existe pas."

### E3. SMS toujours fonctionnel

Utilise le vrai numéro de ta copine (le tien est toujours filtré probablement). Retente l'inscription — le SMS doit toujours arriver comme au Sprint 1.

---

## Débogage

- **404 sur `/api/auth/login`** → un fichier `api/auth/login.js` manque sur GitHub. Vérifie que le dossier `api/auth/` est bien uploadé avec les 2 fichiers dedans.
- **500 sur login/create-salon** → Vercel Logs → cherche `[auth/login] error:` ou `[admin/create-salon] error:`. Le plus souvent : nom d'un champ Airtable qui ne matche pas exactement (`Slug` vs `slug`).
- **"Session_SECRET is not configured"** → tu as oublié d'ajouter `SESSION_SECRET` sur Vercel, ou tu ne l'as pas redéployé après.
- **Login OK mais dashboard vide (0 parrain)** alors que tu en as créé des uns au Sprint 1 → normal : les anciens parrains ont un `salon_slug` (`salon-test` par ex) qui ne matche pas ton nouveau salon (`coiffeur-test`). Solution : soit tu recrées un salon avec le slug `salon-test`, soit tu supprimes les anciennes lignes Parrains dans Airtable.
- **Cookie pas persisté (déconnecté à chaque refresh)** → vérifie que ton URL Vercel est bien en HTTPS (obligatoire pour le cookie Secure). En local avec `vercel dev`, ça peut coincer — pas grave pour la prod.

---

## Ce qu'on n'a PAS fait dans ce sprint (rappel)

- **Suivi filleul → parrain** (clics landing, conversions, CA) → Sprint 3
- **Bouton "Prendre RDV" fonctionnel** → Sprint 3
- **QR code téléchargeable + settings salon** → Sprint 4
- **Multi-utilisateurs par salon (rôles)** → hors périmètre V1

Une fois E1/E2/E3 validés → tu me dis "go Sprint 3" et on ferme la boucle parrain → filleul (le sprint le plus important pour ta démo commerciale).
