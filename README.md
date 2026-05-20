
# Thijs Sterk Portfolio - Safe Harbor Gids

Dit document bevat de essentiële instructies voor het beheren, bewaren en delen van de digitale collectie (325+ werken).

## Versie: 10-5/19.15 (Museum-Grade Deep Zoom Edition)

### 1. Richtlijnen voor Foto-uploads (Deep Zoom)
Voor een optimale ervaring in de nieuwe OpenSeadragon viewer adviseren wij twee paden:

#### Pad A: Standaard Upload (Eenvoudig)
*   Upload een **WebP** bestand van **4000px**.
*   De viewer bouwt automatisch een tijdelijke piramide in het geheugen van de bezoeker. Dit werkt uitstekend voor de meeste werken.

#### Pad B: Deep Zoom Architectuur (Voor Meesterwerken)
Voor werken met extreme details (bijv. gigapixel scans) raden wij aan de foto voor te bewerken met **VIPS** voordat u deze naar Firebase Storage uploadt.
*   **Commando**: `vips dzsave schilderij.webp output_map --layout dzi`
*   **Resultaat**: U krijgt een `.dzi` bestand en een map met duizenden kleine tegels.
*   **Voordeel**: De bezoeker laadt alleen de pixels die hij op dat moment ziet. Dit is "True Tiled Architecture".

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

### 4. Navigatie & Bediening
*   **Virtuele Tour**: Gebruik de **Pijltjestoetsen** (links/rechts) om door de zaal te lopen.
*   **Viewer**: In de viewer bladeren de pijltjestoetsen direct tussen de schilderijen. 
*   **Zoom**: Gebruik het muiswiel, dubbelklik of 'pinch' op mobiel voor Deep Zoom details.
*   **Escape**: Sluit de viewer direct met de `Esc` toets.

### 5. Sortering van het Archief
De collectie wordt automatisch gesorteerd op:
1.  **Romeinse Cijfergroep** (I, II, III... t/m XX)
2.  **Volgnummer** binnen die groep (1, 2, 3...)

### 6. Back-up & Herstel
Onder **'Master Backup'** kunt u een JSON-bestand downloaden. Dit bevat alle titels, jaartallen en zaal-indelingen. Doe dit altijd na een grote bewerksessie.
