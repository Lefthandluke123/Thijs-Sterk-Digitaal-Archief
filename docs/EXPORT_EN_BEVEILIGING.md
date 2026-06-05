# Thijs Sterk: Het Digitale Retrospectief - Export & Beveiliging (v2.1)

Dit document bevat de definitieve instructies om uw platform veilig te stellen als de standaard `zip` opdracht niet werkt.

## 1. Broncode Exporteren (De Terminal Methode)

Als `zip` niet wordt herkend, gebruik dan de `tar` opdracht. Deze is tegenwoordig standaard aanwezig op Windows 10/11, macOS en Linux.

**De universele 'TAR' methode (Aanbevolen):**
1. Open de terminal in de editor.
2. Voer het volgende commando uit:
   ```bash
   tar -cvzf backup_retrospectief.tar.gz --exclude="node_modules" --exclude=".next" --exclude=".git" .
   ```
3. Na afloop verschijnt `backup_retrospectief.tar.gz` in uw mappenlijst.
4. Klik met de rechtermuisknop op dit bestand en kies **Download**.

**Voor Windows PowerShell gebruikers:**
Mocht bovenstaande falen, gebruik dan dit specifieke commando:
```powershell
Compress-Archive -Path * -DestinationPath backup_retrospectief.zip -Force
```

## 2. Database & Content (Google Cloud)
De gegevens van uw kunstwerken en de instellingen staan veilig in de cloud, maar een extra kopie is verstandig.
1. Ga naar de [Firebase Console](https://console.firebase.google.com/).
2. Selecteer project: `studio-7311695883-2090f`.
3. Navigeer naar **Firestore Database**.
4. Gebruik de tab **Import/Export** om een back-up te maken naar een Google Cloud Storage bucket.

## 3. Media & Video's
Alle originele bestanden die u via de Bulk Upload heeft toegevoegd, staan in de map **Storage** in de Firebase Console. U kunt deze mappen daar in hun geheel downloaden als ZIP via de web-interface van Google.

---
*Gegenereerd voor de Erven Thijs Sterk - Master Backup Versie 2.1*
