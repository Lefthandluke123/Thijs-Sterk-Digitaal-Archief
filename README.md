# Thijs Sterk Portfolio - Live zetten

Dit project is klaar om live gezet te worden. Volg deze stappen om je portfolio te delen met de wereld.

## 1. Firebase Instellingen
Zorg dat in je [Firebase Console](https://console.firebase.google.com/) het volgende aan staat:
- **Firestore Database:** In productie-modus.
- **Authentication:** Schakel de 'Email/Password' provider in (wachtwoord is `gabbes`).

## 2. Naar GitHub Pushen
Open de terminal in deze studio en voer deze commando's uit:

```bash
git init
git add .
git commit -m "Atelier hersteld met NAS helper"
git branch -M main
git remote add origin https://github.com/JOUW_GEBRUIKERSNAAM/thijs-sterk-portfolio.git
git push -u origin main
```

## 3. App Hosting (Live!)
1. Ga in de Firebase Console naar **App Hosting**.
2. Verbind je GitHub repo.
3. Firebase bouwt nu je site en geeft je een live URL.

## Beheer
- Ga naar `/admin`
- Wachtwoord: `gabbes`
- Gebruik de **NAS Folder Helper** om snel fotos van je NAS toe te voegen.
