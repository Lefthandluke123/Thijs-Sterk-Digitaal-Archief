# Thijs Sterk: Het Digitale Retrospectief - Export & Beveiliging (v2.6)

Dit document bevat de definitieve instructies om uw platform en broncode veilig te stellen.

## 1. De Map 'src' en de Hoofdmap Vinden
De **hoofdmap** is de "vader" van alle andere mappen. Hierin staan de mappen `src`, `docs` en `public`.

### In de Mappenlijst (links):
Kijk naar de lijst aan de linkerkant van uw scherm. De map met de naam **src** staat daar prominent tussen. Als u op het pijltje ernaast klikt, ziet u de onderdelen zoals `app`, `components` en `lib`.

### In de Terminal (onderaan):
1. Open de **Terminal**.
2. Type `ls` en druk op Enter.
3. U ziet nu een lijstje met namen. Als daar `src` bij staat, bent u in de juiste map (de hoofdmap).
4. Type `pwd` om het volledige pad te zien.

## 2. Broncode Exporteren (Harde Back-up)

Gebruik het `tar` commando. Dit is de meest betrouwbare methode in deze omgeving en voorkomt fouten met systeembestanden (zoals ntuser.dat).

**Stap-voor-stap:**
1. Zorg dat u in de hoofdmap bent (zie stap 1).
2. Kopieer en plak dit commando exact in de terminal:
   ```bash
   tar -cvzf retrospectief_v2_totaal.tar.gz --exclude="node_modules" --exclude=".next" --exclude=".git" --exclude="ntuser.dat*" .
   ```
3. Wacht tot het proces klaar is. Er verschijnen veel regels met bestandsnamen.
4. In de mappenlijst links verschijnt nu een nieuw bestand: `retrospectief_v2_totaal.tar.gz`.
5. Klik met de **rechtermuisknop** op dit bestand en kies **Download**.

**Voor Windows gebruikers (alternatief via PowerShell):**
Als de terminal `tar` niet herkent, gebruik dan dit in PowerShell:
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
