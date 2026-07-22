# Setup Sprint 4 — QR téléchargeable + réglages salon self-service

Ce que tu déploies :
- Génération server-side de QR codes (SVG + PNG) via `/api/qr?slug=xxx`
- Page **/settings** où chaque salon règle lui-même son booking_url, panier moyen, réduction, templates SMS et mot de passe
- QR code affiché + boutons de téléchargement dans `/admin` après création d'un salon
- Bouton **⚙️ Réglages** ajouté dans la topbar du dashboard

**Aucun changement Airtable requis** pour ce sprint. Tout est déjà en place depuis Sprint 2.

Ordre : **A → B → C**.

---

## A. Push le code sur GitHub

Nouveaux fichiers :
- `api/qr.js`
- `api/dashboard/settings.js`
- `api/dashboard/change-password.js`
- `settings.html`
- `SETUP-SPRINT-4.md`

Fichiers modifiés :
- `package.json` (ajout de `qrcode`)
- `dashboard.html` (lien ⚙️ Réglages)
- `admin.html` (QR + boutons download après création)

Push via GitHub Desktop → message de commit `Sprint 4 — QR + settings self-service` → Push origin.

Vercel va installer `qrcode` (~1 Mo) + redéployer. Compte 1-2 min.

---

## B. Tests end-to-end

### B1. QR code via /admin (rapide)

1. Ouvre `https://parrainapp.vercel.app/admin`
2. Master password + crée un salon test (ex : `test-qr`)
3. Après création, tu dois voir le **QR code affiché en bas de l'encadré vert** + 2 boutons "Télécharger SVG" / "Télécharger PNG"
4. Clique **Télécharger PNG** → un fichier `parrainapp-qr-test-qr.png` est téléchargé
5. Scanne ce QR avec ton téléphone → tu dois arriver sur `https://parrainapp.vercel.app/?salon=test-qr`

### B2. Page réglages salon

1. Connecte-toi sur `/dashboard` avec un salon existant
2. Clique le bouton **⚙️ Réglages** dans la topbar → tu arrives sur `/settings`
3. Tu vois 4 sections :
   - **QR code** (avec preview + downloads)
   - **Réglages généraux** (nom, booking_url, panier, %, récompense)
   - **Templates SMS** (parrain + récompense)
   - **Mot de passe** (danger zone)

### B3. Modifier un réglage général

1. Change le **panier moyen** de `65` à `80` → clique **Enregistrer**
2. Message vert "✓ Enregistré" apparaît
3. Va vérifier dans Airtable → table `Salons` → la ligne du salon doit avoir `panier_moyen_chf = 80`
4. Retourne sur le dashboard → ouvre le modal "+ Filleul venu" → le champ panier est pré-rempli à **80**

### B4. Modifier un template SMS

1. Dans la section "Templates SMS", tape dans **SMS d'inscription parrain** :
   ```
   Coucou {prenom} ! Ton lien pour recommander {salon} : {lien}
   ```
2. Enregistre → "✓ Enregistré"
3. Va sur `/?salon=<slug>` → inscris un parrain avec le numéro de ta copine
4. Elle doit recevoir un SMS avec le nouveau template. Vérifie que `{prenom}` `{salon}` `{lien}` sont bien remplacés par les vraies valeurs.

⚠️ **Attention** : la variable `{lien}` est obligatoire dans le template parrain. Si tu l'oublies, le formulaire refuse de sauvegarder avec le message "Template SMS parrain doit inclure {lien}".

### B5. Changer le mot de passe

1. Section "Mot de passe" (encadré rouge) → tape ton mot de passe actuel + un nouveau (min 8 chars)
2. Enregistre → "✓ Mot de passe mis à jour"
3. Déconnecte-toi
4. Reconnecte-toi avec l'**ancien** mot de passe → doit être refusé
5. Reconnecte-toi avec le **nouveau** → doit fonctionner

### B6. QR côté salon (bonus)

Sur `/settings`, teste les 2 boutons de téléchargement. Vérifie que :
- Le SVG s'ouvre proprement dans un navigateur
- Le PNG s'ouvre proprement (double-clic sur le fichier téléchargé)
- Les 2 QR codes contiennent la même URL (scanne avec ton téléphone pour comparer)

---

## C. Ce que tu peux maintenant vendre

À ce stade, la démo devient totalement autonome pour le salon :

> "Vous cliquez ici pour télécharger votre QR code, vous l'imprimez et le mettez en caisse. Vous configurez ici votre URL de rendez-vous, votre panier moyen, votre récompense parrain. Vous pouvez même personnaliser le SMS qu'on envoie de votre part. Le mot de passe est modifiable ici. Zéro appui sur moi."

Tu peux prendre 2 CHF de logo par mois de plus pour vendre "l'autonomie".

---

## Débogage

- **QR ne s'affiche pas** → vérifie que `api/qr.js` est bien sur GitHub. Ouvre directement `https://parrainapp.vercel.app/api/qr?slug=coiffeur-jean` → tu dois voir le QR en direct.
- **500 sur `/api/qr`** → probablement `qrcode` pas installé (Vercel build a échoué). Regarde les logs Deployments.
- **Template SMS refuse d'enregistrer** → soit tu as oublié `{lien}` dans le template parrain, soit tu dépasses 500 caractères.
- **Après changement de mot de passe je peux toujours me connecter avec l'ancien** → Vercel n'a peut-être pas déployé `change-password.js`. Vérifie sur GitHub que le fichier existe bien dans `api/dashboard/`.
- **QR téléchargé pointe vers `undefined`** → la variable `PUBLIC_BASE_URL` n'est pas configurée dans Vercel. Va la vérifier dans Settings → Environment Variables.

---

## Reste avant clôture V1

Le seul sprint qui reste dans la roadmap initiale : **Sprint 5 — polish LPD**. Contenu :
- Politique de confidentialité (page `/privacy`)
- Bouton "Supprimer ce parrain" dans le dashboard (droit à l'effacement LPD)
- Export CSV parrains + filleuls
- Nettoyage responsive
- Petit README PDF pour les salons

Ou tu peux aussi t'arrêter là et démarcher tes salons pilotes — la V1 est déjà largement démontrable et vendable.
