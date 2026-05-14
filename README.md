# Thijs Sterk Portfolio - Live zetten

Dit project is nu uitgerust met een intelligente NAS Folder Scanner.

## 1. Firebase Instellingen
Zorg dat in je [Firebase Console](https://console.firebase.google.com/) het volgende aan staat:
- **Firestore Database:** In productie-modus of test-modus.
- **Authentication:** Schakel de 'Email/Password' of 'Google' provider in.

## 2. NAS Map Herstellen (Synology)
Als de `web` map op je NAS niet meer zichtbaar is in File Station:

1. **Map handmatig aanmaken:**
   - Ga naar **Configuratiescherm** > **Gedeelde map**.
   - Klik op **Maken** > **Maken**.
   - Voer bij Naam exact `web` in.
   - Klik op Volgende tot je bij **Machtigingen** bent.
   - Zoek de groep `http` en geef deze **Lezen/Schrijven** rechten.

2. **Backend Server Configureren:**
   - Ga naar het **Package Center** en installeer **Apache HTTP Server 2.4**.
   - Open de **Web Station** app.
   - Ga naar **Webservice-instellingen** -> **Default Service** -> **Bewerken**.
   - Kies bij **HTTP-back-endserver** voor de zojuist geïnstalleerde Apache of Nginx.

3. **Rechten controleren:**
   - Zorg dat in **Configuratiescherm** > **Gedeelde map** > **web** > **Bewerken** > **Machtigingen** de groep `http` echt op 'Lezen' staat.

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
