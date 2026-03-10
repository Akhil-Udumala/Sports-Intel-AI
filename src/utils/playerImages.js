/**
 * Player image lookup utility.
 * Maps every player name → their image path in /public/images/players/
 * Falls back to /images/avatar.jpg if no match is found.
 */

const AVATAR = '/images/avatar.jpg';

// ─── CRICKET PLAYERS ───────────────────────────────────────────────────────
const CRICKET_IMAGES = {
    // India
    'virat kohli': '/images/players/Cricketers/India/kohli.avif',
    'rohit sharma': '/images/players/Cricketers/India/Rohit sharma.jpg',
    'ravindra jadeja': '/images/players/Cricketers/India/Jadeja.webp',
    'ravichandran ashwin': '/images/players/Cricketers/India/Ashwin.jpg',
    'jasprit bumrah': '/images/players/Cricketers/India/Bumrah.jpg',
    'hardik pandya': '/images/players/Cricketers/India/Hardik.webp',
    'kl rahul': '/images/players/Cricketers/India/rahul.avif',
    'shubman gill': '/images/players/Cricketers/India/Shubman.webp',
    'axar patel': '/images/players/Cricketers/India/axar.jpg',
    'kuldeep yadav': '/images/players/Cricketers/India/kuldeep.webp',
    'ishan kishan': '/images/players/Cricketers/India/ishan.avif',
    'sanju samson': '/images/players/Cricketers/India/sanju.avif',
    'shreys iyer': '/images/players/Cricketers/India/shreyas.webp',
    'shreyas iyer': '/images/players/Cricketers/India/shreyas.webp',
    'suryakumar yadav': '/images/players/Cricketers/India/suryakumar.jpg',
    'yashasvi jaiswal': '/images/players/Cricketers/India/Yashasvi.jpeg',
    'mohammed shami': '/images/players/Cricketers/India/shami.jpg',

    // Australia
    'pat cummins': '/images/players/Cricketers/Australia/Cummins.webp',
    'steve smith': '/images/players/Cricketers/Australia/Smith.jpg',
    'david warner': '/images/players/Cricketers/Australia/Warner.webp',
    'mitchell starc': '/images/players/Cricketers/Australia/Starc.avif',
    'glenn maxwell': '/images/players/Cricketers/Australia/Maxwell.webp',
    'travis head': '/images/players/Cricketers/Australia/Head.jpg',
    'marnus labuschagne': '/images/players/Cricketers/Australia/Marnus.webp',
    'usman khawaja': '/images/players/Cricketers/Australia/Khawaja.avif',
    'josh hazlewood': '/images/players/Cricketers/Australia/Hazlewood.jpg',
    'cameron green': '/images/players/Cricketers/Australia/Green.jpg',
    'matthew wade': '/images/players/Cricketers/Australia/Wade.jpeg',
    'marcus stoinis': '/images/players/Cricketers/Australia/Stoinis.jpg',
    'tim david': '/images/players/Cricketers/Australia/Tim david.webp',
    'scott boland': '/images/players/Cricketers/Australia/Boland.jpg',
    'adam zampa': '/images/players/Cricketers/Australia/Zampa.jpg',
    'mitchell marsh': '/images/players/Cricketers/Australia/mitchell marsh.webp',

    // England
    'joe root': '/images/players/Cricketers/England/Root.png',
    'ben stokes': '/images/players/Cricketers/England/ben stokes.webp',
    'jos buttler': '/images/players/Cricketers/England/buttler.jpg',
    'jonny bairstow': '/images/players/Cricketers/England/jonny bairstow.jpg',
    'james anderson': '/images/players/Cricketers/England/james-anderson.avif',
    'moeen ali': '/images/players/Cricketers/England/moeen ali.png',
    'adil rashid': '/images/players/Cricketers/England/adil.png',
    'mark wood': '/images/players/Cricketers/England/mark wood.jpg',
    'chris woakes': '/images/players/Cricketers/England/chris woakes.png',
    'liam livingstone': '/images/players/Cricketers/England/livingstone.png',
    'ben duckett': '/images/players/Cricketers/England/ben duckett.webp',
    'phil salt': '/images/players/Cricketers/England/Phil-Salt.webp',
    'zak crawley': '/images/players/Cricketers/England/Zak-Crawley.jpg',
    'sam curran': '/images/players/Cricketers/England/sam curran.jpg',
    'chris jordan': '/images/players/Cricketers/England/chris jordan.webp',
    'liam dawson': '/images/players/Cricketers/England/liam dawson.jpg',

    // Pakistan
    'babar azam': '/images/players/Cricketers/Pakistan/Babar Azam.png',
    'mohammad rizwan': '/images/players/Cricketers/Pakistan/Rizwan.jpg',
    'shaheen afridi': '/images/players/Cricketers/Pakistan/shaheen shah afridi.webp',
    'shaheen shah afridi': '/images/players/Cricketers/Pakistan/shaheen shah afridi.webp',
    'shadab khan': '/images/players/Cricketers/Pakistan/shadab khan.png',
    'fakhar zaman': '/images/players/Cricketers/Pakistan/fakhar zaman.jpeg',
    'haris rauf': '/images/players/Cricketers/Pakistan/haris rauf.webp',
    'naseem shah': '/images/players/Cricketers/Pakistan/naseem shah.webp',
    'shan masood': '/images/players/Cricketers/Pakistan/shan masood.png',
    'imad wasim': '/images/players/Cricketers/Pakistan/imad wasim.webp',
    'mohammad nawaz': '/images/players/Cricketers/Pakistan/mohammad nawaz.jpg',
    'faheem ashraf': '/images/players/Cricketers/Pakistan/faheem ashraf.webp',
    'hasan ali': '/images/players/Cricketers/Pakistan/hasan ali.jpg',
    'iftikhar ahmed': '/images/players/Cricketers/Pakistan/iftikhar ahmed.png',
    'agha salman': '/images/players/Cricketers/Pakistan/agha salman.jpg',
    'saim ayub': '/images/players/Cricketers/Pakistan/Saim-Ayub.webp',
    'mohammad amir': '/images/players/Cricketers/Pakistan/Mohammad-amir.webp',

    // South Africa
    'quinton de kock': '/images/players/Cricketers/South Africa/quinton de kock.jpeg',
    'kagiso rabada': '/images/players/Cricketers/South Africa/Kagiso Rabada.jpg',
    'temba bavuma': '/images/players/Cricketers/South Africa/temba bavuma.jpg',
    'aiden markram': '/images/players/Cricketers/South Africa/aiden markram.webp',
    'anrich nortje': '/images/players/Cricketers/South Africa/anrich nortje.webp',
    'david miller': '/images/players/Cricketers/South Africa/david-miller.jpeg',
    'heinrich klaasen': '/images/players/Cricketers/South Africa/heinrich-klaasen.jpeg',
    'keshav maharaj': '/images/players/Cricketers/South Africa/keshav maharaj.webp',
    'marco jansen': '/images/players/Cricketers/South Africa/marco jansen.jpg',
    'rassie van der dussen': '/images/players/Cricketers/South Africa/rassie van der dussen.webp',
    'reeza hendricks': '/images/players/Cricketers/South Africa/reeza-hendricks.jpeg',
    'tabraiz shamsi': '/images/players/Cricketers/South Africa/tabraiz shamsi.jpg',
    'wayne parnell': '/images/players/Cricketers/South Africa/wayne parnell.png',
    'gerald coetzee': '/images/players/Cricketers/South Africa/gerald coetzee.jpeg',
    'simon harmer': '/images/players/Cricketers/South Africa/simon harmer.webp',
    'johan botha': '/images/players/Cricketers/South Africa/Johan-Botha.jpg',

    // New Zealand
    'kane williamson': '/images/players/Cricketers/New Zealand/kane-williamson.jpg',
    'trent boult': '/images/players/Cricketers/New Zealand/trent boult.jpg',
    'tim southee': '/images/players/Cricketers/New Zealand/tim southee.jpg',
    'devon conway': '/images/players/Cricketers/New Zealand/Devon Conway.jpg',
    'daryl mitchell': '/images/players/Cricketers/New Zealand/Daryl Mitchell.jpg',
    'finn allen': '/images/players/Cricketers/New Zealand/finn-allen.jpg',
    'glenn phillips': '/images/players/Cricketers/New Zealand/Glenn phillips.jpg',
    'ish sodhi': '/images/players/Cricketers/New Zealand/ish-sodhi.jpg',
    'jimmy neesham': '/images/players/Cricketers/New Zealand/jimmy neesham.jpg',
    'lockie ferguson': '/images/players/Cricketers/New Zealand/lockie-ferguson.jpg',
    'matt henry': '/images/players/Cricketers/New Zealand/matt henry.webp',
    'mitchell santner': '/images/players/Cricketers/New Zealand/mitchell-santner.jpg',
    'rachin ravindra': '/images/players/Cricketers/New Zealand/Rachin ravindra.jpg',
    'tim seifert': '/images/players/Cricketers/New Zealand/Tim-Seifert.webp',
    'tom latham': '/images/players/Cricketers/New Zealand/tom latham.webp',
    'will young': '/images/players/Cricketers/New Zealand/will-young.webp',

    // Sri Lanka
    'wanindu hasaranga': '/images/players/Cricketers/Sri Lanka/Wanindu-Hasaranga.webp',
    'kusal mendis': '/images/players/Cricketers/Sri Lanka/kusal mendis.jpg',
    'kusal perera': '/images/players/Cricketers/Sri Lanka/kusal perera.jpg',
    'pathum nissanka': '/images/players/Cricketers/Sri Lanka/pathum nissanka.jpg',
    'dasun shanaka': '/images/players/Cricketers/Sri Lanka/dasun shanaka.jpg',
    'dhananjaya de silva': '/images/players/Cricketers/Sri Lanka/dhananjaya de silva.jpg',
    'dimuth karunaratne': '/images/players/Cricketers/Sri Lanka/dimuth karunaratne.jpg',
    'dinesh chandimal': '/images/players/Cricketers/Sri Lanka/dinesh chandimal.png',
    'angelo mathews': '/images/players/Cricketers/Sri Lanka/angelo mathews.jpg',
    'asitha fernando': '/images/players/Cricketers/Sri Lanka/asitha fernando.jpg',
    'avishka fernando': '/images/players/Cricketers/Sri Lanka/avishka fernando.webp',
    'bhanuka rajapaksa': '/images/players/Cricketers/Sri Lanka/bhanuka rajapaksa.webp',
    'charith asalanka': '/images/players/Cricketers/Sri Lanka/charith asalanka.jpg',
    'dushmantha chameera': '/images/players/Cricketers/Sri Lanka/dushmantha chameera.jpg',
    'maheesh theekshana': '/images/players/Cricketers/Sri Lanka/maheesh theekshana.jpg',
    'nuwanidu fernando': '/images/players/Cricketers/Sri Lanka/nuwanidu fernando.jpg',

    // West Indies
    'nicholas pooran': '/images/players/Cricketers/West Indies/nicholas pooran.jpg',
    'andre russell': '/images/players/Cricketers/West Indies/andre russell.jpg',
    'shai hope': '/images/players/Cricketers/West Indies/Shai-Hope.webp',
    'alzarri joseph': '/images/players/Cricketers/West Indies/alzarri joseph.png',
    'jason holder': '/images/players/Cricketers/West Indies/jason holder.jpg',
    'rovman powell': '/images/players/Cricketers/West Indies/Rovman-Powell.webp',
    'shimron hetmyer': '/images/players/Cricketers/West Indies/Shimron-Hetmyer.webp',
    'kyle mayers': '/images/players/Cricketers/West Indies/kyle mayers.png',
    'akeal hosein': '/images/players/Cricketers/West Indies/akeal hosein.webp',
    'romario shepherd': '/images/players/Cricketers/West Indies/Romario-Shepherd.webp',
    'evin lewis': '/images/players/Cricketers/West Indies/evin lewis.jpg',
    'brandon king': '/images/players/Cricketers/West Indies/brandon king.webp',
    'johnson charles': '/images/players/Cricketers/West Indies/johnson charles.jpg',
    'andre fletcher': '/images/players/Cricketers/West Indies/andre fletcher.jpg',
    'oshane thomas': '/images/players/Cricketers/West Indies/oshane thomas.jpg',
    'sherfane rutherford': '/images/players/Cricketers/West Indies/sherfane rutherford.jpg',

    // Afghanistan
    'rashid khan': '/images/players/Cricketers/Afghanistan/Rashid.webp',
    'mohammad nabi': '/images/players/Cricketers/Afghanistan/nabi.jpg',
    'noor ahmad': '/images/players/Cricketers/Afghanistan/Noor.jpg',
    'rahmanullah gurbaz': '/images/players/Cricketers/Afghanistan/gurbaz.jpg',
    'azmatullah omarzai': '/images/players/Cricketers/Afghanistan/Azmatullah.jpg',
    'ibrahim zadran': '/images/players/Cricketers/Afghanistan/Zadran.jpg',
    'hazratullah zazai': '/images/players/Cricketers/Afghanistan/Zazai.jpg',
    'rahmat shah': '/images/players/Cricketers/Afghanistan/Rahmat.png',
    'najibullah zadran': '/images/players/Cricketers/Afghanistan/Najibullah.webp',
    'naveen ul haq': '/images/players/Cricketers/Afghanistan/Naveen.jpg',
    'gulbadin naib': '/images/players/Cricketers/Afghanistan/Naib.png',
    'mujeeb ur rahman': '/images/players/Cricketers/Afghanistan/Mujeeb.avif',
    'karim janat': '/images/players/Cricketers/Afghanistan/Karim.webp',
    'sayed shirzad': '/images/players/Cricketers/Afghanistan/Shirzad.webp',
    'fazalhaq farooqi': '/images/players/Cricketers/Afghanistan/Farooqi.jpg',
    'yama ahmadzai': '/images/players/Cricketers/Afghanistan/yama ahmadzai.png',
    'ikram alikhil': '/images/players/Cricketers/Afghanistan/Alikhil.jpg',

    // Bangladesh
    'shakib al hasan': '/images/players/Cricketers/Bangladesh/shakib-al-hassan.webp',
    'mushfiqur rahim': '/images/players/Cricketers/Bangladesh/Mushfiqur.png',
    'tamim iqbal': '/images/players/Cricketers/Bangladesh/Nazmul.jpg',
    'mustafizur rahman': '/images/players/Cricketers/Bangladesh/Mustafizur rahman.jpg',
    'liton das': '/images/players/Cricketers/Bangladesh/liton das.avif',
    'mahmudullah': '/images/players/Cricketers/Bangladesh/Mahmudullah.webp',
    'taskin ahmed': '/images/players/Cricketers/Bangladesh/Taskin.webp',
    'nazmul hossain shanto': '/images/players/Cricketers/Bangladesh/Nazmul.jpg',
    'towhid hridoy': '/images/players/Cricketers/Bangladesh/Towhid.webp',
    'mehedi hasan miraz': '/images/players/Cricketers/Bangladesh/Mehedi.jpg',
    'mahedi hasan': '/images/players/Cricketers/Bangladesh/Mahedi.webp',
    'shoriful islam': '/images/players/Cricketers/Bangladesh/Shoriful.jpg',
    'nurul hasan': '/images/players/Cricketers/Bangladesh/Nurul.webp',
    'mominul haque': '/images/players/Cricketers/Bangladesh/mominul.webp',
    'anamul haque': '/images/players/Cricketers/Bangladesh/anamul.jpg',
    'afif hossain': '/images/players/Cricketers/Bangladesh/afif.png',
    'soumya sarkar': '/images/players/Cricketers/Bangladesh/soumya sarkar.webp',
};

