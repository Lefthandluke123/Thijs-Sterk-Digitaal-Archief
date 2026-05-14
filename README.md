
# Thijs Sterk Portfolio - Live zetten

Dit project is nu uitgerust met ondersteuning voor zowel Firebase Storage als een eigen NAS.

## 1. Firebase Storage Activeren (AANBEVOLEN)
Firebase Storage is sneller en stabieler dan een NAS voor het tonen van afbeeldingen.
1. Ga naar de [Firebase Console](https://console.firebase.google.com/).
2. Klik in het linkermenu op **Storage**.
3. Klik op **Get Started**.
4. Kies **Start in production mode** en klik op Next.
5. Kies een locatie (bijv. `europe-west3`) en klik op Done.
6. Ga naar de tab **Rules** en zorg dat de regels schrijven toestaan voor geautoriseerde gebruikers, of gebruik de standaard regels voor publieke leesrechten.
7. Gebruik de **Direct Uploaden** tab in het beheerpaneel van de app.

## 2. NAS Map Herstellen (Synology DSM 7+)
Als je toch je eigen NAS wilt gebruiken voor de hosting:

1. **Maak een nieuwe map:**
   - Ga naar **Configuratiescherm** > **Gedeelde map** > **Maken**.
   - Noem de map bijv. `atelier-fotos`.

2. **Rechten toekennen aan 'http' groep:**
   - In het scherm van je nieuwe map, ga naar **Machtigingen**.
   - Verander de dropdown linksboven naar **Lokale groepen**.
   - Zoek de groep `http` en vink **Lezen** aan.
   - Geef ook jezelf (admin) **Lezen/Schrijven** rechten.

3. **Koppel de nieuwe map in Web Station:**
   - Open **Web Station**.
   - Ga naar **Webservice** (NIET naar Webportaal).
   - Klik op **Maken** > **Statische website**.
   - Selecteer de map `atelier-fotos`.

## 3. Waarom Firebase Storage?
Firebase Storage genereert direct werkende links die overal ter wereld snel laden. Google Drive, Dropbox en pCloud doen dit niet; zij sturen bezoekers naar een "preview pagina", wat niet werkt voor een website.

## 4. Beheer
In het `/admin` gedeelte vind je de **Master Editor**. Hiermee kun je:
- Direct uploaden naar de cloud.
- Titels, jaren en tags aanpassen.
- Helderheid en uitsnede (cropping) live bewerken.
- Bladeren met de pijltjestoetsen.
