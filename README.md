
# Thijs Sterk Portfolio - Safe Harbor Gids

Dit document bevat de essentiële instructies voor het beheren, bewaren en delen van de digitale collectie (325+ werken).

## Versie: 10-5/21.45 (Resolution Master Edition)

### 1. Richtlijnen voor Foto-uploads (Deep Zoom)
Voor de beste weergave in de OpenSeadragon viewer hanteren we de volgende standaarden:

| Type | Resolutie (Langste zijde) | Formaat | Gebruik |
| :--- | :--- | :--- | :--- |
| **Optimaal** | **4000 px** | **WebP** | Standaard voor alle schilderijen. Perfecte zoom. |
| **Minimum** | 2000 px | WebP / JPG | Acceptabel, maar minder detail bij diep inzoomen. |
| **Maximum** | 8000 px | DZI (VIPS) | Alleen voor 'Gigapixel' presentaties via Pad B. |

#### Pad A: Standaard Upload (Eenvoudig)
*   Sla uw scan op als **WebP** met een kwaliteit van **80-85%**.
*   Zorg dat de langste zijde **4000 pixels** is.
*   De viewer bouwt automatisch een tijdelijke piramide in het geheugen. Dit werkt uitstekend tot 5000px.

#### Pad B: Deep Zoom Architectuur (Voor Meesterwerken)
Voor werken met extreme details (bijv. gigapixel scans > 8000px) raden wij aan de foto voor te bewerken met **VIPS** voordat u deze naar Firebase Storage uploadt.
*   **Commando**: `vips dzsave schilderij.webp output_map --layout dzi`
*   **Resultaat**: U krijgt een `.dzi` bestand en een map met duizenden kleine tegels.

### 2. Digitalisering van Dia's (Diapositieven)
Heeft u het archief op dia? Houd bij het scannen rekening met het volgende:
*   **Scan-resolutie**: Om de optimale 4000 pixels te halen uit een standaard 35mm dia, scant u op **2800 DPI tot 3000 DPI**.
*   **Hogere resolutie**: Scannen op 4000 DPI of hoger is technisch mogelijk, maar levert vaak meer korrel/ruis op dan extra beelddetail. **2800 DPI** is de 'sweet spot'.
*   **Kleurdiepte**: Scan bij voorkeur in 24-bit of 48-bit voor maximale kleurnuances in de lucht- en waterpartijen.

### 3. E-mail Instellen (Hostinger / Titan)
Om berichten direct in uw mailbox te ontvangen:
1.  Ga naar de **Firebase Console** > **Extensions**.
2.  Installeer **"Trigger Email from Firestore"**.
3.  Gebruik collectie: `mail`.
4.  **SMTP Connection URI voor Hostinger**: 
    `smtps://GEBRUIKERSNAAM:WACHTWOORD@smtp.titan.email:465`
5.  Ontvanger: `lhcsterk@doggyfew.com`.

### 4. Navigatie & Bediening
*   **Virtuele Tour**: Gebruik de **Pijltjestoetsen** (links/rechts) om door de zaal te lopen.
*   **Viewer**: In de viewer bladeren de pijltjestoetsen direct tussen de schilderijen. 
*   **Zoom**: Gebruik het muiswiel, dubbelklik of 'pinch' op mobiel voor Deep Zoom details.
*   **Escape**: Sluit de viewer direct met de `Esc` toets.
