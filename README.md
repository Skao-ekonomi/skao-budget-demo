# Skao Budget – statisk demonstrationssida

Denna mapp innehåller en **fristående, klickbar HTML-demonstration** av budgetverktygets gränssnitt.

- Öppna `index.html` i en webbläsare för att prova vyerna.
- Alla uppgifter är **fiktiva**. Projektens övergripande kontrollsummor kommer från README:s fiktiva demofall; kostnadsställen och månadsfördelning är särskilt påhittade illustrationer.
- Ingen inloggning, databas, riktig filimport, budgetlagring eller Django-server används.
- Den verkliga budgeten för 2026 ingår **inte**.
- Denna commit **aktiverar inte GitHub Pages** och gör ingen publicering. Granska sidan och få uttryckligt godkännande innan publicering.
- Om GitHub Pages senare används: publicera endast innehåll i denna mapp och tänk på att den publicerade webbplatsen kan vara offentligt åtkomlig.

Detta är inte en ersättning för den fullständiga Django-appen.

## Utfall och prognos

Fliken visar fem jämförelsekolumner för vald rapportmånad. Perioden är januari till och med vald månad, reståret är återstående månader. Prognos = ackumulerat utfall + budget reståret. Intäkter är positiva, kostnader negativa och summan visar resultat.

Välj rapportmånad, fiktivt underlag och **Förhandsgranska import**. Granska radantal, intäkter, kostnader, netto och fellista innan **Godkänn simulerad import**. Giltigt underlag och korrigerat utfall demonstrerar ersättning; felaktiga koder/kombinationer och dubbletter demonstrerar spärrat godkännande.

Varje import är ett komplett ackumulerat utfall från januari till vald månad i det fiktiva rapportåret 2026. Den ersätter hela tidigare utfallet för samma period; utelämnade rader får 0 kr. Olika rapportmånader hålls separata och adderas aldrig. Återval av en godkänd period visar dess senaste utfall. Förhandsgranskning ogiltigförklaras vid byte av månad eller exempel.

Kontrollerna omfattar giltiga konton, kostnadsställen, projekt, projektets fasta kostnadsställe, tillåten kontokombination, dubbletter, rapportår/månad och heltalsbelopp. Hela importen stoppas vid fel, utan delvis tillämpning. Samtliga kontroller körs igen vid godkännande. Registren är inbyggda och fiktiva, härledda från rapportens DEMO-koder.

Historiken visar godkännanden, period, radantal, netto och aktuell/ersatt version. Endast sidans minne används; omladdning tömmer utfall och historik. Budgetuppgifterna ändras inte och ingen bokföring finns att påverka. Ingen riktig filuppladdning, beständig lagring eller Fortnox-anslutning är aktiverad. Detta är en illustration av ett framtida importflöde, inte en implementation av Fortnox filformat. Använd inga verkliga uppgifter i demon.

Klicka på rapportens rader: Hela Skao → kostnadsställe → projekt → konto. Sökvägens knappar tar dig tillbaka. Tabellen behåller alla fem beloppskolumner sida vid sida och kan rullas i sidled på små skärmar.

För lokal utveckling: `python3 -m http.server 8000 --bind 127.0.0.1` från projektmappen. Ingen installation eller byggprocess krävs.

Rapportens beloppsrubriker är Utfall perioden, Budget perioden, Budget reståret, Prognos och Helårsbudget. Budget perioden + Budget reståret = Helårsbudget på varje rapportnivå. DEMO-3010 · Kursintäkter har hela sin fiktiva årsbudget, 3 000 kr, i september och 0 kr övriga månader. Augusti visar därför Budget 0 kr och Restbudget 3 000 kr; september visar Budget 3 000 kr och Restbudget 0 kr. Fördjupningen använder samma månadsbelopp som översikten.

## Funktionstester

Med den lokala servern igång och Node.js, Playwright samt Chromium tillgängliga: kör `node tests/demo.cjs`. `DEMO_URL` och `CHROMIUM_PATH` kan ange annan lokal testadress respektive Chromium-sökväg. Testet verifierar förhandsgranskning, valideringsfel, ersättning utan dubbelräkning, periodisolering, historik, oförändrade budgetuppgifter, rapportformler på alla nivåer och månader, fördjupning, mobilvy och återställning vid omladdning. Playwright behövs bara för tester, inte för att använda demon.

Importflödet visar stegen **Välj underlag → Förhandsgranska → Kontrollera → Godkänn**. Underlagsval och förhandsgranskningsknapp ligger tillsammans. Fellistan grupperas per rad; text och färg skiljer stoppad import från godkända kontroller och godkänd import. Bekräftelsen visar aktuell import, period, intäkter, kostnader och netto. Historiken visar underlag och markerar aktuell version per period samt vilken import som ersatt äldre versioner.

Knappen **Importera utfall (demo)** leder till den befintliga importsimuleringen. Den nya månadens ackumulerade utfall används i stället för föregående månads ackumulerade utfall i rapporten; perioderna adderas aldrig. Äldre perioder kan fortfarande väljas separat.

Rapporten har även en sjätte beloppskolumn, **Avvikelse = Prognos − Helårsbudget**, på alla nivåer och summarader. Negativa värden är röda, positiva gröna med plustecken och noll neutralt. Saknad prognos ger streck även i Avvikelse. Tabellen kan rullas i sidled på mobil.