// ─── FOOTBALL PLAYERS ───────────────────────────────────────────────────────
const FOOTBALL_IMAGES = {
    // Argentina
    'lionel messi': '/images/players/Football players/Argentina/lionel messi.jpg',
    'emiliano martinez': '/images/players/Football players/Argentina/emiliano martinez.jpg',
    'nicolas otamendi': '/images/players/Football players/Argentina/nicolas otamendi.jpg',
    'nicolás otamendi': '/images/players/Football players/Argentina/nicolas otamendi.jpg',
    'nahuel molina': '/images/players/Football players/Argentina/nahuel molina.jpg',
    'rodrigo de paul': '/images/players/Football players/Argentina/rodrigo de paul.webp',
    'angel di maria': '/images/players/Football players/Argentina/angel di maria.webp',
    'ángel di maría': '/images/players/Football players/Argentina/angel di maria.webp',
    'julian alvarez': '/images/players/Football players/Argentina/julian alvarez.jpg',
    'lautaro martinez': '/images/players/Football players/Argentina/lautaro martinez.webp',
    'paulo dybala': '/images/players/Football players/Argentina/paulo dybala.webp',
    'alexis mac allister': '/images/players/Football players/Argentina/alexis mac allister.avif',
    'christian romero': '/images/players/Football players/Argentina/christian romero.png',
    'enzo fernandez': '/images/players/Football players/Argentina/enzo fernandez.jpg',
    'enzo fernández': '/images/players/Football players/Argentina/enzo fernandez.jpg',
    'leandro paredes': '/images/players/Football players/Argentina/leandro paredes.webp',
    'marcos acuna': '/images/players/Football players/Argentina/marcos acuna.webp',
    'lisandro martinez': '/images/players/Football players/Argentina/lisandro martinez.jpg',
    'guido rodriguez': '/images/players/Football players/Argentina/guido rodriguez.webp',

    // Brazil
    'neymar': '/images/players/Football players/Brazil/neymar.webp',
    'alisson': '/images/players/Football players/Brazil/alisson.webp',
    'marquinhos': '/images/players/Football players/Brazil/marquinhos.jpg',
    'casemiro': '/images/players/Football players/Brazil/casemiro.jpg',
    'thiago silva': '/images/players/Football players/Brazil/thiago silva.jpg',
    'vinicius junior': '/images/players/Football players/Brazil/vinicius junior.webp',
    'richarlison': '/images/players/Football players/Brazil/richarlison.png',
    'gabriel jesus': '/images/players/Football players/Brazil/gabriel jesus.jpg',
    'lucas paqueta': '/images/players/Football players/Brazil/lucas paqueta.png',
    'danilo': '/images/players/Football players/Brazil/danilo.jpg',
    'ederson': '/images/players/Football players/Brazil/ederson moraes.jpg',
    'alex sandro': '/images/players/Football players/Brazil/alex sandro.webp',
    'antony': '/images/players/Football players/Brazil/antony.jpg',
    'rodrygo': '/images/players/Football players/Brazil/rodrygo.webp',
    'gabriel martinelli': '/images/players/Football players/Brazil/gabriel martinelli.jpg',
    'bruno guimaraes': '/images/players/Football players/Brazil/bruno guimaraes.png',
    'bruno guimarães': '/images/players/Football players/Brazil/bruno guimaraes.png',

    // France
    'kylian mbappe': '/images/players/Football players/France/kylian mbappe.webp',
    'kylian mbappé': '/images/players/Football players/France/kylian mbappe.webp',
    'antoine griezmann': '/images/players/Football players/France/antoine griezmann.jpeg',
    'hugo lloris': '/images/players/Football players/France/hugo lloris.jpg',
    'karim benzema': '/images/players/Football players/France/karim benzema.webp',
    'paul pogba': '/images/players/Football players/France/paul pogba.webp',
        "n'golo kante":   "/images/players/Football players/France/ngolo kante.webp",
    "n'golo kanté":   "/images/players/Football players/France/ngolo kante.webp",
    'ngolo kante':     "/images/players/Football players/France/ngolo kante.webp",
    'raphael varane': '/images/players/Football players/France/raphael varane.jpg',
    'raphaël varane': '/images/players/Football players/France/raphael varane.jpg',
    'mike maignan': '/images/players/Football players/France/mike maignan.webp',
    'ousmane dembele': '/images/players/Football players/France/ousmane dembele.jpg',
    'ousmane dembélé': '/images/players/Football players/France/ousmane dembele.jpg',
    'aurelien tchouameni': '/images/players/Football players/France/aurelien tchouameni.webp',
    'aurélien tchouaméni': '/images/players/Football players/France/aurelien tchouameni.webp',
    'theo hernandez': '/images/players/Football players/France/theo hernandez.webp',
    'dayot upamecano': '/images/players/Football players/France/dayot upamecano.png',
    'jules kounde': '/images/players/Football players/France/jules kounde.webp',
    'jules koundé': '/images/players/Football players/France/jules kounde.webp',
    'eduardo camavinga': '/images/players/Football players/France/eduardo camavinga.png',
    'kingsley coman': '/images/players/Football players/France/kingsley coman.avif',
    'olivier giroud': '/images/players/Football players/France/olivier giroud.jpg',

    // Germany
    'manuel neuer': '/images/players/Football players/Germany/manuel neuer.webp',
    'joshua kimmich': '/images/players/Football players/Germany/joshua kimmich.webp',
    'thomas muller': '/images/players/Football players/Germany/thomas muller.jpg',
    'thomas mueller': '/images/players/Football players/Germany/thomas muller.jpg',
    'thomas müller': '/images/players/Football players/Germany/thomas muller.jpg',
    'kai havertz': '/images/players/Football players/Germany/kai havertz.webp',
    'jamal musiala': '/images/players/Football players/Germany/jamal musiala.webp',
    'leroy sane': '/images/players/Football players/Germany/leroy sane .webp',
    'antonio rudiger': '/images/players/Football players/Germany/antonio ruediger.png',
    'antonio ruediger': '/images/players/Football players/Germany/antonio ruediger.png',
    'antonio rüdiger': '/images/players/Football players/Germany/antonio ruediger.png',
    'ilkay gundogan': '/images/players/Football players/Germany/ilkay gundogan.png',
    'ilkay guendogan': '/images/players/Football players/Germany/ilkay gundogan.png',
    'ilkay gündoğan': '/images/players/Football players/Germany/ilkay gundogan.png',
    'leon goretzka': '/images/players/Football players/Germany/leon goretzka.webp',
    'marc-andre ter stegen': '/images/players/Football players/Germany/marc andre ter stegen.webp',
    'serge gnabry': '/images/players/Football players/Germany/serge gnabry.webp',
    'niklas sule': '/images/players/Football players/Germany/niklas suele.webp',
    'niklas suele': '/images/players/Football players/Germany/niklas suele.webp',
    'niklas süle': '/images/players/Football players/Germany/niklas suele.webp',
    'matthias ginter': '/images/players/Football players/Germany/matthias ginter.webp',
    'david raum': '/images/players/Football players/Germany/david raum.webp',
    'jonas hofmann': '/images/players/Football players/Germany/jonas hofmann.webp',
    'niclas fullkrug': '/images/players/Football players/Germany/Niclas Fuellkrug.webp',
    'niclas fuellkrug': '/images/players/Football players/Germany/Niclas Fuellkrug.webp',
    'niclas füllkrug': '/images/players/Football players/Germany/Niclas Fuellkrug.webp',

    // Portugal
    'cristiano ronaldo': '/images/players/Football players/Portugal/cristiano ronaldo.webp',
    'bernardo silva': '/images/players/Football players/Portugal/bernardo silva.png',
    'bruno fernandes': '/images/players/Football players/Portugal/bruno fernandes .png',
    'ruben dias': '/images/players/Football players/Portugal/ruben dias.webp',
    'joao cancelo': '/images/players/Football players/Portugal/joao cancelo.webp',
    'diogo jota': '/images/players/Football players/Portugal/diogo jota.png',
    'joao felix': '/images/players/Football players/Portugal/joao felix.png',
    'rafael leao': '/images/players/Football players/Portugal/goncalo ramos.webp',
    'goncalo ramos': '/images/players/Football players/Portugal/goncalo ramos.webp',
    'diogo costa': '/images/players/Football players/Portugal/diogo costa.png',
    'ruben neves': '/images/players/Football players/Portugal/ruben neves.png',
    'joao palhinha': '/images/players/Football players/Portugal/joao palhinha.webp',
    'nuno mendes': '/images/players/Football players/Portugal/nuno mendes.webp',
    'vitinha': '/images/players/Football players/Portugal/vitinha.png',
    'raphael guerreiro': '/images/players/Football players/Portugal/raphael guerreiro.webp',
    'otavio': '/images/players/Football players/Portugal/otavio.webp',

    // Spain
    'pedri': '/images/players/Football players/Spain/pedri.webp',
    'gavi': '/images/players/Football players/Spain/gavi.webp',
    'sergio busquets': '/images/players/Football players/Spain/sergio busquets.webp',
    'alvaro morata': '/images/players/Football players/Spain/alvaro morata.webp',
    'jordi alba': '/images/players/Football players/Spain/jordi alba.webp',
    'dani carvajal': '/images/players/Football players/Spain/dani carvajal.webp',
    'aymeric laporte': '/images/players/Football players/Spain/aymeric laporte.webp',
    'ferran torres': '/images/players/Football players/Spain/ferran torres.webp',
    'marco asensio': '/images/players/Football players/Spain/marco asensio.webp',
    'dani olmo': '/images/players/Football players/Spain/dani olmo.webp',
    'unai simon': '/images/players/Football players/Spain/unai simon.webp',
    'koke': '/images/players/Football players/Spain/koke.webp',
    'pau torres': '/images/players/Football players/Spain/pau torres.webp',
    'mikel oyarzabal': '/images/players/Football players/Spain/mikel oyarzabal.webp',
    'ansu fati': '/images/players/Football players/Spain/ansu fati.webp',
    'pau cubarsi': '/images/players/Football players/Spain/pau cubarsi.png',

    // England (football)
    'harry kane': '/images/players/Football players/England/harry kane.webp',
    'jude bellingham': '/images/players/Football players/England/jude bellingham.png',
    'bukayo saka': '/images/players/Football players/England/bukayo saka.avif',
    'declan rice': '/images/players/Football players/England/declan rice.avif',
    'phil foden': '/images/players/Football players/England/phil foden.png',
    'marcus rashford': '/images/players/Football players/England/marcus-rashford.png',
    'jordan pickford': '/images/players/Football players/England/jordan pickford.png',
    'kyle walker': '/images/players/Football players/England/kyle walker.png',
    'john stones': '/images/players/Football players/England/john stones.png',
    'harry maguire': '/images/players/Football players/England/harry maguire.jpg',
    'trent alexander-arnold': '/images/players/Football players/England/trent alexander arnold.png',
    'kieran trippier': '/images/players/Football players/England/kieran-trippier.png',
    'luke shaw': '/images/players/Football players/England/luke shaw.webp',
    'reece james': '/images/players/Football players/England/reece james.jpeg',
    'jack grealish': '/images/players/Football players/England/jack grealish.jpg',
    'jordan henderson': '/images/players/Football players/England/jordan-henderson.png',
};

