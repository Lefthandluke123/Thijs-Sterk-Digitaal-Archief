# Thijs Sterk Retrospectief Portfolio

Dit project is het officiële eerbetoon aan het werk van Thijs Sterk (1913-1982).

## Belangrijke Kenmerken
- **Typografie:** Gebruik van Playfair Display voor een elegante en tijdloze uitstraling.
- **Beveiliging:** Visuele watermerken en blokkade van rechtsklikken op afbeeldingen ter bescherming van het oeuvre.
- **Wachtwoord:** Beheerpaneel (/admin) beveiligd met `gabbes`.
- **Atelier (Beheer):** Ondersteuning voor bulk-uploads via JSON en een interactieve visuele cropper om uitsnedes en helderheid aan te passen.
- **NAS Integratie:** Helper tool om direct mappen van je NAS (bijv. Web Station) te importeren.

## Hoe dit project live te zetten (Delen als App)

### 1. Firebase Services Inschakelen
Ga naar de [Firebase Console](https://console.firebase.google.com/) en zorg dat het volgende aan staat:
- **Firestore Database:** Maak een database aan in 'Production mode'.
- **Authentication:** Schakel de 'Google' provider in (optioneel, wachtwoord `gabbes` werkt via code).

### 2. Maak een nieuwe GitHub Repository aan
Ga naar [github.com/new](https://github.com/new) en maak een lege repository aan (bijv. `thijs-sterk-portfolio`). Voeg GEEN README, license of .gitignore toe op GitHub.

### 3. Push je code naar GitHub
Kopieer deze commando's een voor een in de terminal onderaan dit scherm (vervang de URL door die van jouw nieuwe repo):

```bash
git init
git add .
git commit -m "Initial portfolio setup"
git branch -M main
git remote add origin <JOUW_GITHUB_URL>
git push -u origin main
```

### 4. Firebase App Hosting Live zetten
1. Ga in de Firebase Console naar **Build > App Hosting**.
2. Klik op "Get Started" en verbind je GitHub-account.
3. Selecteer je repository en de `main` branch.
4. Klik op "Next" en laat de instellingen op standaard staan.
5. Zodra het bouwen klaar is, krijg je een live URL die je kunt delen!

## Beheer
Ga naar `/admin` om kunstwerken toe te voegen of aan te passen. 
**Wachtwoord:** `gabbes`