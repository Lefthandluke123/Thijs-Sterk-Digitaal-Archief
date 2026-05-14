# Thijs Sterk Portfolio - Live zetten

Dit project is nu uitgerust met een intelligente NAS Folder Scanner.

## 1. Firebase Instellingen
Zorg dat in je [Firebase Console](https://console.firebase.google.com/) het volgende aan staat:
- **Firestore Database:** In productie-modus of test-modus.
- **Authentication:** Schakel de 'Email/Password' of 'Google' provider in.

## 2. NAS Map Herstellen (Synology)
Als de `web` map op je NAS niet meer toegankelijk is of als je foutmeldingen krijgt over Apache:

1. **Backend Server Installeren:**
   - Ga naar het **Package Center** in DSM.
   - Zoek naar **Apache HTTP Server 2.4** (of 2.2) en installeer deze.
   - Alternatief: Zorg dat **Nginx** is geïnstalleerd.

2. **Web Station Configureren:**
   - Open de **Web Station** app.
   - Ga naar **Webservice-instellingen** -> **Default Service** -> **Bewerken**.
   - Kies bij **HTTP-back-endserver** voor **Apache** of **Nginx**.
   - Dit zorgt ervoor dat de `web` map weer door de server wordt 'geserveerd'.

3. **Rechten:**
   - Ga naar **Configuratiescherm** > **Gedeelde map** > **web** > **Bewerken** > **Machtigingen**.
   - Geef de groep `http` leesrechten.

## 3. NAS Map Inlezen in de App
In het `/admin` gedeelte vind je de **NAS Folder Helper**:
1. Koppel je NAS map als een lokale schijf op je computer (of selecteer de map direct).
2. Klik op **Scan NAS Map** (werkt in Firefox, Chrome en Edge).
3. De app leest nu alle bestanden in en maakt direct werkende links op basis van je Basis URL (poort 80/443).
4. Gebruik de **Test Link** knop om te zien of een afbeelding opent.
5. Ga naar de **Bulk Import** tab om alles met één klik toe te voegen aan je archief.

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
