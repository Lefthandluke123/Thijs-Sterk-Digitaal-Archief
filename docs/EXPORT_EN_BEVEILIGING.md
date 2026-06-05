# Thijs Sterk: Het Digitale Retrospectief - Export & Beveiliging (v2.0)

Dit document bevat de instructies om de volledige broncode en databasegegevens van het platform veilig te stellen.

## 1. Broncode Exporteren (ZIP/TAR)
Mocht de `zip` opdracht niet werken, gebruik dan de meer robuuste `tar` opdracht.

**Methode A: ZIP**
```bash
zip -r backup_$(date +%F).zip . -x "node_modules/*" ".next/*" ".git/*"
```

**Methode B: TAR (Meest stabiel in Cloud)**
```bash
tar -czvf backup_$(date +%F).tar.gz --exclude='node_modules' --exclude='.next' --exclude='.git' .
```

## 2. Database & Gebruikersgegevens (Firestore)
De schilderijen, activiteitslogs en vriendenprofielen staan in de Google Cloud (Firebase).
1. Ga naar de [Firebase Console](https://console.firebase.google.com/).
2. Selecteer uw project: `studio-7311695883-2090f`.
3. Navigeer naar **Firestore Database** -> **Import/Export**.
4. Kies een Google Cloud Storage bucket om een kopie van alle collecties te bewaren. 

## 3. Media & Foto's (Firebase Storage)
Alle hoge-resolutie beelden en video's staan in de Storage bucket.
1. Ga in de Firebase Console naar **Storage**.
2. U kunt hier mappen handmatig downloaden als ZIP via de interface.

---
*Gegenereerd voor de Erven Thijs Sterk - Master Backup Versie 2.0*
