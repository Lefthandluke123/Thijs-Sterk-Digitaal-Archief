# Thijs Sterk Retrospectief Portfolio

Dit project is het officiële eerbetoon aan het werk van Thijs Sterk (1913-1982). Het bevat een uitgebreide galerie, een persoonlijke curator-omgeving en speciale secties voor de familie en leerling Peter Bes.

## Hoe dit project te publiceren

### 1. Firebase Console Voorbereiding
1. Ga naar de [Firebase Console](https://console.firebase.google.com/project/studio-7311695883-2090f/overview).
2. Zorg dat **Firestore Database** en **Authentication** (Google) zijn ingeschakeld.
3. Het activeren van deze services na het koppelen van billing kan **2 tot 10 minuten** duren.

### 2. Push naar GitHub
Voor **App Hosting** is een GitHub koppeling vereist. Open de terminal onderaan dit scherm en voer deze commando's uit:
```bash
git init
git add .
git commit -m "Finale versie voor publicatie"
git branch -M main
git remote add origin <JOUW_GITHUB_REPO_URL>
git push -u origin main
```

### 3. Firebase App Hosting Live zetten
1. Ga in de Console naar **Build > App Hosting**.
2. Klik op "Get Started" en verbind je GitHub-account.
3. Selecteer je repository en de `main` branch.
4. Firebase bouwt je app automatisch en geeft je een live URL.

## Belangrijke Kenmerken
- **Beveiliging:** Visuele watermerken op alle afbeeldingen en blokkade van rechtsklikken/slepen.
- **SEO:** Metadata volledig geoptimaliseerd voor Google (Schilder van Licht, Ruimte en Water).
- **Beheer:** Beveiligd paneel via `/admin` voor collectiebeheer (Atelier).

## Contact
*   **E-mail:** info@thijssterk.nl
*   **Telefoon:** 06-53716249