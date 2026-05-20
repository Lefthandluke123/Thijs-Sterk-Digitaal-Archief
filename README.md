
# Thijs Sterk Portfolio - Safe Harbor Gids

Dit document bevat de essentiële instructies voor het beheren, bewaren en delen van de digitale collectie (325+ werken).

## Versie: 10-5/16.15 (Gecategoriseerde Tags & Layout Update)

### 1. Hoe publiceer ik mijn wijzigingen naar de hele wereld?
Er zijn twee soorten wijzigingen op uw site:

*   **Inhoud (Foto's, Tags, Bio's)**: Wijzigingen die u maakt in het beheerpaneel (`/admin`) zijn **direct live**. Iedereen met de link ziet dit meteen.
*   **Layout & Techniek (Code)**: Wijzigingen die de AI (ik) maakt aan de vormgeving of knoppen, moeten worden "gedeployed". 
    *   **Stap**: Klik in uw Firebase Studio dashboard op de knop **'Deploy'** (meestal rechtsboven of via de Github-koppeling). Zodra de balk klaar is, zijn de nieuwe knoppen en indelingen voor iedereen zichtbaar op uw domeinnaam.

### 2. Hoe deel ik de collectie?
Uw website is publiek toegankelijk op uw eigen URL (bijv. `thijssterk.nl`).
*   **Directe link naar zaal**: Kopieer de URL uit de browserbalk terwijl u in een zaal bent (bijv. `/gallery?series=Groet`) om mensen direct naar die plek te sturen.

### 3. Hoe bewaar ik mijn bewerkingen (Back-up)?
In het beheerpaneel onder **'Master Backup'** kunt u een JSON-bestand downloaden.
*   **Wat zit erin?**: Alle Schermtitels, jaartallen, categorieën (Techniek/Plaats/Onderwerp) en uitsnedes.
*   **Advies**: Download na een grote sessie bewerken altijd een nieuwe Master Backup en bewaar deze bij de originele foto's op uw computer. Dit is uw veiligheidsnet.

### 4. Wat als er iets misgaat? (Herstel)
Mocht u per ongeluk een zaal wissen of de database beschadigen:
1.  Ga naar `/admin` > **Master Backup**.
2.  Kies **'Backup Bestand Herstellen'**.
3.  Upload uw laatste JSON-bestand en klik op **'Start Herstel'**.

### 5. Nieuw in deze versie
*   **Gecategoriseerde Tags**: Tags zijn nu verdeeld in Periode, Techniek, Plaats en Onderwerp.
*   **Compacte Curator**: De pagina 'Uw Zaal' is compacter en overzichtelijker voor bezoekers.
*   **Verbeterde Tour**: De virtuele wandeling heeft een strakkere layout met informatiebordjes die niet meer over de kunst heen vallen.
