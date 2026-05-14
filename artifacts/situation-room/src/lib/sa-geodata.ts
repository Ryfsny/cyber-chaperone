export interface SASuburb { name: string }
export interface SACity   { name: string; suburbs: SASuburb[] }
export interface SAProvince { name: string; cities: SACity[] }

export const SA_GEO: SAProvince[] = [
  {
    name: "Gauteng",
    cities: [
      { name: "Johannesburg", suburbs: [
        { name: "Sandton" }, { name: "Randburg" }, { name: "Roodepoort" }, { name: "Fourways" },
        { name: "Midrand" }, { name: "Northcliff" }, { name: "Melville" }, { name: "Greenside" },
        { name: "Parkhurst" }, { name: "Parktown" }, { name: "Houghton" }, { name: "Rosebank" },
        { name: "Hyde Park" }, { name: "Illovo" }, { name: "Morningside" }, { name: "Bryanston" },
        { name: "Sunninghill" }, { name: "Rivonia" }, { name: "Paulshof" }, { name: "Douglasdale" },
        { name: "Lonehill" }, { name: "Dainfern" }, { name: "Waterfall" }, { name: "Kyalami" },
        { name: "Petervale" }, { name: "Randpark Ridge" }, { name: "Florida" }, { name: "Weltevreden Park" },
        { name: "Radiokop" }, { name: "Ruimsig" }, { name: "Honeydew" }, { name: "Cosmo City" },
        { name: "Soweto" }, { name: "Orlando" }, { name: "Diepkloof" }, { name: "Meadowlands" },
        { name: "Alexandra" }, { name: "Wynberg" }, { name: "Linbro Park" }, { name: "Marlboro" },
        { name: "Edenvale" }, { name: "Bedfordview" }, { name: "Observatory" }, { name: "Kensington" },
        { name: "Yeoville" }, { name: "Troyeville" }, { name: "Jeppestown" }, { name: "City Centre" },
        { name: "Newtown" }, { name: "Fordsburg" }, { name: "Mayfair" }, { name: "Bosmont" },
        { name: "Crown Gardens" }, { name: "Mondeor" }, { name: "Mulbarton" }, { name: "Bassonia" },
        { name: "Glenvista" }, { name: "Glenanda" }, { name: "Oakdene" }, { name: "Ormonde" },
        { name: "Lenasia" }, { name: "Ennerdale" }, { name: "Orange Farm" },
      ]},
      { name: "Pretoria / Tshwane", suburbs: [
        { name: "Arcadia" }, { name: "Sunnyside" }, { name: "Hatfield" }, { name: "Brooklyn" },
        { name: "Waterkloof" }, { name: "Waterkloof Ridge" }, { name: "Lynnwood" }, { name: "Menlyn" },
        { name: "Faerie Glen" }, { name: "Garsfontein" }, { name: "Montana" }, { name: "Wonderboom" },
        { name: "Gezina" }, { name: "Silverton" }, { name: "Pretoria North" }, { name: "Pretoria East" },
        { name: "Pretoria West" }, { name: "Atteridgeville" }, { name: "Mamelodi" }, { name: "Soshanguve" },
        { name: "Mabopane" }, { name: "Moreleta Park" }, { name: "The Willows" }, { name: "Constantia Park" },
        { name: "Zwavelpoort" }, { name: "Irene" }, { name: "Lyttelton" }, { name: "Clubview" },
      ]},
      { name: "Centurion", suburbs: [
        { name: "Centurion CBD" }, { name: "Highveld" }, { name: "Eldoraigne" }, { name: "Lyttelton Manor" },
        { name: "Wierda Park" }, { name: "Doringkloof" }, { name: "Hennopspark" }, { name: "Thatchfield" },
        { name: "Pierre van Ryneveld" }, { name: "Centurion Gate" }, { name: "Midstream" },
      ]},
      { name: "Ekurhuleni / East Rand", suburbs: [
        { name: "Germiston" }, { name: "Boksburg" }, { name: "Benoni" }, { name: "Brakpan" },
        { name: "Springs" }, { name: "Alberton" }, { name: "Kempton Park" }, { name: "Edenvale" },
        { name: "Tembisa" }, { name: "Daveyton" }, { name: "Vosloorus" }, { name: "Thokoza" },
        { name: "Katlehong" }, { name: "Bedfordview" }, { name: "Eastleigh" }, { name: "Northmead" },
        { name: "Rynfield" }, { name: "Crystal Park" }, { name: "Atlasville" },
      ]},
      { name: "Vanderbijlpark", suburbs: [
        { name: "Vanderbijlpark CBD" }, { name: "Roshnee" }, { name: "Fern Valley" }, { name: "Sebokeng" },
        { name: "Evaton" },
      ]},
      { name: "Vereeniging", suburbs: [
        { name: "Vereeniging CBD" }, { name: "Three Rivers" }, { name: "Unitas Park" }, { name: "Sharpeville" },
        { name: "Bophelong" }, { name: "Boipatong" },
      ]},
      { name: "Soweto", suburbs: [
        { name: "Orlando East" }, { name: "Orlando West" }, { name: "Meadowlands" }, { name: "Dobsonville" },
        { name: "Diepkloof" }, { name: "Kliptown" }, { name: "Naledi" }, { name: "Mapetla" },
        { name: "Chiawelo" }, { name: "Protea Glen" }, { name: "Jabulani" }, { name: "Pennyville" },
      ]},
    ],
  },
  {
    name: "Western Cape",
    cities: [
      { name: "Cape Town", suburbs: [
        { name: "City Bowl" }, { name: "Green Point" }, { name: "Sea Point" }, { name: "Camps Bay" },
        { name: "Clifton" }, { name: "Bakoven" }, { name: "Bantry Bay" }, { name: "Fresnaye" },
        { name: "De Waterkant" }, { name: "Bo-Kaap" }, { name: "Gardens" }, { name: "Tamboerskloof" },
        { name: "Oranjezicht" }, { name: "Vredehoek" }, { name: "Observatory" }, { name: "Mowbray" },
        { name: "Rondebosch" }, { name: "Claremont" }, { name: "Newlands" }, { name: "Bishopscourt" },
        { name: "Constantia" }, { name: "Tokai" }, { name: "Bergvliet" }, { name: "Diep River" },
        { name: "Wynberg" }, { name: "Plumstead" }, { name: "Kenilworth" }, { name: "Lansdowne" },
        { name: "Athlone" }, { name: "Mitchells Plain" }, { name: "Khayelitsha" }, { name: "Gugulethu" },
        { name: "Nyanga" }, { name: "Langa" }, { name: "Bonteheuwel" }, { name: "Bellville" },
        { name: "Parow" }, { name: "Goodwood" }, { name: "Tygervalley" }, { name: "Durbanville" },
        { name: "Brackenfell" }, { name: "Kraaifontein" }, { name: "Kuils River" }, { name: "Eerste River" },
        { name: "Strand" }, { name: "Somerset West" }, { name: "Gordon's Bay" }, { name: "Gordons Bay" },
        { name: "Muizenberg" }, { name: "Fish Hoek" }, { name: "Simon's Town" }, { name: "Noordhoek" },
        { name: "Hout Bay" }, { name: "Llandudno" }, { name: "Sunset Beach" }, { name: "Milnerton" },
        { name: "Table View" }, { name: "Bloubergstrand" }, { name: "Melkbosstrand" }, { name: "Parklands" },
      ]},
      { name: "Stellenbosch", suburbs: [
        { name: "Stellenbosch Central" }, { name: "Cloetesville" }, { name: "Ida's Valley" },
        { name: "Jamestown" }, { name: "Die Boord" }, { name: "Brandwacht" }, { name: "Mostertsdrift" },
      ]},
      { name: "Paarl", suburbs: [
        { name: "Paarl Central" }, { name: "Dal Josafat" }, { name: "Klein Drakenstein" },
        { name: "Mbekweni" }, { name: "Wellington" },
      ]},
      { name: "George", suburbs: [
        { name: "George Central" }, { name: "Loerie Park" }, { name: "Pacaltsdorp" },
        { name: "Blanco" }, { name: "Heather Park" }, { name: "Rosemoor" },
      ]},
      { name: "Knysna", suburbs: [
        { name: "Knysna Central" }, { name: "Leisure Isle" }, { name: "Sedgefield" },
        { name: "Brenton-on-Sea" }, { name: "Rheenendal" }, { name: "Hornlee" },
      ]},
      { name: "Mossel Bay", suburbs: [
        { name: "Mossel Bay Central" }, { name: "Dana Bay" }, { name: "Hartenbos" },
        { name: "Little Brak River" }, { name: "Great Brak River" },
      ]},
      { name: "Hermanus", suburbs: [
        { name: "Hermanus Central" }, { name: "Onrus" }, { name: "Vermont" },
        { name: "Sandbaai" }, { name: "Voelklip" }, { name: "Hawston" },
      ]},
      { name: "Worcester", suburbs: [
        { name: "Worcester Central" }, { name: "Avian Park" }, { name: "Zwelethemba" },
        { name: "Zweletemba" },
      ]},
      { name: "Franschhoek", suburbs: [
        { name: "Franschhoek Village" }, { name: "La Motte" }, { name: "Groendal" },
      ]},
      { name: "Oudtshoorn", suburbs: [
        { name: "Oudtshoorn Central" }, { name: "Bridgton" }, { name: "Bongolethu" },
      ]},
      { name: "Swellendam", suburbs: [
        { name: "Swellendam Central" }, { name: "Railton" },
      ]},
      { name: "Ceres", suburbs: [
        { name: "Ceres Central" }, { name: "Bella Vista" }, { name: "Op-die-Berg" },
      ]},
    ],
  },
  {
    name: "KwaZulu-Natal",
    cities: [
      { name: "Durban / eThekwini", suburbs: [
        { name: "Berea" }, { name: "Glenwood" }, { name: "Morningside" }, { name: "Musgrave" },
        { name: "Overport" }, { name: "Sydenham" }, { name: "Greyville" }, { name: "Durban North" },
        { name: "Umhlanga" }, { name: "La Lucia" }, { name: "Glenashley" }, { name: "Durban CBD" },
        { name: "Point" }, { name: "Bluff" }, { name: "Wentworth" }, { name: "Merebank" },
        { name: "Isipingo" }, { name: "Amanzimtoti" }, { name: "Umlazi" }, { name: "KwaMashu" },
        { name: "Ntuzuma" }, { name: "Inanda" }, { name: "Phoenix" }, { name: "Newlands East" },
        { name: "Pinetown" }, { name: "New Germany" }, { name: "Westville" }, { name: "Hillcrest" },
        { name: "Kloof" }, { name: "Gillitts" }, { name: "Botha's Hill" }, { name: "Reservoir Hills" },
        { name: "Chatsworth" }, { name: "Merebank" }, { name: "Tongaat" }, { name: "Verulam" },
        { name: "Stanger / KwaDukuza" }, { name: "Ballito" }, { name: "Salt Rock" }, { name: "Sheffield Beach" },
      ]},
      { name: "Pietermaritzburg", suburbs: [
        { name: "Pietermaritzburg CBD" }, { name: "Scottsville" }, { name: "Hayfields" },
        { name: "Northdale" }, { name: "Woodlands" }, { name: "Edendale" }, { name: "Imbali" },
        { name: "Bisley" }, { name: "Chase Valley" }, { name: "Ashburton" },
      ]},
      { name: "Richards Bay", suburbs: [
        { name: "Richards Bay Central" }, { name: "Arboretum" }, { name: "Meer en See" },
        { name: "Empangeni" }, { name: "Meerensee" },
      ]},
      { name: "Newcastle", suburbs: [
        { name: "Newcastle Central" }, { name: "Majuba" }, { name: "Dundee Road" },
        { name: "Madadeni" }, { name: "Osizweni" },
      ]},
      { name: "Ladysmith", suburbs: [
        { name: "Ladysmith Central" }, { name: "Steadville" }, { name: "Ezakheni" },
      ]},
      { name: "Port Shepstone", suburbs: [
        { name: "Port Shepstone Central" }, { name: "Marburg" }, { name: "Ramsgate" },
        { name: "Margate" }, { name: "Uvongo" }, { name: "Shelly Beach" },
      ]},
      { name: "Eshowe", suburbs: [
        { name: "Eshowe Central" }, { name: "KwaMondi" },
      ]},
    ],
  },
  {
    name: "Eastern Cape",
    cities: [
      { name: "Gqeberha / Port Elizabeth", suburbs: [
        { name: "Central" }, { name: "North End" }, { name: "Humewood" }, { name: "Summerstrand" },
        { name: "Walmer" }, { name: "Kabega Park" }, { name: "Lorraine" }, { name: "Linton Grange" },
        { name: "Charlo" }, { name: "Framesby" }, { name: "Sherwood" }, { name: "Greenacres" },
        { name: "Newton Park" }, { name: "Rowallan Park" }, { name: "Sunridge Park" }, { name: "Mill Park" },
        { name: "Uitenhage" }, { name: "Despatch" }, { name: "Motherwell" }, { name: "KwaZakhele" },
        { name: "New Brighton" }, { name: "Bethelsdorp" },
      ]},
      { name: "East London / Buffalo City", suburbs: [
        { name: "East London CBD" }, { name: "Quigney" }, { name: "Berea" }, { name: "Vincent" },
        { name: "Greenfields" }, { name: "Gonubie" }, { name: "Nahoon" }, { name: "Beacon Bay" },
        { name: "Cambridge" }, { name: "King William's Town" }, { name: "Mdantsane" }, { name: "Zwelitsha" },
        { name: "Bhisho" },
      ]},
      { name: "Makhanda / Grahamstown", suburbs: [
        { name: "Grahamstown Central" }, { name: "Joza" }, { name: "Tantyi" }, { name: "Fingo Village" },
      ]},
      { name: "Mthatha", suburbs: [
        { name: "Mthatha CBD" }, { name: "Ncambedlana" }, { name: "Ngangelizwe" }, { name: "Fort Gale" },
      ]},
      { name: "Jeffreys Bay", suburbs: [
        { name: "Jeffreys Bay Central" }, { name: "Fountains Mall" }, { name: "Wavecrest" },
        { name: "Paradise Beach" },
      ]},
      { name: "Queenstown / Komani", suburbs: [
        { name: "Queenstown Central" }, { name: "Mlungisi" }, { name: "Ezibeleni" },
      ]},
    ],
  },
  {
    name: "Free State",
    cities: [
      { name: "Bloemfontein / Mangaung", suburbs: [
        { name: "Bloemfontein CBD" }, { name: "Westdene" }, { name: "Willows" }, { name: "Universitas" },
        { name: "Langenhoven Park" }, { name: "Dan Pienaar" }, { name: "Brandwag" }, { name: "Bayswater" },
        { name: "Fichardt Park" }, { name: "Fauna" }, { name: "Navalsig" }, { name: "Heuwelsig" },
        { name: "Bochabela" }, { name: "Mangaung" }, { name: "Rocklands" }, { name: "Phahameng" },
        { name: "Botshabelo" }, { name: "Thaba Nchu" },
      ]},
      { name: "Welkom", suburbs: [
        { name: "Welkom Central" }, { name: "Riebeeckstad" }, { name: "Thabong" },
        { name: "Virginia" }, { name: "Allanridge" },
      ]},
      { name: "Sasolburg", suburbs: [
        { name: "Sasolburg Central" }, { name: "Zamdela" }, { name: "Vaalpark" },
      ]},
      { name: "Kroonstad", suburbs: [
        { name: "Kroonstad Central" }, { name: "Maokeng" }, { name: "Brentpark" },
      ]},
      { name: "Phuthaditjhaba", suburbs: [
        { name: "Phuthaditjhaba Central" }, { name: "Harrismith" }, { name: "Kestell" },
      ]},
    ],
  },
  {
    name: "Limpopo",
    cities: [
      { name: "Polokwane", suburbs: [
        { name: "Polokwane CBD" }, { name: "Bendor" }, { name: "Nirvana" }, { name: "Fauna Park" },
        { name: "Welgelegen" }, { name: "Ivy Park" }, { name: "Seshego" }, { name: "Mankweng" },
        { name: "Westenburg" }, { name: "Park" }, { name: "Flora Park" }, { name: "Penina Park" },
      ]},
      { name: "Tzaneen", suburbs: [
        { name: "Tzaneen CBD" }, { name: "Nkowankowa" }, { name: "Letsitele" }, { name: "Haenertsburg" },
      ]},
      { name: "Makhado / Louis Trichardt", suburbs: [
        { name: "Louis Trichardt Central" }, { name: "Waterval" }, { name: "Eltivillas" },
        { name: "Vhufuli" }, { name: "Dzanani" },
      ]},
      { name: "Musina", suburbs: [
        { name: "Musina Central" }, { name: "Nancefield" }, { name: "Messina" },
      ]},
      { name: "Mokopane / Potgietersrus", suburbs: [
        { name: "Mokopane Central" }, { name: "Mahwelereng" }, { name: "Mokopane Ext" },
      ]},
      { name: "Bela-Bela / Warmbaths", suburbs: [
        { name: "Bela-Bela Central" }, { name: "Pienaarsrivier" }, { name: "Settlers" },
      ]},
      { name: "Phalaborwa", suburbs: [
        { name: "Phalaborwa Central" }, { name: "Namakgale" }, { name: "Lulekani" },
      ]},
      { name: "Thohoyandou", suburbs: [
        { name: "Thohoyandou Central" }, { name: "Sibasa" }, { name: "Tshilwavhusiku" },
        { name: "Makhuvha" }, { name: "Makwarela" },
      ]},
    ],
  },
  {
    name: "Mpumalanga",
    cities: [
      { name: "Mbombela / Nelspruit", suburbs: [
        { name: "Nelspruit CBD" }, { name: "Sonheuwel" }, { name: "Steiltes" }, { name: "West Acres" },
        { name: "Riverside Park" }, { name: "Nelspruit Ext" }, { name: "Mataffin" }, { name: "Nkomazi" },
        { name: "Kanyamazane" }, { name: "Kabokweni" },
      ]},
      { name: "eMalahleni / Witbank", suburbs: [
        { name: "Witbank CBD" }, { name: "Del Judor" }, { name: "Reyno Ridge" }, { name: "Tasbet Park" },
        { name: "Ackerville" }, { name: "Phola" }, { name: "Ogies" },
      ]},
      { name: "Middelburg", suburbs: [
        { name: "Middelburg Central" }, { name: "Mhluzi" }, { name: "Kanonkop" }, { name: "Nasaret" },
        { name: "Aerorand" },
      ]},
      { name: "Secunda", suburbs: [
        { name: "Secunda Central" }, { name: "Evander" }, { name: "Trichardt" }, { name: "Kinross" },
      ]},
      { name: "Ermelo", suburbs: [
        { name: "Ermelo Central" }, { name: "Wesselton" }, { name: "Breyten" }, { name: "Lothair" },
      ]},
      { name: "Standerton", suburbs: [
        { name: "Standerton Central" }, { name: "Sakhile" }, { name: "Morgenzon" },
      ]},
    ],
  },
  {
    name: "North West",
    cities: [
      { name: "Rustenburg", suburbs: [
        { name: "Rustenburg CBD" }, { name: "Waterfall East" }, { name: "Safari" }, { name: "Cashan" },
        { name: "Proteapark" }, { name: "Tlhabane" }, { name: "Boitekong" }, { name: "Phokeng" },
        { name: "Meriting" }, { name: "Geelhoutpark" },
      ]},
      { name: "Potchefstroom", suburbs: [
        { name: "Potchefstroom CBD" }, { name: "Promosa" }, { name: "Ikageng" }, { name: "Mohadin" },
        { name: "Bedelia" }, { name: "Baillie Park" },
      ]},
      { name: "Klerksdorp", suburbs: [
        { name: "Klerksdorp CBD" }, { name: "Doringkruin" }, { name: "Flamwood" }, { name: "La Hoff" },
        { name: "Jouberton" }, { name: "Alabama" }, { name: "Stilfontein" },
      ]},
      { name: "Mahikeng / Mafikeng", suburbs: [
        { name: "Mafikeng Central" }, { name: "Montshiwa" }, { name: "Mmabatho" }, { name: "Unit 14" },
      ]},
      { name: "Brits", suburbs: [
        { name: "Brits Central" }, { name: "Oukasie" }, { name: "Odi" }, { name: "Schoemansville" },
        { name: "Hartbeespoort" },
      ]},
      { name: "Vryburg", suburbs: [
        { name: "Vryburg Central" }, { name: "Huhudi" }, { name: "Glenred" },
      ]},
    ],
  },
  {
    name: "Northern Cape",
    cities: [
      { name: "Kimberley", suburbs: [
        { name: "Kimberley CBD" }, { name: "Galeshewe" }, { name: "Greenpoint" }, { name: "Hadison Park" },
        { name: "Herlea" }, { name: "Beaconsfield" }, { name: "Phutanang" }, { name: "Roodepan" },
        { name: "Monument Heights" },
      ]},
      { name: "Upington", suburbs: [
        { name: "Upington Central" }, { name: "Oranje-Lug" }, { name: "Louisvale" }, { name: "Paballelo" },
      ]},
      { name: "Springbok", suburbs: [
        { name: "Springbok Central" }, { name: "Nababeep" }, { name: "Okiep" }, { name: "Steinkopf" },
      ]},
      { name: "De Aar", suburbs: [
        { name: "De Aar Central" }, { name: "Nonzwakazi" }, { name: "Britstown" },
      ]},
      { name: "Kuruman", suburbs: [
        { name: "Kuruman Central" }, { name: "Mothibistad" }, { name: "Wrenchville" },
      ]},
    ],
  },
];

/** All 9 province names */
export const SA_PROVINCE_NAMES = SA_GEO.map((p) => p.name);

/** Cities for a given province (empty array if not found) */
export function citiesForProvince(province: string): SACity[] {
  return SA_GEO.find((p) => p.name === province)?.cities ?? [];
}

/** Suburbs for a given province + city */
export function suburbsForCity(province: string, city: string): SASuburb[] {
  return citiesForProvince(province).find((c) => c.name === city)?.suburbs ?? [];
}
