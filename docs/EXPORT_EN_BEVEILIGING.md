# Thijs Sterk: Het Digitale Retrospectief - Export & Beveiliging (v2.7)

Dit document bevat de definitieve instructies om uw platform en broncode veilig te stellen.

## 1. De Juiste Map Vinden (De Hoofdmap)
De **hoofdmap** bevat de mappen `src`, `docs` en het bestand `package.json`. 

### In de Terminal (Onderaan):
Als u geen `src` ziet, typ dan exact dit commando om naar de juiste map te gaan:
```bash
cd /home/user/project
```
Typ daarna `ls` om te controleren of u de map `src` ziet.

## 2. Broncode Exporteren (Harde Back-up)
Gebruik het `tar` commando. Dit werkt universeel en negeert verborgen systeembestanden die fouten veroorzaken (zoals ntuser.dat).

**Stap-voor-stap:**
1. Zorg dat u in de hoofdmap bent (zie stap 1).
2. Kopieer en plak dit commando exact:
   ```bash
   tar -cvzf retrospectief_v2_volledig.tar.gz --exclude="node_modules" --exclude=".next" --exclude=".git" .
   ```
3. Na afloop verschijnt het bestand `retrospectief_v2_volledig.tar.gz` in de lijst links.
4. Klik met de **rechtermuisknop** op dit bestand en kies **Download**.

## 3. Database Beveiligen (Cloud)
De gegevens (titels, omschrijvingen, zalen) staan in de Firebase Cloud.
1. Ga naar de [Firebase Console](https://console.firebase.google.com/).
2. Ga naar **Firestore Database**.
3. Gebruik de tab **Import/Export** om een back-up te maken naar Google Cloud Storage.

---
*Gegenereerd voor de Erven Thijs Sterk - Integrale Backup Versie 2.7*
