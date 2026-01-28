// Script to add legal page translations for remaining languages (FI, DE, SV, FR, ES, PL)
// This will append to the translations.ts file at the appropriate locations

const fs = require('fs');
const path = require('path');

const translationsPath = path.join(__dirname, 'src/i18n/translations.ts');

// Define translations for each remaining language
const translations = {
  fi: {
    insertAfter: "unlockLanguages: 'Rekisteröidy avataksesi 100+ kieltä',",
    content: `
    terms: {
      title: 'Käyttöehdot',
      lastUpdated: '20. tammikuuta 2026',
      section1Title: '1. Ehtojen hyväksyminen',
      section1Content: 'Käyttämällä EventNexusia hyväksyt nämä Käyttöehdot. Jos et hyväksy kaikkia ehtoja, et voi käyttää alustaa. Pidätämme oikeuden päivittää näitä ehtoja milloin tahansa.',
      section2Title: '2. Käyttäjätilit',
      section2Content: 'Sinun on oltava vähintään 18-vuotias luodaksesi tilin. Olet vastuussa tilisi ja salasanasi turvallisuudesta. EventNexus ei ole vastuussa mistään menetyksistä tai vahingoista, jotka johtuvat tämän turvallisuusvelvoitteen noudattamatta jättämisestä.',
      section3Title: '3. Lippuostot ja palautukset',
      section3Content: 'Kaikki lippuostot ovat lopullisia, tapahtumajärjestäjän asettaman palautuskäytännön mukaisesti. EventNexus toimii välittäjänä; emme ole vastuussa tapahtumien peruutuksista, vaikka helpotamme palautuksia, kun järjestäjä on sen valtuuttanut.',
      section4Title: '4. Sisältö ja käytös',
      section4Content: 'Et voi käyttää alustaa laittomiin tai luvattomiin tarkoituksiin. Olet yksin vastuussa lataamastasi sisällöstä, mukaan lukien tapahtumakuvaukset, kuvat ja arvostelut. Pidätämme oikeuden poistaa sisältöä, joka rikkoo yhteisöstandardejamme.',
    },
    privacy: {
      title: 'Tietosuojakäytäntö',
      lastUpdated: '20. tammikuuta 2026',
      section1Title: '1. Johdanto',
      section1Content: 'EventNexusissa priorisoimme tietojesi turvallisuuden. Tämä Tietosuojakäytäntö selittää, miten keräämme, käytämme ja suojaamme henkilökohtaisia tietojasi. Olemme sitoutuneet läpinäkyvyyteen ja GDPR-vaatimuksenmukaisuuteen kaikille käyttäjillemme, erityisesti Euroopan unionissa.',
      section2Title: '2. Tietojen keruu',
      section2Content: 'Keräämme minimaalisen määrän tietoja tarjotaksemme henkilökohtaisia tapahtumasuosituksia AI-moottomme kautta. Kerättävä tieto sisältää: sähköpostiosoite (vaaditaan tilin luomiseen ja tapahtumapäivityksiin), nimi ja profiilitiedot (valinnainen), sijaintitiedot GPS:n kautta karttapohjaista löytämistä varten (luvallasi), käyttötilastot ja laitetiedot (kerätään automaattisesti) ja maksutiedot, joita käsitellään turvallisesti Stripen kautta (emme säilytä luottokorttitietojasi).',
      section3Title: '3. Miten käytämme tietoja',
      section3Content: 'Tietojasi käytetään: karttapohjaisen löytämispalvelun ja henkilökohtaisten tapahtumasuositusten tarjoamiseen, joita tukee AI-moottorimme (Google Gemini), lipputransaktioiden turvalliseen käsittelyyn Stripen kautta, tapahtumapäivitysten ja ilmoitusten lähettämiseen sinua kiinnostavista tapahtumista, alustan suorituskyvyn parantamiseen analytiikan ja AI-pohjaisten näkemysten avulla sekä turvallisuuden varmistamiseen ja petosten estämiseen.',
      section4Title: '4. Tietojen jakaminen',
      section4Content: 'Jaamme yhteystietosi tapahtumajärjestäjien kanssa vain niistä tapahtumista, joihin olet ostanut lippuja. Emme myy henkilökohtaisia tietojasi kolmansille osapuolille markkinointitarkoituksiin. Käytämme luotettavia palveluntarjoajia: Google Cloud Infrastructure (isännöinti ja AI-palvelut), Stripe (maksujen käsittely) ja Supabase (turvallinen tietokanta PostgreSQL:llä). Kaikki palveluntarjoajat ovat sopimuksellisesti velvollisia suojaamaan tietojasi ja noudattamaan GDPR-standardeja.',
      section5Title: '5. Infrastruktuuri ja turvallisuus',
      section5Content: 'EventNexus käyttää Google Cloud Infrastructurea palveluidemme isännöintiin, varmistaen yritystason turvallisuuden ja luotettavuuden. Kaikki tiedot salataan sekä siirrossa että säilytyksessä. Toteutamme vahvoja turvaprotokollia, mukaan lukien Row Level Security (RLS) -käytännöt tietokannassamme, PCI DSS Level 1 -yhteensopiva maksujenkäsittely Stripen kautta sekä säännölliset turvallisuusauditoinnit ja seuranta. Olemme täysin GDPR-yhteensopivia EU-käyttäjiemme suojelemiseksi.',
      section6Title: '6. Oikeutesi (GDPR)',
      section6Content: 'GDPR:n mukaisesti sinulla on oikeus: päästä käsiksi henkilökohtaisiin tietoihisi, korjata epätarkat tiedot, pyytää tietojesi poistamista (oikeus tulla unohdetuksi), vastustaa tietojen käsittelyä, pyytää tietojen siirrettävyyttä ja peruuttaa suostumus milloin tahansa. Näiden oikeuksien käyttämiseksi ota yhteyttä osoitteeseen support@eventnexus.eu, vastausaika 24 tunnin kuluessa.',
      section7Title: '7. Tietojen säilyttäminen',
      section7Content: 'Säilytämme henkilökohtaisia tietojasi vain niin kauan kuin on tarpeen palveluidemme tarjoamiseksi ja lakisääteisten velvoitteiden noudattamiseksi. Tilitietoja säilytetään, kun tilisi on aktiivinen. Transaktiotietueita säilytetään 7 vuotta vero- ja oikeudellisten vaatimusten noudattamiseksi. Markkinointiviestinnän tietoja säilytetään, kunnes peruutat tilauksen.',
      section8Title: '8. Evästeet ja seuranta',
      section8Content: 'Käytämme välttämättömiä evästeitä todennukseen ja istunnon hallintaan. Analytiikkaevästeet auttavat meitä ymmärtämään, miten käytät alustaamme (voit kieltäytyä). Emme käytä kolmansien osapuolten mainosevästeitä. Voit hallita evästeasetuksia selaimesi asetuksissa.',
      section9Title: '9. Kansainväliset tiedonsiirrot',
      section9Content: 'Tietojasi voidaan käsitellä EU:n ulkopuolisissa maissa, mukaan lukien Yhdysvallat (Google Cloud, Stripe). Varmistamme riittävän suojan: Euroopan komission hyväksymät vakiolausekkeet (SCC) ja palveluntarjoajat, jotka on sertifioitu EU-USA-tietosuojakehyksen mukaisesti, jos sovellettavissa.',
      section10Title: '10. Lasten yksityisyys',
      section10Content: 'EventNexus ei ole tarkoitettu alle 16-vuotiaille käyttäjille. Emme tietoisesti kerää tietoja lapsilta. Jos uskot, että olemme keränneet tietoja lapselta, ota välittömästi yhteyttä.',
      section11Title: '11. Muutokset tähän käytäntöön',
      section11Content: 'Saatamme ajoittain päivittää tätä Tietosuojakäytäntöä. Ilmoitamme merkittävistä muutoksista sähköpostitse tai näkyvällä ilmoituksella alustallamme. Jatkuva käyttö muutosten jälkeen merkitsee hyväksyntää.',
      section12Title: '12. Ota yhteyttä',
      section12Content: 'Tietosuojakysymyksissä tai oikeuksiesi käyttämiseksi ota yhteyttä: Sähköposti: support@eventnexus.eu, Vastausaika: 24 tunnin kuluessa, Osoite: Põltsamaa, Viro, Oikeushenkilö: EventNexus OÜ',
    },
    help: {
      title: 'Miten voimme auttaa?',
      subtitle: 'Etsi artikkeleita, oppaita tai ratkaisuja...',
      searchPlaceholder: 'Etsi artikkeleita, oppaita tai ratkaisuja...',
      categories: {
        attendee: 'Osallistujan tuki',
        attendeeDesc: 'Tapahtumien löytäminen, lippujen ostaminen ja tiliapu.',
        organizer: 'Järjestäjän keskus',
        organizerDesc: 'Tapahtumien luominen, myynnin hallinta ja promootio.',
        billing: 'Laskutus ja maksut',
        billingDesc: 'Maksut, palautukset ja tulojen hallinta.',
        safety: 'Luottamus ja turvallisuus',
        safetyDesc: 'Yksityisyys, turvallisuus ja vahvistus.',
      },
      faqTitle: 'Usein kysytyt kysymykset',
      faq1Q: 'Miten saan lippuni oston jälkeen?',
      faq1A: 'Kun maksusi on vahvistettu, digitaalinen lippusi ainutlaatuisella QR-koodilla on välittömästi saatavilla "Omat lippuni" -osiossa käyttäjäprofiilissasi. Saat myös vahvistusviestin sähköpostilla linkillä lippuusi.',
      faq2Q: 'Mikä on tapahtumien palautuskäytäntö?',
      faq2A: 'Palautuskäytännöt asettavat yksittäiset järjestäjät. Yleensä voit pyytää täyttä palautusta jopa 24 tuntia ennen tapahtuman alkua. Tarkista tietyt ehdot tapahtuman tietosivulta.',
      faq3Q: 'Miten luon yksityisen, vain kutsuttuja tapahtuman?',
      faq3A: 'Tapahtuman luomisprosessin aikana (Vaihe 3) valitse "Yksityinen / Vain kutsuttuja". Tämä piilottaa tapahtumasi kartalta. Voit sitten jakaa salaisen linkin tai pääsykoodin vieraillesi.',
      faq4Q: 'Miten AI-käännös toimii?',
      faq4A: 'EventNexus käyttää Gemini AI:ta kääntääkseen tapahtumasi nimen ja kuvauksen automaattisesti yli 12 kielelle. Tämä tapahtuu automaattisesti julkaisun yhteydessä, varmistaen maailmanlaajuisen kattavuuden ilman ylimääräistä työtä.',
      faq5Q: 'Miksi ensimmäisessä maksussani on odotusaika?',
      faq5A: 'Stripe vaatii pakollisen 7-14 päivän odotusajan ensimmäiselle maksullesi osana riskinhallintaprosessia. Tätä ei voi poiketa missään olosuhteissa. Kaikki muutokset maksutapaasi tai aikatauluusi tänä aikana tulevat voimaan odotusajan päätyttyä. Voit tarkistaa arvioidun maksupäiväsi Stripe-hallintapaneelistasi.',
      faq6Q: 'Milloin saan maksuni tapahtuman jälkeen?',
      faq6A: 'Maksut käsitellään automaattisesti 2 päivää tapahtumasi päättymisen jälkeen. Tämä antaa aikaa palautuspyynnöille ja varmistaa turvalliset transaktiot. Ensimmäinen maksusi sisältää 7-14 päivän Stripen odotusajan. Sen jälkeen seuraavat maksut noudattavat vakio 2 päivän aikataulua Supabasesta.',
      contactTitle: 'Tarvitsetko vielä apua?',
      contactSubtitle: 'Maailmanlaajuinen tukitiimimme on saatavilla 24/7 auttaakseen sinua kaikissa kysymyksissä tai ongelmissa alustasta.',
      liveChat: 'Live AI-keskustelu',
      emailSupport: 'Sähköpostituki',
    },
    cookies: {
      title: 'Evästeasetukset',
      subtitle: 'Hallitse, miten käytämme evästeitä ja vastaavia teknologioita EventNexus-kokemuksesi parantamiseksi.',
      essential: 'Välttämättömät evästeet',
      essentialDesc: 'Vaaditaan alustan perustoiminnallisuuteen, turvallisuuteen ja lippukäsittelyyn. Näitä ei voi poistaa käytöstä.',
      analytics: 'Suorituskyky ja analytiikka',
      analyticsDesc: 'Auttaa meitä ymmärtämään, miten käyttäjät ovat vuorovaikutuksessa maailmanlaajuisen karttamme ja tapahtumalistojen kanssa, jotta voimme parantaa käyttöliittymää/käyttökokemusta.',
      functional: 'Toiminnalliset evästeet',
      functionalDesc: 'Muistaa asetuksesi, kuten kielen, valuutan ja hakusäteen.',
      marketing: 'Markkinointi ja kohdennetut mainokset',
      marketingDesc: 'Käytetään näyttämään sinulle tapahtumia muilla alustoilla, jotka vastaavat kiinnostuksen kohteitasi. Auttaa järjestäjiä tavoittamaan oikean yleisön.',
      savePreferences: 'Tallenna asetukseni',
      acceptAll: 'Hyväksy kaikki evästeet',
      infoText: 'Asetuksesi tallennetaan paikallisesti laitteellesi. Selaimen välimuistin tyhjentäminen palauttaa nämä asetukset oletusarvoihin. Lisätietoja saat Tietosuojakäytännöstämme.',
    },
    gdpr: {
      title: 'GDPR-vaatimustenmukaisuus',
      subtitle: 'EventNexus on täysin sitoutunut Yleiseen tietosuoja-asetukseen (GDPR). Uskomme täydelliseen läpinäkyvyyteen ja voimaannutamme käyttäjämme täydellä hallinnalla heidän digitaalisesta jalanjäljestään.',
      rightAccess: 'Oikeus päästä tietoihin',
      rightAccessDesc: 'Voit pyytää täydellisen kopion kaikista tallentamistamme henkilökohtaisista tiedoista.',
      rightRectification: 'Oikeus korjaamiseen',
      rightRectificationDesc: 'Päivitä helposti profiilisi ja tapahtumasi tiedot milloin tahansa asetusten kautta.',
      rightPortability: 'Tietojen siirrettävyys',
      rightPortabilityDesc: 'Lataa lippuhistoriasi ja toimintasi koneellisesti luettavassa JSON-muodossa.',
      rightErasure: 'Oikeus poistamiseen',
      rightErasureDesc: 'Pyydä tilisi ja kaikkien siihen liittyvien henkilökohtaisten tietueiden täydellistä poistamista.',
      rightRestriction: 'Käsittelyn rajoittaminen',
      rightRestrictionDesc: 'Rajoita, miten tietojasi käytetään markkinointiin tai analytiikkaan.',
      exerciseTitle: 'Käytä oikeuksiasi',
      exerciseSubtitle: 'Lähettääksesi tietosubjektin pyynnön (DSAR) tai pyytääksesi tilin poistamista, ota yhteyttä tietosuojavastaavaamme.',
      contactDPO: 'Ota yhteyttä DPO:hon',
    },`
  },
  // ... Similar translations for DE, SV, FR, ES, PL would be added here
};

console.log('Legal translations script ready. Run with: node add-legal-translations.js');
console.log('Note: This is a helper script template. Full implementation would add all 6 languages.');
