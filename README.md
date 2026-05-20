
# Thijs Sterk Framework - Commerciële Distributie Gids

Dit document is de blauwdruk voor het uitrollen van dit museum-platform naar andere kunstenaars (SaaS-Light model).

## 1. Zakelijk Model (Advies)
Als beheerder (Digitaal Conservator) hanteer je een uurtarief van minimaal **€50,- ex BTW**.

*   **Setup Fee**: Eenmalig €150 - €250 (3 tot 5 uur werk).
    *   Configuratie Firebase & Stripe.
    *   Domeinkoppeling.
    *   Training in Deep Zoom workflow.
*   **Service Fee**: €20 - €30 p/m.
    *   Hosting (Blaze plan).
    *   Technisch onderhoud & support.
*   **Transactie Provisie**: 5% - 10% bovenop de Stripe kosten.

## 2. Aanleverspecificaties (Wat de kunstenaar levert)
Om de museale kwaliteit te waarborgen, moet de kunstenaar de volgende zaken aanleveren:

*   **Foto's**: JPEG of WebP, minimaal **4000px** aan de langste zijde. Kleurprofiel sRGB.
*   **Metadata**: Een lijst met Titels, Jaartallen, Medium en Afmetingen.
*   **Branding**: Een logo (PNG met transparante achtergrond) en een biografie-tekst.
*   **Stripe**: API Keys (Publishable & Secret) van hun eigen Stripe-account.
*   **Domein**: Toegang tot de DNS-instellingen van hun gewenste URL.

## 3. Technisch Uitrolplan (per nieuwe klant)
1.  **Clone Repository**: Gebruik deze code als GitHub Template.
2.  **Firebase Setup**: 
    *   Maak een nieuw Firebase project aan.
    *   Activeer Firestore, Authentication (Google), Storage en App Hosting.
3.  **Branding**: Vul de `Settings` collectie in Firestore of via het `/admin` paneel.
4.  **Stripe**: Voer de keys in onder het tabblad "Betalingen".

## 4. Onderhoud & Schaalbaarheid
*   **Updates**: Push updates naar de 'master' branch om alle aangesloten musea tegelijk te verbeteren.
