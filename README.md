# SKAO Budget – statisk demonstrationssida

Denna mapp innehåller en **fristående, klickbar HTML-demonstration** av budgetverktygets gränssnitt.

- Öppna `index.html` i en webbläsare för att prova vyerna.
- Alla uppgifter är **fiktiva**. Projektens övergripande kontrollsummor kommer från README:s fiktiva demofall; kostnadsställen och månadsfördelning är särskilt påhittade illustrationer.
- Ingen inloggning, databas, import, budgetlagring eller Django-server används.
- Den verkliga budgeten för 2026 ingår **inte**.
- Denna commit **aktiverar inte GitHub Pages** och gör ingen publicering. Granska sidan och få uttryckligt godkännande innan publicering.
- Om GitHub Pages senare används: publicera endast innehåll i denna mapp och tänk på att den publicerade webbplatsen kan vara offentligt åtkomlig.

Detta är inte en ersättning för den fullständiga Django-appen.

## Utfall och prognos

Fliken visar fem jämförelsekolumner för vald rapportmånad. Perioden är januari till och med vald månad, reståret är återstående månader. Prognos = ackumulerat utfall + budget reståret. Intäkter är positiva, kostnader negativa och summan visar resultat.

Välj rapportmånad och klicka på **Simulera import av fiktivt utfall**. Knappen använder enbart inbyggda exempel och ersätter tidigare simulering. Byte av månad tömmer utfall och prognos tills en ny simulering görs. Ingen filimport, överföring eller lagring sker. Informationen om framtida import beskriver avsedda fält och kontroller; använd inga verkliga uppgifter i demon.

Klicka på rapportens rader: Hela Skao → kostnadsställe → projekt → konto. Sökvägens knappar tar dig tillbaka. Tabellen behåller alla fem beloppskolumner sida vid sida och kan rullas i sidled på små skärmar.

För lokal utveckling: `python3 -m http.server 8000 --bind 127.0.0.1` från projektmappen. Ingen installation eller byggprocess krävs.
