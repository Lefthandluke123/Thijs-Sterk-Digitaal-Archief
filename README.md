
# Thijs Sterk Framework - Commerciële Distributie Gids

Dit document is de blauwdruk voor het uitrollen van dit museum-platform naar andere kunstenaars (SaaS-Light model).

## 1. Zakelijk Model (Advies)
*   **Service Fee**: €15 - €25 p/m (Hosting, Domein, Support).
*   **Transactie Provisie**: 5% - 10% bovenop de Stripe kosten.
*   **Setup Fee**: Eenmalig €150 - €250 voor configuratie en training.

## 2. Technisch Uitrolplan (per nieuwe klant)
1.  **Clone Repository**: Gebruik deze code als GitHub Template.
2.  **Firebase Setup**: 
    *   Maak een nieuw Firebase project aan.
    *   Activeer Firestore, Authentication (Google) en Storage.
    *   Koppel de nieuwe `firebaseConfig` in `src/firebase/config.ts`.
3.  **Branding**:
    *   Log in op het nieuwe `/admin` paneel.
    *   Upload het logo van de kunstenaar.
    *   Stel de `siteTitle` en `adminEmail` in.
4.  **Stripe**: 
    *   Vraag de kunstenaar om een Stripe account.
    *   Voer de API keys in onder het tabblad "Betalingen".

## 3. Onderhoud & Schaalbaarheid
*   **Updates**: Push updates naar de 'master' branch om alle aangesloten musea tegelijk te verbeteren.
*   **Hosting**: Firebase 'Blaze' plan is aanbevolen (Pay-as-you-go). De kosten zijn verwaarloosbaar bij 20 kleine portfolio's.

## 4. Gebruikershandleiding voor de Kunstenaar
Verwijs de kunstenaar naar de **interactieve gids** in de navigatiebalk (klik op "Digitaal Museum") voor instructies over het gebruik van de Deep Zoom viewer en de curator tools.
