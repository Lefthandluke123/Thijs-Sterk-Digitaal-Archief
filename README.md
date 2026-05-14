# Thijs Sterk Retrospectief Portfolio

Dit project is het officiële eerbetoon aan het werk van Thijs Sterk (1913-1982). Het bevat een uitgebreide galerie, een persoonlijke curator-omgeving en speciale secties voor de familie en leerling Peter Bes.

## Hoe dit project live te zetten

### 1. Firebase Console Voorbereiding
1. Ga naar de [Firebase Console](https://console.firebase.google.com/project/studio-7311695883-2090f/overview).
2. Zorg dat **Firestore Database** en **Authentication** (Google) zijn ingeschakeld.
3. Het activeren van deze services kan **2 tot 10 minuten** duren nadat billing is gekoppeld.

### 2. Push naar GitHub (Je nieuwe repo)
Kopieer deze commando's in de terminal onderaan dit scherm om je code naar je nieuwe repository te sturen:

```bash
git init
git add .
git commit -m "Finale versie voor publicatie met Playfair Display"
git branch -M main
git remote add origin <PLAK_HIER_DE_URL_VAN_JE_GITHUB_REPO>
git push -u origin main
```

### 3. Firebase App Hosting Live zetten
1. Ga in de Firebase Console naar **Build > App Hosting**.
2. Klik op "Get Started" en verbind je GitHub-account.
3. Selecteer de repository die je zojuist hebt gevuld en de `main` branch.
4. Firebase bouwt je app automatisch en geeft je een live URL (bijv. thijssterk.web.app).

## Belangrijke Kenmerken
- **Typografie:** Gebruik van Playfair Display voor een elegante, tijdloze uitstraling.
- **Beveiliging:** Visuele watermerken op alle kunstwerken en blokkade van rechtsklikken/slepen.
- **SEO:** Metadata volledig geoptimaliseerd voor Google (Schilder van Licht, Ruimte en Water).
- **Beheer:** Beveiligd paneel via `/admin` voor collectiebeheer (Atelier).

## Contact
*   **E-mail:** info@thijssterk.nl
*   **Telefoon:** 06-53716249
