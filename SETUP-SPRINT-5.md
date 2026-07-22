# Setup Sprint 5 — Refonte UX (sidebar) + catalogue prestations

Ce que tu déploies :
- Nouvelle navigation SaaS avec **sidebar verticale** et 6 sections (Dashboard, Parrains, Filleuls, Offres, Templates SMS, Paramètres)
- Catalogue de **prestations** (offres) : le salon liste ses services avec prix, réutilisés lors de la validation d'une visite
- Validation d'une visite : dropdown **prestation** (auto-remplit le panier) + **prénom filleul facultatif** + champ **notes**
- Dashboard d'accueil repensé : 4 KPIs + top parrains + dernières visites

Ordre : **A → B → C → D**.

---

## A. Airtable — nouvelle table `Prestations` (2 min)

Ouvre ta base, clique **+ Add or import → Create empty table** → nomme-la exactement **`Prestations`** (majuscule au P).

Renomme le champ principal `Name` en **`nom`**, puis ajoute ces champs :

| Nom du champ | Type Airtable | Notes |
|---|---|---|
| `nom` | Single line text | champ principal, ex : "Coupe couleur" |
| `prix_chf` | Number → Integer | ex : 120 |
| `salon_slug` | Single line text | pour l'isolation multi-tenant |
| `ordre` | Number → Integer | facultatif, pour classer les prestations (0 = premier) |
| `created_at` | Created time | auto |

---

## B. Airtable — ajouter 2 champs à la table `Filleuls` (1 min)

Ouvre la table **Filleuls** (créée au Sprint 3) et ajoute **à la fin** ces 2 champs :

| Nom du champ | Type Airtable | Notes |
|---|---|---|
| `prestation_nom` | Single line text | copie du nom de la prestation choisie au moment de la validation |
| `notes` | Long text | note libre du salon ("cliente rousse cheveux longs") |

Les 2 sont **optionnels** — les visites déjà validées gardent ces champs vides, aucune casse.

---

## C. Push le code sur GitHub

Nouveaux fichiers :
- `assets/app.css`
- `api/dashboard/prestations.js`
- `api/dashboard/filleuls.js`
- `parrains.html`
- `filleuls.html`
- `offres.html`
- `templates.html`
- `SETUP-SPRINT-5.md`

Fichiers modifiés :
- `dashboard.html` (refonte totale — sidebar + overview)
- `settings.html` (refonte — sidebar + section templates retirée)
- `api/dashboard/validate.js` (accepte prestation_id, prénom facultatif, notes)

Push via GitHub Desktop → message `Sprint 5 — sidebar UX + catalogue prestations` → Push origin. Vercel redéploie automatiquement.

⚠️ **Attention important** : le fichier `assets/app.css` doit être dans un dossier `assets/` à la racine du repo. Si GitHub Desktop ne synchronise pas ce dossier (ça arrive quand un dossier est nouveau), tu peux le forcer en créant manuellement `assets/app.css` via l'interface web GitHub (Add file → Create new file → tape `assets/app.css` → colle le contenu).

Pas de nouvelle env var, pas de nouvelle dépendance npm.

---

## D. Tests end-to-end

### D1. Navigation sidebar

1. Va sur `/dashboard` → connecte-toi
2. Tu dois voir une **sidebar à gauche** avec 6 items (Dashboard, Parrains, Filleuls, Offres, Templates SMS, Paramètres)
3. Chaque clic navigue vers la bonne page. L'item actif est surligné en violet.
4. En bas de la sidebar : badge nom du salon + bouton Déconnexion
5. Sur mobile (redimensionne la fenêtre à <900px) : la sidebar disparaît, un bouton hamburger `☰` apparaît en haut à gauche → clique dessus → la sidebar apparaît en overlay.

### D2. Créer des offres

1. Va sur **Offres**
2. Tape `Coupe femme` + `65` → **Ajouter**
3. Ajoute-en 3-4 (ex : Coupe homme 35, Couleur 120, Coupe couleur 150, Brushing 45)
4. Vérifie qu'elles apparaissent dans le tableau
5. **Modifie un prix en cliquant dans la cellule** → change la valeur → clique ailleurs → toast "✓ Mis à jour"
6. Vérifie dans Airtable → table `Prestations` : les lignes sont bien créées avec `salon_slug` correct

### D3. Valider une visite avec prestation

