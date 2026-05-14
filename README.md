# Thijs Sterk Portfolio - Live zetten

Dit project is nu uitgerust met een intelligente NAS Folder Scanner.

## 1. Firebase Instellingen
Zorg dat in je [Firebase Console](https://console.firebase.google.com/) het volgende aan staat:
- **Firestore Database:** In productie-modus.
- **Authentication:** Schakel de 'Email/Password' provider in (wachtwoord is `gabbes`).

## 2. NAS Map Inlezen
In het `/admin` gedeelte (wachtwoord: `gabbes`) vind je de **NAS Folder Helper**:
1. Koppel je NAS map als een lokale schijf op je computer.
2. Klik op **Scan NAS Map**.
3. Selecteer de map. De app leest nu alle bestanden in en maakt direct werkende links.
4. Ga naar de **Bulk Import** tab om alles met één klik toe te voegen aan je archief.

## 3. Naar GitHub Pushen & Live zetten
Open de terminal in deze studio en voer deze commando's uit:

```bash
git init
git add .
git commit -m "Atelier hersteld met automatische map scanner"
git branch -M main
git remote add origin https://github.com/JOUW_GEBRUIKERSNAAM/thijs-sterk-portfolio.git
git push -u origin main
```

Ga daarna in de Firebase Console naar **App Hosting** en verbind je GitHub repo om de site live te zetten.
