# Thijs Sterk Portfolio - Live zetten

Dit project is nu uitgerust met een intelligente NAS Folder Scanner.

## 1. Firebase Instellingen
Zorg dat in je [Firebase Console](https://console.firebase.google.com/) het volgende aan staat:
- **Firestore Database:** In productie-modus.
- **Authentication:** Schakel de 'Email/Password' provider in.

## 2. NAS Map Herstellen (Synology)
Als de `web` map op je NAS niet meer toegankelijk is:
1. **Web Station:** Ga naar het Package Center in DSM en zorg dat **Web Station** is geïnstalleerd en actief is. Dit maakt de `web` map aan.
2. **Rechten:** Ga naar Configuratiescherm > Gedeelde map > web > Bewerken > Machtigingen. Geef de groep `http` leesrechten.
3. **HTTP Service:** Controleer in de Web Station app of de standaardservice draait op poort 80/443.

## 3. NAS Map Inlezen in de App
In het `/admin` gedeelte vind je de **NAS Folder Helper**:
1. Koppel je NAS map als een lokale schijf op je computer.
2. Klik op **Scan NAS Map**.
3. Selecteer de map. De app leest nu alle bestanden in en maakt direct werkende links.
4. Ga naar de **Bulk Import** tab om alles met één klik toe te voegen aan je archief.

## 4. Naar GitHub Pushen & Live zetten
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
