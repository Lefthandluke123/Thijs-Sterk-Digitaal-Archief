# Thijs Sterk: Het Digitale Retrospectief - Export & Beveiliging (v2.6)

Dit document bevat de definitieve instructies om uw platform en broncode veilig te stellen.

## 1. De Hoofdmap Vinden
De hoofdmap is de map waar alle andere mappen (`src`, `docs`, `public`) in staan.
1. Open de **Terminal** (onderaan het scherm).
2. Type `pwd` en druk op Enter. De output moet eindigen op uw projectnaam.
3. Type `ls` en druk op Enter. U moet de map `src` zien staan. Als u die ziet, bent u in de hoofdmap.

## 2. Broncode Exporteren (Harde Back-up)

Gebruik het `tar` commando. Dit is de meest betrouwbare methode in deze omgeving en voorkomt fouten met systeembestanden.

**Stap-voor-stap:**
1. Kopieer en plak dit commando in de terminal:
   ```bash
   tar -cvzf retrospectief_v2_totaal.tar.gz --exclude="node_modules" --exclude=".next" --exclude=".git" --exclude="ntuser.dat*" .
   ```
2. Wacht tot het proces klaar is.
3. In de mappenlijst links verschijnt nu `retrospectief_v2_totaal.tar.gz`.
4. Klik met de **rechtermuisknop** op dit bestand en kies **Download**.

**Voor Windows gebruikers (alternatief via PowerShell):**
```powershell
Compress-Archive -Path src, public, docs, next.config.ts, package.json, tailwind.config.ts -DestinationPath retrospectief_backup.zip -Force
```

## 3. Database Beveiligen (Cloud)
De gegevens (titels, omschrijvingen, zalen) staan in de Firebase Cloud.
1. Ga naar de [Firebase Console](https://console.firebase.google.com/).
2. Selecteer uw project.
3. Ga naar **Firestore Database**.
4. Kies de tab **Import/Export** om een back-up naar Google Cloud Storage te maken.

---
*Gegenereerd voor de Erven Thijs Sterk - Master Backup Versie 2.6*
