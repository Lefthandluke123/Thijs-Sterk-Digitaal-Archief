# Thijs Sterk: Het Digitale Retrospectief - Export & Beveiliging

Dit document bevat de instructies om de volledige broncode en databasegegevens van het platform veilig te stellen.

## 1. Broncode Exporteren (ZIP)
Om de actuele status van alle code (inclusief AI flows, Curator Intel en het Privé-Archief) te downloaden:

1. Open de **Terminal** in deze omgeving.
2. Voer het volgende commando uit:
   ```bash
   zip -r retrospectief_backup_$(date +%F).zip . -x "node_modules/*" ".next/*" ".git/*"
   ```
3. Klik met de rechtermuisknop op het gemaakte `.zip` bestand in de zijbalk en kies **Download**.

## 2. Versiebeheer (GitHub)
Voor maximale veiligheid is het raadzaam de code naar GitHub te pushen:
1. Maak een repository aan op GitHub.com.
2. Voer de volgende commando's uit in de terminal:
   ```bash
   git init
   git add .
   git commit -m "Volledige back-up retrospectief inclusief Curator Intel"
   git remote add origin [UW_REPO_URL]
   git push -u origin main
   ```

## 3. Database & Gebruikersgegevens (Firestore)
De schilderijen, activiteitslogs en vriendenprofielen staan in Firebase.
1. Ga naar de [Firebase Console](https://console.firebase.google.com/).
2. Navigeer naar **Firestore Database** -> **Import/Export**.
3. Kies een Google Cloud Storage bucket om een kopie van alle collecties te bewaren.

## 4. Media & Foto's (Firebase Storage)
Alle hoge-resolutie beelden en privéfoto's:
1. Ga in de Firebase Console naar **Storage**.
2. U kunt hier mappen handmatig downloaden of een transfer-job instellen voor periodieke back-ups.

## 5. Omgevingsvariabelen
Vergeet niet uw `.env` bestand (met API keys en geheimen) apart op te slaan, aangezien deze vaak niet in de ZIP of Git back-up wordt meegenomen vanwege veiligheidsredenen.

---
*Gegenereerd door de App Prototyper voor de Erven Thijs Sterk.*
