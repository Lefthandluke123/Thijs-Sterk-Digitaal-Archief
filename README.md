
# Thijs Sterk Portfolio - Safe Harbor Gids

Dit document bevat de essentiële instructies voor het beheren, bewaren en delen van de digitale collectie (325+ werken).

## Versie: 10-5/18.30 (Optimale Resolutie & Performance)

### 1. Richtlijnen voor Foto-uploads (Kwaliteit vs. Snelheid)
Voor de volledige collectie van ~360 werken adviseren wij de volgende instellingen voor een maximale detaillering (loep-ervaring) en snelle laadtijden:

*   **Bestandsformaat**: **WebP** (Sterk aanbevolen). Dit formaat biedt de beste compressie zonder verlies van detail.
*   **Maximale Resolutie**: **3500px tot 4000px** aan de langste zijde. Dit is ideaal voor weergave op 4K-schermen.
*   **Bestandsgrootte**: Richt op **2MB tot 4MB** per foto. 
*   **Bestandsnaam**: Gebruik het formaat `[Volgnummer]-[RomeinsCijfer].webp` (bijv. `12-XIII.webp`). 

### 2. Digitalisering van Dia's (Diapositieven)
Heeft u het archief op dia? Houd bij het scannen rekening met het volgende:
*   **Scan-resolutie**: Om 4000 pixels te halen uit een standaard 35mm dia, moet u scannen op minimaal **3000 DPI tot 4000 DPI**.
*   **Kleurdiepte**: Scan in 24-bit of 48-bit voor maximale kleurnuances.

### 3. E-mail Instellen (Hostinger / Titan)
Om berichten direct in uw mailbox te ontvangen:
1.  Ga naar de **Firebase Console** > **Extensions**.
2.  Installeer **"Trigger Email from Firestore"**.
3.  Gebruik collectie: `mail`.
4.  **SMTP Connection URI voor Hostinger**: 
    `smtps://GEBRUIKERSNAAM:WACHTWOORD@smtp.titan.email:465`
    *(Vervang GEBRUIKERSNAAM door uw e-mailadres en WACHTWOORD door uw Titan wachtwoord)*.
5.  Ontvanger: `lhcsterk@doggyfew.com`.

### 4. Hoe publiceer ik mijn wijzigingen?
*   **Inhoud (Foto's, Tags, Bio's)**: Wijzigingen in het beheerpaneel (`/admin`) zijn **direct live**.
*   **Vertaal Station**: Gebruik de AI-toverstaf om Nederlandse teksten direct om te zetten naar EN, DE, FR of ES.

### 5. Sortering van het Archief
De collectie wordt automatisch gesorteerd op:
1.  **Romeinse Cijfergroep** (I, II, III... t/m XX)
2.  **Volgnummer** binnen die groep (1, 2, 3...)

### 6. Back-up & Herstel
Onder **'Master Backup'** kunt u een JSON-bestand downloaden. Dit bevat alle titels, jaartallen en zaal-indelingen. Doe dit altijd na een grote bewerksessie.
