# Setup Sprint 1 — ParrainApp

Guide pas-à-pas pour rendre le nouveau `/api/lead` fonctionnel en production.

Ordre recommandé : **A → B → C → D → E**.

---

## A. Airtable — préparer la table `Parrains`

1. Ouvre ta base Airtable (`appWzruoPWk9psmrx`).
2. L'ancienne table `Clients` : laisse-la de côté (on la supprimera plus tard, elle contient des tests).
3. Clique **+ Add or import** → **Create empty table** → nomme-la exactement **`Parrains`** (avec la majuscule, sans accent).
4. Renomme le champ principal `Name` en `prenom` (icône ✏️ sur l'en-tête de colonne).
5. Ajoute les champs suivants (respecte les noms **exactement**, en minuscules, sans accents) :

| Nom du champ | Type Airtable | Notes |
|---|---|---|
| `prenom` | Single line text | (champ principal, déjà renommé) |
| `telephone` | Phone number | format international attendu (+41…) |
| `salon_slug` | Single line text | provisoire — deviendra un Link → Salons au Sprint 2 |
| `code_court` | Single line text | 6 caractères générés automatiquement |
| `consent_at` | Date | ✅ coche "Include a time field" et "Use the same time zone (GMT) for all collaborators" |
| `consent_ip` | Single line text | preuve LPD |
| `source` | Single select | ajoute l'option `qr_code` (couleur au choix) |
| `created_at` | Created time | auto |

Tu peux ignorer les tables `Salons` et `Filleuls` pour l'instant — elles arrivent aux Sprints 2 et 3.

---

## B. Brevo — vérifier le sender SMS

1. Connecte-toi à https://app.brevo.com
2. Va dans **SMS → Settings → SMS sender name**.
3. Assure-toi qu'un sender **`ParrainApp`** existe (max 11 caractères alphanumériques). Sinon, crée-le.
4. Pour la Suisse : les senders alphanumériques sont acceptés sans démarche supplémentaire, tu n'as rien d'autre à faire.
5. **Recharge ton compte Brevo** en crédits SMS (menu **Buy SMS credits**) — compte ~0.06 CHF par SMS envoyé en Suisse. Un crédit de 20 CHF suffit largement pour tester.

---

## C. Vercel — variables d'environnement

Sur https://vercel.com → ton projet → **Settings → Environment Variables**, ajoute (coche `Production`, `Preview`, `Development` pour chaque) :

```
AIRTABLE_TOKEN=<ton nouveau PAT scopé>
AIRTABLE_BASE_ID=appWzruoPWk9psmrx
BREVO_API_KEY=<ta clé Brevo xkeysib-...>
BREVO_SMS_SENDER=ParrainApp
PUBLIC_BASE_URL=https://parrainapp.vercel.app
```

`SESSION_SECRET` et `MASTER_PASSWORD` ne sont pas nécessaires pour le Sprint 1 (auth arrive au Sprint 2) mais tu peux déjà les préparer :

```
SESSION_SECRET=<32+ caractères random — génère sur https://generate-secret.vercel.app/32>
MASTER_PASSWORD=<un mot de passe fort à toi>
```

⚠️ **Vérifie bien que l'ancien token Airtable (`patvJ5u6oV1Tid...`) a été révoqué** sur https://airtable.com/create/tokens

---

## D. Déploiement

1. **Sync ton dossier local vers ton repo GitHub** (via GitHub Desktop, `git add . && git commit && git push`, ou drag-drop dans l'interface GitHub).
   - Nouveaux fichiers à committer : `package.json`, `vercel.json`, `.gitignore`, `.env.example`, tout le dossier `api/`, `SETUP.md`, `ROADMAP.md`
   - Fichiers modifiés : `index.html`, `parrainage.html`, `dashboard.html`
2. Vercel déclenche automatiquement un build. Regarde le log dans **Deployments**.
3. Le build doit installer `airtable` et `libphonenumber-js` puis publier.

---

## E. Test end-to-end

1. Ouvre `https://parrainapp.vercel.app/?salon=salon-test`
2. Remplis le formulaire avec **ton vrai numéro** (pour recevoir le SMS).
3. Coche le consentement, clique **Je participe**.
4. Attendus :
   - Page de succès affichée (« C'est parti ! »)
   - Nouvel enregistrement dans la table `Parrains` d'Airtable
   - SMS reçu dans les ~30 secondes avec un lien du type `https://parrainapp.vercel.app/parrainage?ref=Killian&salon=salon-test`
   - Le lien ouvre la landing filleul avec ton prénom affiché

**Cas d'erreur à tester** :
- Ré-inscription avec le même numéro + même salon → doit retourner "Tu es déjà inscrit pour ce salon."
- 6 soumissions rapides depuis la même IP → 6ème doit retourner "Trop de tentatives."
- Numéro invalide (`00000000`) → "Numéro de téléphone invalide."

---

## Débogage

- **SMS non reçu mais parrain créé dans Airtable** → problème Brevo. Va dans **Vercel → Deployments → Functions logs** et cherche `[lead] SMS failed`. Souvent : sender name non validé ou crédits SMS épuisés.
- **Erreur 500** → même endroit, cherche `[lead] error`. Le plus souvent : nom de champ Airtable qui ne matche pas exactement (ex: `Prénom` vs `prenom`).
- **Erreur "Salon inconnu."** → le slug dans l'URL contient des caractères invalides. Regex autorisée : `a-z0-9-` uniquement, 2-50 chars.

Une fois le Sprint 1 validé end-to-end en prod, on enchaîne sur le **Sprint 2 (auth + Salons)** pour restaurer le dashboard.
