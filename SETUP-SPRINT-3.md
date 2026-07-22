# Setup Sprint 3 — Tracking parrain → filleul + CA

Ce que tu déploies :
- Nouveaux liens SMS courts `/r/[code]` avec tracking server-side (compteurs clics / clics RDV)
- Bouton "Prendre RDV" qui redirige vers le site du salon (booking_url) tout en trackant
- Bouton "+ Filleul venu" dans le dashboard pour valider une visite → crée un Filleul + envoie le SMS de récompense au parrain
- Calcul du CA généré par parrain et total salon

Ordre : **A → B → C → D → E**.

---

## A. Airtable — ajouter 2 champs à la table `Parrains`

Ouvre ta table **Parrains** et ajoute **2 nouveaux champs à la fin** (respecte les noms exacts) :

| Nom du champ | Type Airtable | Notes |
|---|---|---|
| `nb_clics_landing` | Number → Integer | valeur par défaut : 0 |
| `nb_clics_rdv` | Number → Integer | valeur par défaut : 0 |

Astuce : quand tu crées un champ Number, dans **Format** choisis **Integer**, et dans **Default value** mets **0** — ça évite que les enregistrements existants aient `null` (ce qui casserait l'affichage des compteurs).

Si tu as déjà des Parrains créés lors des sprints précédents, ils vont avoir des cellules vides pour ces champs — pas grave, le code affiche `0` par défaut.

---

## B. Airtable — créer la table `Filleuls`

Nouvelle table à créer **exactement** avec ce nom : **`Filleuls`**.

Renomme le champ principal en `parrain_code`, puis ajoute les autres :

| Nom du champ | Type Airtable | Notes |
|---|---|---|
| `parrain_code` | Single line text | champ principal, code court du parrain (ex `k3n7pq`) |
| `salon_slug` | Single line text | slug du salon — pour l'isolation multi-tenant |
| `prenom` | Single line text | prénom du filleul, saisi par le salon à la validation |
| `panier_chf` | Number → Integer | montant réel dépensé (CHF) |
| `visited_at` | Date | ✅ coche **Include a time field** + **Use the same time zone (GMT) for all collaborators** |
| `created_at` | Created time | auto |

---

## C. Push le code sur GitHub

Fichiers nouveaux :
- `api/track/landing.js`
- `api/track/rdv.js`
- `api/dashboard/validate.js`
- `SETUP-SPRINT-3.md`

Fichiers modifiés :
- `vercel.json` (rewrite `/r/:code`)
- `api/_lib/airtable.js` (nouveaux helpers)
- `api/lead.js` (lien SMS raccourci en `/r/[code]`)
- `api/dashboard/clients.js` (enrichi avec filleuls + CA)
- `dashboard.html` (colonnes tracking + modal validation)

Push via GitHub Desktop → écris un message de commit du style `Sprint 3 — tracking filleuls + CA` → Push origin → Vercel redéploie automatiquement.

---

## D. Tester le flow complet end-to-end

### D1. Inscription parrain avec nouveau lien SMS

1. Ouvre `https://parrainapp.vercel.app/?salon=<slug-d-un-salon-existant>` (celui que tu as créé au Sprint 2 avec un `booking_url` configuré !)
2. Inscris un parrain avec le numéro de ta copine (le tien est toujours filtré)
3. Elle doit recevoir un SMS avec un lien du type `https://parrainapp.vercel.app/r/k3n7pq` (6 caractères après `/r/`)

Si le lien reçu est encore `/parrainage?ref=...` → le déploiement Vercel n'a pas encore repris le nouveau `api/lead.js`. Attends 1-2 min, redemande une inscription.

### D2. Ouverture du lien = tracking

1. Ouvre le lien reçu par SMS depuis n'importe quel navigateur (mobile, ordi, navigation privée peu importe)
2. La landing s'affiche avec : prénom du parrain, nom du salon, pourcentage de réduction
3. Va dans Airtable → table `Parrains` → cherche la ligne du parrain → **`nb_clics_landing` doit être passé à 1**
4. Rafraîchis la landing 3 fois → le compteur doit passer à 4

### D3. Clic sur "Prendre RDV" = tracking + redirection

1. Sur la landing, clique **Prendre rendez-vous →**
2. Tu dois être redirigé vers l'URL configurée dans le salon (`booking_url`)
3. Airtable → `nb_clics_rdv` du parrain doit être passé à 1

Si tu vois "Ton salon te contactera bientôt" au lieu du bouton → le champ `booking_url` du salon est vide dans Airtable. Édite le salon ou recrée-le via `/admin`.

### D4. Validation d'un filleul depuis le dashboard

1. Va sur `https://parrainapp.vercel.app/dashboard` → connecte-toi avec le salon
2. Sur la ligne du parrain → clique **+ Filleul venu**
3. Modal s'ouvre → tape un prénom (ex "Marie") + un panier (ex 80) → **Valider**
4. Attendus :
   - Toast vert "✓ Filleul validé, SMS envoyé"
   - Nouvelle ligne dans la table `Filleuls` Airtable (`parrain_code` = code du parrain, `panier_chf` = 80)
   - Colonne **Filleuls** de la ligne parrain passe à 1, colonne **CA** passe à 80 CHF
   - Le SMS de récompense arrive sur le numéro de ta copine

### D5. Stats globales

En haut du dashboard : `Filleuls venus` et `CA généré` doivent refléter la totalité des filleuls validés sur ce salon.

### D6. Isolation multi-tenant (encore)

Crée un filleul dans le salon A, connecte-toi au salon B → tu ne dois voir aucun filleul du salon A dans le dashboard B.

---

## E. Nettoyage optionnel

- `parrainage.html` existe encore à la racine — c'est l'ancienne landing statique. Elle n'est plus utilisée par les nouveaux SMS mais reste accessible via son URL directe. Tu peux la supprimer via GitHub Desktop (clic droit → Delete) ou la laisser en attendant le Sprint 5.
- Si tu as des anciens parrains créés lors des Sprints 1-2 sans `code_court`, leurs liens ne fonctionneront pas. Tu peux les supprimer d'Airtable pour repartir sur des données propres.

---

## Débogage

- **Le lien SMS mène à `/parrainage?ref=...`** → Vercel n'a pas encore déployé `api/lead.js` mis à jour. Attends ou force un redeploy manuel.
- **404 sur `/r/[code]`** → le rewrite dans `vercel.json` n'est pas actif, ou le dossier `api/track/` n'est pas sur GitHub. Vérifie que `vercel.json` contient bien la section `rewrites`.
- **Landing s'affiche mais compteur n'augmente pas** → probablement un nom de champ Airtable différent de `nb_clics_landing` (respecte la casse). Regarde les Vercel Logs, cherche `[incrementCounter]`.
- **"Ce parrain n'appartient pas à ton salon."** au moment de valider un filleul → le `salon_slug` du parrain diverge du salon connecté (peut arriver si tu as édité manuellement le parrain dans Airtable).
- **SMS récompense pas reçu** → même souci que Sprint 1 (opérateur suisse filtrant). Le filleul est bien créé, seul le SMS échoue. Regarde `[validate] SMS récompense failed:` dans les logs.

---

## Ce qu'on n'a PAS fait dans ce sprint

- Page **admin.html enrichie** avec QR code téléchargeable → Sprint 4
- Page **réglages salon** (le salon peut modifier lui-même son booking_url, panier moyen, templates SMS) → Sprint 4
- **Politique de confidentialité** + bouton suppression parrain LPD → Sprint 5
- **Export CSV** des parrains/filleuls → Sprint 5

Une fois D1 à D6 validés → ta démo commerciale est **complètement crédible**. Tu peux ouvrir un rdv avec un patron de salon et lui faire une démo live du parcours complet.
