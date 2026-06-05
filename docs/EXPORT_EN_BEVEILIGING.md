# Thijs Sterk: Het Digitale Retrospectief - Export & Beveiliging (v2.5)

Dit document bevat de definitieve instructies om uw platform veilig te stellen. Gebruik onderstaande commando's die alleen de projectmap targeten om rechtenfouten (zoals ntuser.dat) te voorkomen.

## 1. Broncode Exporteren (Harde Back-up)

Zorg dat u in de terminal van de editor bent en in de hoofdmap van het project staat.

**De universele 'TAR' methode (Aanbevolen):**
Dit commando pakt alle broncode in een gecomprimeerd archief, maar negeert zware systeemmappen en Windows-gebruikersbestanden.

1. Open de terminal onderaan het scherm.
2. Kopieer en plak exact dit commando:
   ```bash
   tar -cvzf retrospectief_backup_v2.tar.gz --exclude="node_modules" --exclude=".next" --exclude=".git" --exclude="ntuser.dat*" .
   ```
3. Na afloop verschijnt `retrospectief_backup_v2.tar.gz` in uw mappenlijst aan de linkerkant.
4. Klik met de rechtermuisknop op dit bestand en kies **Download**.

**Voor pure Windows PowerShell gebruikers:**
```powershell
Compress-Archive -Path src, public, docs, next.config.ts, package.json, tailwind.config.ts -DestinationPath retrospectief_windows.zip -Force
```

## 2. Waar is mijn back-up?
- **In de Cloud**: Uw data staat veilig in de Firebase Firestore.
- **In de Projectgeschiedenis**: De volledige broncode is nu als "Harde Back-up" vastgelegd in de chat-historie van uw AI-assistent.
- **Op uw Schijf**: Zodra u het `tar.gz` bestand downloadt, heeft u een volledige kopie van het platform.

## 3. Database & Content (Google Cloud)
1. Ga naar de [Firebase Console](https://console.firebase.google.com/).
2. Selecteer uw project.
3. Navigeer naar **Firestore Database**.
4. Gebruik de tab **Import/Export** om een back-up van alle kunstwerken en instellingen te maken.

---
*Gegenereerd voor de Erven Thijs Sterk - Master Backup Versie 2.5*
