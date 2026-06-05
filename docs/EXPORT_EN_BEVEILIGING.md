# Thijs Sterk: Het Digitale Retrospectief - Export & Beveiliging

Dit document bevat de instructies om de volledige broncode en databasegegevens van het platform veilig te stellen. U kunt deze acties direct uitvoeren vanuit de Firebase Studio omgeving.

## 1. Broncode Exporteren (ZIP)
De code die u ziet in de editor kan als één pakket worden gedownload. 

1. Open de **Terminal** (meestal onderaan in uw scherm).
2. Voer het volgende commando uit om alles in een ZIP te verzamelen (exclusief tijdelijke systeembestanden):
   ```bash
   zip -r retrospectief_backup_$(date +%F).zip . -x "node_modules/*" ".next/*" ".git/*"
   ```
3. Na uitvoering ziet u een nieuw bestand verschijnen in de zijbalk (bijv. `retrospectief_backup_2024-05-27.zip`).
4. Klik met de **rechtermuisknop** op dit bestand en kies **Download**.

## 2. Database & Gebruikersgegevens (Firestore)
De schilderijen, activiteitslogs en vriendenprofielen staan in de Google Cloud (Firebase).
1. Ga naar de [Firebase Console](https://console.firebase.google.com/).
2. Selecteer uw project: `studio-7311695883-2090f`.
3. Navigeer naar **Firestore Database** -> **Import/Export**.
4. Kies een Google Cloud Storage bucket om een kopie van alle collecties te bewaren. Dit is uw 'harde' back-up van alle dynamische data.

## 3. Media & Foto's (Firebase Storage)
Alle hoge-resolutie beelden en privéfoto's:
1. Ga in de Firebase Console naar **Storage**.
2. U kunt hier mappen handmatig downloaden of een transfer-job instellen voor periodieke back-ups naar uw eigen lokale computer of een andere cloud-dienst.

## 4. Versiebeheer (GitHub)
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

## 5. Omgevingsvariabelen
Vergeet niet uw `.env` bestand apart op te slaan. Hierin staan de geheime sleutels (zoals voor Stripe of Admin-toegang) die niet in de code-back-up worden meegenomen.

---
*Gegenereerd door de App Prototyper voor de Erven Thijs Sterk.*