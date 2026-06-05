# Thijs Sterk: Het Digitale Retrospectief - Export & Beveiliging (v2.2)

Dit document bevat de definitieve instructies om uw platform veilig te stellen. De fout 'permission denied' op ntuser.dat betekent dat u probeert systeembestanden van Windows te zippen; gebruik onderstaande commando's die alleen de projectmap targeten.

## 1. Broncode Exporteren (De Terminal Methode)

Zorg dat u in de terminal van de editor bent en in de hoofdmap van het project staat.

**De universele 'TAR' methode (Aanbevolen voor Cloud & Windows):**
1. Open de terminal.
2. Voer exact dit commando uit:
   ```bash
   tar -cvzf backup_retrospectief.tar.gz --exclude="node_modules" --exclude=".next" --exclude=".git" .
   ```
   *Dit commando pakt alleen de huidige map (.) en negeert grote systeemmappen.*
3. Na afloop verschijnt `backup_retrospectief.tar.gz` in uw mappenlijst.
4. Klik met de rechtermuisknop op dit bestand en kies **Download**.

**Voor Windows PowerShell gebruikers (Local):**
Mocht u lokaal werken en bovenstaande werkt niet, gebruik dan dit commando om alleen de broncode mappen te pakken:
```powershell
Compress-Archive -Path src, public, docs, next.config.ts, package.json, tailwind.config.ts -DestinationPath backup_project.zip -Force
```

## 2. Database & Content (Google Cloud)
De gegevens van uw kunstwerken staan veilig in de cloud.
1. Ga naar de [Firebase Console](https://console.firebase.google.com/).
2. Selecteer project: `studio-7311695883-2090f`.
3. Navigeer naar **Firestore Database**.
4. Gebruik de tab **Import/Export** om een back-up te maken.

## 3. Media & Video's
Alle originele bestanden staan in de map **Storage** in de Firebase Console. U kunt deze mappen daar in hun geheel downloaden als ZIP.

---
*Gegenereerd voor de Erven Thijs Sterk - Master Backup Versie 2.2*