// ─── Lookup function ────────────────────────────────────────────────────────
const ALL_IMAGES = { ...CRICKET_IMAGES, ...FOOTBALL_IMAGES };

/**
 * Normalizes a name for fuzzy lookup:
 * lowercased, accents stripped, extra spaces removed.
 */
function normalize(name) {
    return (name || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // strip accents
        .replace(/[^a-z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Pre-build a normalised lookup map
const NORMALIZED_MAP = {};
for (const [key, path] of Object.entries(ALL_IMAGES)) {
    NORMALIZED_MAP[normalize(key)] = path;
}

export function getPlayerImage(name) {
    if (!name) return AVATAR;

    const norm = normalize(name);

    // 1. Exact normalised match
    if (NORMALIZED_MAP[norm]) return NORMALIZED_MAP[norm];

    // 2. Partial match — check if any key starts with the normalised name
    //    (handles "Shakib Al Hasan" → "shakib al hasan")
    for (const [key, path] of Object.entries(NORMALIZED_MAP)) {
        if (key.startsWith(norm) || norm.startsWith(key)) return path;
    }

    // 3. Last-name match — try matching just the last word of the player name
    const parts = norm.split(' ');
    const lastName = parts[parts.length - 1];
    if (lastName.length > 2) {
        for (const [key, path] of Object.entries(NORMALIZED_MAP)) {
            if (key.includes(lastName)) return path;
        }
    }

    return AVATAR;
}

// Alias kept for backward compatibility
export const getApiPlayerImage = getPlayerImage;
