# Thijs Sterk Portfolio - Live zetten

Dit project is nu uitgerust met een intelligente NAS Folder Scanner.

## 1. Firebase Instellingen
Zorg dat in je [Firebase Console](https://console.firebase.google.com/) het volgende aan staat:
- **Firestore Database:** In productie-modus of test-modus.
- **Authentication:** Schakel de 'Email/Password' of 'Google' provider in.

## 2. NAS Map Herstellen (Synology)
Als de `web` map wel bestaat op je NAS, maar niet zichtbaar is in File Station:

1. **Rechten toekennen (Zichtbaar maken):**
   - Ga naar **Configuratiescherm** > **Gedeelde map**.
   - Selecteer de map `web` en klik op **Bewerken**.
   - Ga naar het tabblad **Machtigingen**.
   - Zoek je eigen gebruikersnaam (bijv. 'admin') en zorg dat het vinkje bij **Lezen/Schrijven** aan staat. Klik op Opslaan. Nu verschijnt de map in File Station.

2. **Backend Server Configureren:**
   - Ga naar het **Package Center** en installeer **Apache HTTP Server 2.4**.
   - Open de **Web Station** app.
   - Ga naar **Webservice-instellingen** -> **Default Service** -> **Bewerken**.
   - Kies bij **HTTP-back-endserver** voor de zojuist geïnstalleerde Apache of Nginx.

3. **Rechten voor de website (Technisch):**
   - Zorg dat in **Configuratiescherm** > **Gedeelde map** > **web** > **Bewerken** > **Machtigingen** de groep `http` op minimaal **Lezen** staat.

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
