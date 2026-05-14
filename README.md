
# Thijs Sterk Portfolio - Live zetten

Dit project is nu uitgerust met een intelligente NAS Folder Scanner en uitgebreide herstelinstructies voor Synology.

## 1. Firebase Instellingen
Zorg dat in je [Firebase Console](https://console.firebase.google.com/) het volgende aan staat:
- **Firestore Database:** In productie-modus of test-modus.
- **Authentication:** Schakel de 'Email/Password' of 'Google' provider in.

## 2. NAS Map Herstellen (Synology DSM 7+)

Als de standaard `web` map niet werkt of "verplaatst" is, volg dan deze stappen om een eigen map te publiceren:

1. **Maak een nieuwe map:**
   - Ga naar **Configuratiescherm** > **Gedeelde map** > **Maken**.
   - Noem de map bijv. `atelier-fotos`.

2. **Rechten toekennen aan 'http' groep:**
   - In het scherm van je nieuwe map, ga naar **Machtigingen**.
   - Verander de dropdown linksboven van "Lokale gebruikers" naar **Lokale groepen**.
   - Zoek de groep `http` en vink **Lezen** aan.
   - Geef ook jezelf (admin) **Lezen/Schrijven** rechten zodat de map zichtbaar wordt in File Station.

3. **Koppel de nieuwe map in Web Station (CRUCIAAL):**
   - Open de app **Web Station** op je NAS.
   - Ga in het linkermenu naar **Webservice** (NIET naar Webportaal).
   - Klik op de knop **Maken** bovenaan.
   - Kies in de lijst voor **Statische website**.
   - Geef een naam (bijv. 'fotos') en selecteer bij **Document-root** de map die je zojuist hebt gemaakt (`atelier-fotos`).
   - Klik op **Voltooien**.

4. **Toegang:**
   - Je foto's zijn nu bereikbaar via `http://[IP-ADRES-NAS]/fotos/naam-van-foto.jpg`.

## 3. Waarom geen Google Drive of Dropbox?
Google Drive en Dropbox zijn niet ontworpen voor direct hosting. De links die zij genereren verwijzen naar een "preview pagina" en niet naar het ruwe afbeeldingsbestand. Hierdoor kan de website de beelden niet inladen. De NAS (of Firebase Storage) is de enige stabiele oplossing.

## 4. NAS Map Inlezen in de App
In het `/admin` gedeelte vind je de **NAS Folder Helper**:
1. Koppel je NAS map als een lokale schijf op je computer.
2. Klik op **Scan NAS Map**.
3. De app leest nu alle bestanden in. Gebruik de **Test Link** knop om te zien of een afbeelding opent.
4. Ga naar de **Bulk Import** tab om alles met één klik toe te voegen aan je archief.
