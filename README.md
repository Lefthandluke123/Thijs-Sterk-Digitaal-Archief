# Thijs Sterk Retrospectief Portfolio

Dit project is het officiële eerbetoon aan het werk van Thijs Sterk (1913-1982).

## Belangrijke Kenmerken
- **Typografie:** Gebruik van Playfair Display voor een elegante en tijdloze uitstraling.
- **Beveiliging:** Visuele watermerken en blokkade van rechtsklikken op afbeeldingen ter bescherming van het oeuvre.
- **Wachtwoord:** Beheerpaneel (/admin) beveiligd met `gabbes`.

## Hoe dit project live te zetten

### 1. Maak een nieuwe GitHub Repository aan
Ga naar [github.com/new](https://github.com/new) en maak een lege repository aan (bijv. `thijs-sterk-portfolio`).

### 2. Push je code naar GitHub
Kopieer deze commando's in de terminal onderaan dit scherm (vervang de URL door die van jouw nieuwe repo):

```bash
git init
git add .
git commit -m "Initial portfolio setup"
git branch -M main
git remote add origin <JOUW_GITHUB_URL>
git push -u origin main
```

### 3. Firebase App Hosting Live zetten
1. Ga in de Firebase Console naar **Build > App Hosting**.
2. Klik op "Get Started" en verbind je GitHub-account.
3. Selecteer je repository en de `main` branch.
4. Firebase bouwt je app automatisch. Zodra dit klaar is, krijg je een live URL die je kunt delen!

## Beheer
Ga naar `/admin` om kunstwerken toe te voegen of aan te passen. 
**Wachtwoord:** `gabbes`
