
# Thijs Sterk Portfolio - Safe Harbor Gids

Dit document bevat de essentiële instructies voor het beheren, bewaren en delen van de digitale collectie (325+ werken).

## Versie: 10-5/18.30 (Optimale Resolutie & Performance)

### 1. Richtlijnen voor Foto-uploads (Kwaliteit vs. Snelheid)
Voor de volledige collectie van ~360 werken adviseren wij de volgende instellingen voor een maximale detaillering (loep-ervaring) en snelle laadtijden:

*   **Bestandsformaat**: **WebP** (Sterk aanbevolen). Dit formaat biedt de beste compressie zonder verlies van detail. Als u geen WebP kunt maken, gebruik dan JPG (Kwaliteit 85%).
*   **Maximale Resolutie**: **3500px tot 4000px** aan de langste zijde. Dit is ideaal voor weergave op 4K-schermen en zorgt dat verfstreken haarscherp blijven bij vergroting.
*   **Bestandsgrootte**: Richt op **2MB tot 4MB** per foto. Dit houdt de totale database (~1.2 GB) gezond en razendsnel.
*   **Kleurprofiel**: Altijd **sRGB** om kleurafwijkingen op verschillende schermen te voorkomen.
*   **Bestandsnaam**: Gebruik het formaat `[Volgnummer]-[RomeinsCijfer].webp` (bijv. `12-XIII.webp`). Het systeem sorteert hier automatisch op.

### 2. Digitalisering van Dia's (Diapositieven)
Heeft u het archief op dia? Houd bij het scannen rekening met het volgende:
*   **Scan-resolutie**: Om 4000 pixels te halen uit een standaard 35mm dia, moet u scannen op minimaal **3000 DPI tot 4000 DPI**.
*   **Kleurdiepte**: Scan in 24-bit of 48-bit voor maximale kleurnuances in de schaduwen.
*   **Stof & Krassen**: Gebruik bij voorkeur een scanner met 'Digital ICE' technologie om stofjes op de dia automatisch te verwijderen.

### 3. E-mail Instellen (Contactformulier)
Om berichten direct in uw mailbox te ontvangen, moet de e-mail service geactiveerd worden:
1.  Ga naar de **Firebase Console**.
2.  Installeer de extensie **"Trigger Email from Firestore"**.
3.  Configureer de extensie met de collectie: `mail`.
4.  Voer uw SMTP-gegevens in (bijv. van SendGrid of uw hosting provider).
5.  Vanaf dat moment worden alle inzendingen doorgestuurd naar `lhcsterk@doggyfew.com`.

### 4. Hoe publiceer ik mijn wijzigingen?
*   **Inhoud (Foto's, Tags, Bio's)**: Wijzigingen in het beheerpaneel (`/admin`) zijn **direct live**.
*   **Layout & Techniek (Code)**: Klik in uw dashboard op **'Deploy'**. Zodra dit klaar is, zijn nieuwe functies of sorteerlogica zichtbaar.

### 5. Sortering van het Archief
De collectie wordt automatisch gesorteerd op:
1.  **Romeinse Cijfergroep** (I, II, III... t/m XX)
2.  **Volgnummer** binnen die groep (1, 2, 3...)

### 6. Back-up & Herstel
Onder **'Master Backup'** kunt u een JSON-bestand downloaden. Dit bevat alle titels, jaartallen en zaal-indelingen. Doe dit altijd na een grote bewerksessie.
