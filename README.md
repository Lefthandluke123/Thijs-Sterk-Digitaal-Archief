# Thijs Sterk Retrospectief Portfolio

Dit project is het officiële eerbetoon aan het werk van Thijs Sterk (1913-1982).

## Belangrijke Kenmerken
- **Typografie:** Gebruik van Playfair Display voor een elegante en tijdloze uitstraling.
- **Beveiliging:** Visuele watermerken en blokkade van rechtsklikken op afbeeldingen ter bescherming van het oeuvre.
- **Wachtwoord:** Beheerpaneel (/admin) beveiligd met `gabbes`.

## Hoe dit project live te zetten

### 1. Push naar GitHub
Kopieer deze commando's in de terminal onderaan dit scherm om je code naar je nieuwe repository te sturen:

```bash
git init
git add .
git commit -m "Update met Playfair Display en wachtwoordbeveiliging"
git branch -M main
git remote add origin <PLAK_HIER_DE_URL_VAN_JE_NIEUWE_GITHUB_REPO>
git push -u origin main
```

### 2. Firebase App Hosting Live zetten
1. Ga in de Firebase Console naar **Build > App Hosting**.
2. Klik op "Get Started" en verbind je GitHub-account.
3. Selecteer je repository en de `main` branch.
4. Firebase bouwt je app automatisch. Dit duurt enkele minuten.

## Beheer
Ga naar `/admin` om kunstwerken toe te voegen of aan te passen. 
**Wachtwoord:** `gabbes`
