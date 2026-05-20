
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

## 2. Technisch Uitrolplan (per nieuwe klant)
1.  **Clone Repository**: Gebruik deze code als GitHub Template.
2.  **Firebase Setup**: 
    *   Maak een nieuw Firebase project aan.
    *   Activeer Firestore, Authentication (Google) en Storage.
    *   Koppel de nieuwe `firebaseConfig` in `src/firebase/config.ts`.
3.  **Branding**:
    *   Log in op het nieuwe `/admin` paneel.
    *   Stel de `siteTitle`, `adminEmail` en het logo in.
4.  **Stripe**: 
    *   Vraag de kunstenaar om hun Stripe API keys.
    *   Voer deze in onder het tabblad "Betalingen".

## 3. Onderhoud & Schaalbaarheid
*   **Updates**: Push updates naar de 'master' branch om alle aangesloten musea tegelijk te verbeteren.
*   **Hosting**: Firebase 'Blaze' plan is aanbevolen. De kosten zijn schaalbaar en blijven laag bij kleine portfolio's.

## 4. Gebruikershandleiding voor de Kunstenaar
Verwijs de kunstenaar naar de **interactieve gids** in de navigatiebalk (klik op de titel van het museum) voor instructies over het gebruik van de Deep Zoom viewer en de curator tools.