1. Va sur **Parrains** (assure-toi qu'il y a au moins 1 parrain avec un `code_court` valide)
2. Clique **+ Visite** sur la ligne d'un parrain
3. Le modal s'ouvre → tu vois maintenant :
   - Dropdown **Prestation** avec toutes tes offres
   - Panier réalisé (auto)
   - Prénom filleul (facultatif — laisse VIDE volontairement)
   - Notes (facultatif)
4. Choisis "Coupe couleur — 150 CHF" → le champ panier passe automatiquement à **150**
5. Laisse le prénom vide, ajoute une note "test sans prénom"
6. Valide
7. Attendus :
   - Toast vert "✓ Visite validée"
   - SMS de récompense au parrain (sur ta copine)
   - Nouvelle ligne dans Airtable `Filleuls` avec : `prenom = "Anonyme"`, `prestation_nom = "Coupe couleur"`, `panier_chf = 150`, `notes = "test sans prénom"`

### D4. Vérifier l'historique dans Filleuls

1. Va sur **Filleuls**
2. Tu vois le tableau chronologique des visites, avec pour chaque ligne : date, prénom, via quel parrain, prestation, panier, notes
3. En haut : 3 KPIs (total visites, CA cumulé, panier moyen réel)
4. Le "panier moyen réel" affiche la moyenne des paniers effectivement validés (pas le panier moyen théorique)

### D5. Dashboard overview

1. Retourne sur **Dashboard**
2. 4 KPIs : Parrains inscrits, Filleuls venus, CA généré, Panier moyen filleul
3. Section "Top parrains" : classement par CA généré (or/argent/bronze pour top 3)
4. Section "Dernières visites" : les 5 visites les plus récentes avec parrain + montant

### D6. Templates SMS

1. Va sur **Templates SMS**
2. Tu vois les 2 templates (parrain / récompense) + affichage des templates par défaut
3. Personnalise le SMS de récompense en remplaçant `{prenom_filleul}` par `un client` par exemple
4. Enregistre
5. Retourne sur Parrains → refais une validation → vérifie sur ton téléphone que le nouveau template est appliqué

### D7. Isolation multi-tenant (encore)

Crée une offre "Massage" dans un salon B, connecte-toi au salon A → tu ne dois PAS voir "Massage" dans la liste des offres de A. Idem pour les filleuls.

---

## E. Nettoyage optionnel

Fichiers désormais inutiles que tu peux supprimer via GitHub Desktop (clic droit → Delete) :
- `parrainage.html` (remplacé par le rendu SSR du Sprint 3)

Aucun impact — les vieux liens SMS pointaient déjà vers `/r/[code]`.

---

## Débogage

- **404 sur `/api/dashboard/prestations`** → le fichier n'est pas sur GitHub. Vérifie que le dossier `api/dashboard/` contient bien `prestations.js`, `filleuls.js`, `clients.js`, `validate.js`, `settings.js`, `change-password.js`.
- **La sidebar apparaît toute cassée / sans styles** → `assets/app.css` n'est pas déployé. Ouvre `https://parrainapp.vercel.app/assets/app.css` directement → si 404, refait l'upload de ce fichier.
- **Le dropdown "Prestation" est vide dans le modal de validation** → tu n'as pas encore créé d'offres. Va sur `/offres`, ajoute-en une, retente.
- **"Cette prestation n'appartient pas à ton salon."** → tu es connecté au salon A mais tu essaies d'utiliser une prestation du salon B. C'est le mécanisme d'isolation qui bloque, comportement voulu.
- **Le panier ne s'auto-remplit pas quand je choisis une prestation** → recharge la page (cache JS).

---

## Ce que tu as maintenant

Le produit ressemble officiellement à un vrai SaaS moderne. Tu peux ouvrir une démo en disant :

> "Voici votre back-office. À gauche vous naviguez : Dashboard c'est votre vue d'ensemble, Parrains c'est votre liste de clients ambassadeurs, Filleuls c'est l'historique des visites qu'ils vous ont rapportées, Offres c'est votre catalogue de prestations qu'on utilisera quand vous validez une nouvelle visite. Templates SMS pour personnaliser vos messages, Paramètres pour tout le reste. Le tout responsive : ça marche aussi bien depuis la caisse en tablette que depuis votre téléphone."

## Reste avant clôture V1

La seule chose "roadmap V1" qui n'est plus faite : conformité LPD stricte (page /privacy + bouton suppression parrain + export CSV). Optionnel pour la démo commerciale, mais **indispensable si un salon devient payant**.

À ce stade tu es objectivement prêt à démarcher tes premiers pilotes. Fais-le avant de rajouter des features.
