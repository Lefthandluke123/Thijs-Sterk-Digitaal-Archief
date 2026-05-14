# Thijs Sterk Retrospectief Portfolio

Dit project is een eerbetoon aan het werk van Thijs Sterk (1913-1982). Het bevat een galerie, een curator-omgeving en secties voor zijn dochters Hanneke en Beatrijs, en zijn leerling Peter Bes.

## Hoe dit project naar GitHub te pushen

Als je dit project op GitHub wilt plaatsen, volg dan deze stappen in de terminal van je workspace:

1.  **Maak een nieuwe repository aan op GitHub:**
    *   Ga naar [github.com](https://github.com) en maak een nieuwe (lege) repository aan.
    *   Kopieer de URL van de repository (bijv. `https://github.com/gebruikersnaam/thijs-sterk.git`).

2.  **Initialiseer Git in deze workspace:**
    *   Open de terminal onderaan je scherm.
    *   Voer uit: `git init`

3.  **Voeg je bestanden toe:**
    *   Voer uit: `git add .`
    *   Voer uit: `git commit -m "Eerste versie van Thijs Sterk portfolio"`

4.  **Koppel de GitHub repository:**
    *   Voer uit: `git remote add origin <JOUW_GITHUB_URL>` (vervang `<JOUW_GITHUB_URL>` door de gekopieerde URL).

5.  **Push de code:**
    *   Voer uit: `git branch -M main`
    *   Voer uit: `git push -u origin main`

## Publiceren (Live gaan)

Nadat de code op GitHub staat, kun je deze koppelen aan **Firebase App Hosting** voor een professionele live-omgeving:

1.  Ga naar de [Firebase Console](https://console.firebase.google.com/).
2.  Selecteer je project.
3.  Ga naar **Build > App Hosting**.
4.  Klik op "Get Started" en verbind je GitHub repository.
5.  Selecteer de `main` branch en volg de stappen om je website online te zetten.

## Belangrijke contactgegevens
*   **E-mail:** info@thijssterk.nl
*   **Telefoon:** 06-53716249

## Beveiliging
De website is voorzien van visuele watermerken en een blokkade op rechtsklikken en verslepen van afbeeldingen om ongewenst kopiëren te ontmoedigen.
