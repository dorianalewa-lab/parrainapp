# Setup Sprint 6 — Bon voucher QR + scan native caméra

Ce que tu déploies :
- Sur la landing filleul `/r/[code]` : nouveau bloc **🎁 Ton bon de recommandation** avec un QR code que le filleul montre au salon
- Nouvelle page **`/scan?code=xxx`** : quand le coiffeur scanne le QR avec l'app Caméra native de son téléphone, il atterrit directement sur cette page pré-remplie pour valider la visite en 3 clics
- Après un scan avec un salon non connecté : page d'invitation à se connecter, puis retour automatique sur la page de validation post-login

**Aucune modification Airtable** requise. **Aucune nouvelle fonction serverless** (on reste à 12 pile).

Ordre : **A → B**.

---

## A. Push le code sur GitHub

Nouveaux fichiers :
- `scan.html`
- `SETUP-SPRINT-6.md`

Fichiers modifiés :
- `api/track/landing.js` (ajoute le QR voucher)
- `dashboard.html` (gestion `sessionStorage['after_login']` pour rediriger vers `/scan?code=xxx` après login)

Push via GitHub Desktop → message `Sprint 6 — QR voucher + scan native camera flow` → Push origin. Vercel redéploie automatiquement en 1-2 min (pas de nouvelle dépendance).

---

## B. Tests end-to-end

### B1. Le QR apparaît sur la landing filleul

1. Depuis le formulaire d'inscription parrain, inscris un nouveau parrain (numéro de ta copine)
2. Elle reçoit le SMS avec le lien `parrainapp.vercel.app/r/xxxxxx`
3. Ouvre ce lien sur ton téléphone (ou n'importe où)
4. Attendus :
   - Le premier bloc reste comme avant (recommandation + bouton "Prendre rendez-vous")
   - **Nouveau bloc en dessous** : encadré en pointillés violet avec titre "🎁 Ton bon de recommandation" + un gros QR code + les 4 étapes d'utilisation

Astuce : le QR code encode `parrainapp.vercel.app/scan?code=xxxxxx`. Tu peux le vérifier en le scannant avec ton téléphone → tu dois arriver sur la page /scan.

### B2. Setup coiffeur (une fois par téléphone, 30 sec)

1. **Sur ton iPhone/Android** (fais comme si tu étais le coiffeur), ouvre Safari/Chrome
2. Va sur `https://parrainapp.vercel.app/dashboard`
3. Connecte-toi avec les identifiants d'un salon
4. Ne ferme pas Safari (le cookie de session est actif 30 jours)
5. **Optionnel — ajoute à l'écran d'accueil pour un raccourci d'app** :
   - iOS : bouton de partage → "Sur l'écran d'accueil"
   - Android Chrome : menu ⋮ → "Ajouter à l'écran d'accueil"

### B3. Scan natif = flow complet

1. **Sur le téléphone du "coiffeur"** (celui qui vient d'être connecté), ferme le navigateur
2. Ouvre l'app **Caméra native** (l'app par défaut d'iOS ou Android)
3. Pointe la caméra vers le QR de la landing filleul (soit imprimé, soit affiché sur un autre écran)
4. Une notification apparaît dans la caméra du style "Ouvrir dans Safari" ou avec l'URL détectée
5. Tape dessus
6. Safari s'ouvre sur `/scan?code=xxxxxx` → puis quasi-immédiatement :
   - Icône verte ✓
   - Titre "Bon valide"
   - Encadré violet "Bon reçu de **Julie**"
   - Dropdown "Prestation" avec tes offres
   - Panier auto-rempli
   - Gros bouton vert **"Valider la visite ✓"**
7. Choisis une prestation → panier se met à jour → clique **Valider**
8. Attendus :
   - Écran de succès "Visite enregistrée ! SMS de récompense envoyé au parrain."
   - Bouton "Scanner un autre bon" pour enchaîner
   - Nouvelle ligne dans Airtable `Filleuls` avec les bonnes valeurs
   - SMS reçu par le parrain (ta copine)

**Total : 3 taps** après ouverture de la caméra.

### B4. Cas erreurs

- **QR d'un autre salon** : je crée un salon B, j'inscris un parrain chez B, je scanne son QR avec le compte coiffeur du salon A → doit afficher "Code invalide — Aucun parrain avec le code xxxx chez [Nom salon A]"
- **QR corrompu / URL malformée** : `/scan?code=abc` → "Format de code invalide"
- **Coiffeur non connecté** : ouvre `/scan?code=xxxxx` en navigation privée (aucun cookie) → doit afficher :
  - Cadenas 🔒
  - "Ce bon doit être scanné par le salon"
  - Bouton "Je suis le salon — me connecter"
  - Clic → dashboard.html → login → **redirection automatique vers `/scan?code=xxxxx`** (le sessionStorage joue son rôle) → validation form

### B5. Sans code (page /scan directe)

Va sur `parrainapp.vercel.app/scan` sans paramètre → affiche une page d'instructions "Ouvre l'app Caméra pour scanner un bon" avec bouton retour dashboard. Utile si le coiffeur clique sur le lien par erreur.

---

## Ce que tu vends maintenant

Ton flow client → filleul → salon est complet et fluide. Le pitch commercial devient :

> "Le client s'inscrit une fois en scannant votre QR en caisse. Il reçoit un SMS avec son bon personnel. Il l'envoie à ses amis. Quand un ami vient chez vous, il vous montre le QR sur son téléphone. Vous ouvrez votre app Caméra, vous scannez, la page s'ouvre : 'Bon reçu de Julie', vous cliquez la prestation, vous validez. En 5 secondes chrono. Julie reçoit un SMS 'Merci, vous avez gagné 10 CHF de bon'. Vous, vous avez trackée une nouvelle visite avec son CA. Rien de plus."

C'est un vrai différenciateur vs les concurrents qui restent en formulaire manuel.

---

## Débogage

- **Le QR n'apparaît pas sur la landing** → le fichier `api/track/landing.js` n'est peut-être pas à jour sur GitHub. Vérifie que ta commit inclut bien ce fichier modifié.
- **Erreur 500 sur la landing** → Vercel Logs, cherche `[landing] QR generation failed` (rare, mais possible si le package `qrcode` n'est pas installé — normalement il l'est depuis Sprint 4).
- **Scan native ouvre la page mais reste bloquée en "Vérification du code…"** → problème réseau ou l'appel à `/api/dashboard/clients` échoue. Ouvre DevTools sur mobile (via Safari Remote Debug si iOS, chrome://inspect si Android) et regarde l'onglet Network.
- **Le cookie de session ne persiste pas** → sur iOS, Safari respecte le flag `Secure` du cookie et exige HTTPS. On est en HTTPS partout donc ça doit marcher. Si problème persistant, vérifie les réglages de Safari → Préférences → Confidentialité → autorise les cookies tiers pour parrainapp.vercel.app.
- **Après login sur mon phone, il ne me redirige pas vers /scan** → le sessionStorage a peut-être été vidé entre-temps (rare en Safari mobile). Retest, ou revient manuellement sur `/scan?code=xxx`.

---

## Ce qui reste dans la roadmap V1

- Conformité LPD (page /privacy + bouton suppression parrain + export CSV) — utile si un salon devient payant
- Registres légaux et CGU/CGV pour transformer la démo en offre commerciale

Ces sujets deviennent pertinents au moment où un salon dit "OK, je paie combien ?". Tant qu'on est en pilote gratuit, secondaire.

Tu es maintenant **objectivement prêt** à faire des démos qui claquent.
