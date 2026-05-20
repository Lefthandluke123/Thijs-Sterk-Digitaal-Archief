
# Thijs Sterk Portfolio - Safe Harbor Gids

Dit document bevat de essentiële instructies voor het beheren, bewaren en delen van de digitale collectie (325+ werken).

## Versie: 10-5/22.15 (Archival Excellence Edition)

### 1. Richtlijnen voor Foto-uploads (Deep Zoom)
Voor de beste balans tussen snelheid en detail hanteren we de volgende gelaagde standaarden:

| Type | Resolutie (Langste zijde) | Gebruik | Toelichting |
| :--- | :--- | :--- | :--- |
| **Display Master** | **4000 px** | Standaard weergave | **Museale web-standaard.** Perfect voor Deep Zoom. |
| **Archive Master** | **6000 - 8000 px** | Lange termijn archief | Voor extreme vergrotingen en reproductie. |
| **Minimum** | 2000 px | Snelle preview | Acceptabel, maar minder detail bij diep inzoomen. |

#### Pad A: Standaard Upload (Display)
*   Sla uw scan op als **WebP** met een kwaliteit van **85%**.
*   Zorg dat de langste zijde **4000 pixels** is.
*   De viewer bouwt automatisch een piramide in het geheugen. Dit werkt uitstekend tot 5000px.

#### Pad B: Archival / Gigapixel (Voor Meesterwerken)
Voor werken met extreme details (> 5000px) raden wij aan de foto voor te bewerken met **VIPS** naar een DZI-structuur.
*   **Commando**: `vips dzsave schilderij.webp output_map --layout dzi`
*   **Resultaat**: U krijgt een `.dzi` bestand en een map met tegels. Dit voorkomt dat de browser van de bezoeker vastloopt.

### 2. Digitalisering van Dia's (Diapositieven)
Heeft u het archief op dia? Volg de Metamorfoze-geïnspireerde richtlijnen:
*   **Scan-resolutie (Display)**: Scan op **2800 DPI**. Dit levert de optimale 4000px Display Master op.
*   **Scan-resolutie (Archief)**: Scan op **4000 DPI**. Dit is de fysieke limiet van de meeste professionele filmscanners (zoals de Nikon Coolscan of Hasselblad Flextight) en legt alle korreldetails vast.
*   **Kleurdiepte**: Scan bij voorkeur in **48-bit (16-bit per kanaal)** voor de archief-master; converteer naar 24-bit WebP voor de website.

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
