/**
 * UI Translation Service (i18n)
 * Provides translations for platform UI elements
 * Lightweight in-memory cache for instant translation
 */

export interface UITranslations {
  // Navigation
  home: string;
  events: string;
  createEvent: string;
  myEvents: string;
  dashboard: string;
  profile: string;
  admin: string;
  signIn: string;
  signOut: string;
  
  // Landing Page
  landingTitle: string;
  landingSubtitle: string;
  landingCTA: string;
  exploreEvents: string;
  
  // Event Cards
  free: string;
  from: string;
  viewDetails: string;
  bookNow: string;
  soldOut: string;
  register: string;
  
  // Categories
  all: string;
  music: string;
  sports: string;
  business: string;
  technology: string;
  arts: string;
  food: string;
  education: string;
  health: string;
  community: string;
  
  // Event Details
  date: string;
  time: string;
  location: string;
  price: string;
  category: string;
  organizer: string;
  capacity: string;
  ticketsAvailable: string;
  description: string;
  about: string;
  
  // Actions
  share: string;
  save: string;
  report: string;
  edit: string;
  delete: string;
  cancel: string;
  confirm: string;
  
  // Filters
  filterByCategory: string;
  filterByDate: string;
  filterByLocation: string;
  filterByPrice: string;
  searchPlaceholder: string;
  
  // Messages
  loading: string;
  noEventsFound: string;
  errorLoading: string;
  successSaved: string;
  successDeleted: string;
  
  // Footer
  aboutUs: string;
  contact: string;
  privacyPolicy: string;
  termsOfService: string;
  followUs: string;
}

// Translations by language
export const UI_TRANSLATIONS: Record<string, UITranslations> = {
  en: {
    // Navigation
    home: 'Home',
    events: 'Events',
    createEvent: 'Create Event',
    myEvents: 'My Events',
    dashboard: 'Dashboard',
    profile: 'Profile',
    admin: 'Admin',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    
    // Landing Page
    landingTitle: 'Discover Amazing Events Near You',
    landingSubtitle: 'Join thousands of people experiencing unforgettable moments',
    landingCTA: 'Get Started',
    exploreEvents: 'Explore Events',
    
    // Event Cards
    free: 'FREE',
    from: 'From',
    viewDetails: 'View Details',
    bookNow: 'Book Now',
    soldOut: 'Sold Out',
    register: 'Register',
    
    // Categories
    all: 'All',
    music: 'Music',
    sports: 'Sports',
    business: 'Business',
    technology: 'Technology',
    arts: 'Arts',
    food: 'Food',
    education: 'Education',
    health: 'Health',
    community: 'Community',
    
    // Event Details
    date: 'Date',
    time: 'Time',
    location: 'Location',
    price: 'Price',
    category: 'Category',
    organizer: 'Organizer',
    capacity: 'Capacity',
    ticketsAvailable: 'Tickets Available',
    description: 'Description',
    about: 'About',
    
    // Actions
    share: 'Share',
    save: 'Save',
    report: 'Report',
    edit: 'Edit',
    delete: 'Delete',
    cancel: 'Cancel',
    confirm: 'Confirm',
    
    // Filters
    filterByCategory: 'Filter by Category',
    filterByDate: 'Filter by Date',
    filterByLocation: 'Filter by Location',
    filterByPrice: 'Filter by Price',
    searchPlaceholder: 'Search events...',
    
    // Messages
    loading: 'Loading...',
    noEventsFound: 'No events found',
    errorLoading: 'Error loading events',
    successSaved: 'Successfully saved',
    successDeleted: 'Successfully deleted',
    
    // Footer
    aboutUs: 'About Us',
    contact: 'Contact',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    followUs: 'Follow Us',
  },
  
  et: {
    // Navigation
    home: 'Avaleht',
    events: 'Üritused',
    createEvent: 'Loo Üritus',
    myEvents: 'Minu Üritused',
    dashboard: 'Töölaud',
    profile: 'Profiil',
    admin: 'Admin',
    signIn: 'Logi Sisse',
    signOut: 'Logi Välja',
    
    // Landing Page
    landingTitle: 'Avasta Huvitavaid Üritusi Sinu Lähedal',
    landingSubtitle: 'Liitu tuhandete inimestega, kes kogevad unustamatuid hetki',
    landingCTA: 'Alusta',
    exploreEvents: 'Uuri Üritusi',
    
    // Event Cards
    free: 'TASUTA',
    from: 'Alates',
    viewDetails: 'Vaata Detaile',
    bookNow: 'Broneeri Nüüd',
    soldOut: 'Välja Müüdud',
    register: 'Registreeru',
    
    // Categories
    all: 'Kõik',
    music: 'Muusika',
    sports: 'Sport',
    business: 'Äri',
    technology: 'Tehnoloogia',
    arts: 'Kunst',
    food: 'Toit',
    education: 'Haridus',
    health: 'Tervis',
    community: 'Kogukond',
    
    // Event Details
    date: 'Kuupäev',
    time: 'Kellaaeg',
    location: 'Asukoht',
    price: 'Hind',
    category: 'Kategooria',
    organizer: 'Korraldaja',
    capacity: 'Mahutavus',
    ticketsAvailable: 'Pileteid Saadaval',
    description: 'Kirjeldus',
    about: 'Info',
    
    // Actions
    share: 'Jaga',
    save: 'Salvesta',
    report: 'Teata',
    edit: 'Muuda',
    delete: 'Kustuta',
    cancel: 'Tühista',
    confirm: 'Kinnita',
    
    // Filters
    filterByCategory: 'Filtreeri Kategooria Järgi',
    filterByDate: 'Filtreeri Kuupäeva Järgi',
    filterByLocation: 'Filtreeri Asukoha Järgi',
    filterByPrice: 'Filtreeri Hinna Järgi',
    searchPlaceholder: 'Otsi üritusi...',
    
    // Messages
    loading: 'Laadimine...',
    noEventsFound: 'Üritusi ei leitud',
    errorLoading: 'Viga ürituste laadimisel',
    successSaved: 'Edukalt salvestatud',
    successDeleted: 'Edukalt kustutatud',
    
    // Footer
    aboutUs: 'Meist',
    contact: 'Kontakt',
    privacyPolicy: 'Privaatsuspoliitika',
    termsOfService: 'Kasutustingimused',
    followUs: 'Jälgi Meid',
  },
  
  fi: {
    // Navigation
    home: 'Etusivu',
    events: 'Tapahtumat',
    createEvent: 'Luo Tapahtuma',
    myEvents: 'Omat Tapahtumat',
    dashboard: 'Kojelauta',
    profile: 'Profiili',
    admin: 'Ylläpito',
    signIn: 'Kirjaudu',
    signOut: 'Kirjaudu Ulos',
    
    // Landing Page
    landingTitle: 'Löydä Upeita Tapahtumia Läheltäsi',
    landingSubtitle: 'Liity tuhansien ihmisten joukkoon kokemaan unohtumattomia hetkiä',
    landingCTA: 'Aloita',
    exploreEvents: 'Selaa Tapahtumia',
    
    // Event Cards
    free: 'ILMAINEN',
    from: 'Alkaen',
    viewDetails: 'Näytä Tiedot',
    bookNow: 'Varaa Nyt',
    soldOut: 'Loppuunmyyty',
    register: 'Rekisteröidy',
    
    // Categories
    all: 'Kaikki',
    music: 'Musiikki',
    sports: 'Urheilu',
    business: 'Liiketoiminta',
    technology: 'Teknologia',
    arts: 'Taide',
    food: 'Ruoka',
    education: 'Koulutus',
    health: 'Terveys',
    community: 'Yhteisö',
    
    // Event Details
    date: 'Päivämäärä',
    time: 'Aika',
    location: 'Sijainti',
    price: 'Hinta',
    category: 'Kategoria',
    organizer: 'Järjestäjä',
    capacity: 'Kapasiteetti',
    ticketsAvailable: 'Lippuja Saatavilla',
    description: 'Kuvaus',
    about: 'Tietoa',
    
    // Actions
    share: 'Jaa',
    save: 'Tallenna',
    report: 'Ilmoita',
    edit: 'Muokkaa',
    delete: 'Poista',
    cancel: 'Peruuta',
    confirm: 'Vahvista',
    
    // Filters
    filterByCategory: 'Suodata Kategorian Mukaan',
    filterByDate: 'Suodata Päivämäärän Mukaan',
    filterByLocation: 'Suodata Sijainnin Mukaan',
    filterByPrice: 'Suodata Hinnan Mukaan',
    searchPlaceholder: 'Etsi tapahtumia...',
    
    // Messages
    loading: 'Ladataan...',
    noEventsFound: 'Tapahtumia ei löytynyt',
    errorLoading: 'Virhe tapahtumien lataamisessa',
    successSaved: 'Tallennettu onnistuneesti',
    successDeleted: 'Poistettu onnistuneesti',
    
    // Footer
    aboutUs: 'Meistä',
    contact: 'Yhteystiedot',
    privacyPolicy: 'Tietosuojakäytäntö',
    termsOfService: 'Käyttöehdot',
    followUs: 'Seuraa Meitä',
  },
  
  // Additional languages (sv, de, fr, es, ru, pl) follow same structure
  sv: {
    home: 'Hem',
    events: 'Evenemang',
    createEvent: 'Skapa Evenemang',
    myEvents: 'Mina Evenemang',
    dashboard: 'Instrumentpanel',
    profile: 'Profil',
    admin: 'Admin',
    signIn: 'Logga In',
    signOut: 'Logga Ut',
    landingTitle: 'Upptäck Fantastiska Evenemang Nära Dig',
    landingSubtitle: 'Gå med tusentals människor som upplever oförglömliga ögonblick',
    landingCTA: 'Kom Igång',
    exploreEvents: 'Utforska Evenemang',
    free: 'GRATIS',
    from: 'Från',
    viewDetails: 'Visa Detaljer',
    bookNow: 'Boka Nu',
    soldOut: 'Slutsålt',
    register: 'Registrera',
    all: 'Alla',
    music: 'Musik',
    sports: 'Sport',
    business: 'Företag',
    technology: 'Teknologi',
    arts: 'Konst',
    food: 'Mat',
    education: 'Utbildning',
    health: 'Hälsa',
    community: 'Gemenskap',
    date: 'Datum',
    time: 'Tid',
    location: 'Plats',
    price: 'Pris',
    category: 'Kategori',
    organizer: 'Arrangör',
    capacity: 'Kapacitet',
    ticketsAvailable: 'Biljetter Tillgängliga',
    description: 'Beskrivning',
    about: 'Om',
    share: 'Dela',
    save: 'Spara',
    report: 'Rapportera',
    edit: 'Redigera',
    delete: 'Ta Bort',
    cancel: 'Avbryt',
    confirm: 'Bekräfta',
    filterByCategory: 'Filtrera Efter Kategori',
    filterByDate: 'Filtrera Efter Datum',
    filterByLocation: 'Filtrera Efter Plats',
    filterByPrice: 'Filtrera Efter Pris',
    searchPlaceholder: 'Sök evenemang...',
    loading: 'Laddar...',
    noEventsFound: 'Inga evenemang hittades',
    errorLoading: 'Fel vid laddning av evenemang',
    successSaved: 'Sparad framgångsrikt',
    successDeleted: 'Raderad framgångsrikt',
    aboutUs: 'Om Oss',
    contact: 'Kontakt',
    privacyPolicy: 'Integritetspolicy',
    termsOfService: 'Användarvillkor',
    followUs: 'Följ Oss',
  },
  
  de: {
    home: 'Startseite',
    events: 'Veranstaltungen',
    createEvent: 'Event Erstellen',
    myEvents: 'Meine Events',
    dashboard: 'Dashboard',
    profile: 'Profil',
    admin: 'Admin',
    signIn: 'Anmelden',
    signOut: 'Abmelden',
    landingTitle: 'Entdecke Tolle Events In Deiner Nähe',
    landingSubtitle: 'Schließe dich tausenden Menschen an, die unvergessliche Momente erleben',
    landingCTA: 'Loslegen',
    exploreEvents: 'Events Erkunden',
    free: 'KOSTENLOS',
    from: 'Ab',
    viewDetails: 'Details Anzeigen',
    bookNow: 'Jetzt Buchen',
    soldOut: 'Ausverkauft',
    register: 'Registrieren',
    all: 'Alle',
    music: 'Musik',
    sports: 'Sport',
    business: 'Business',
    technology: 'Technologie',
    arts: 'Kunst',
    food: 'Essen',
    education: 'Bildung',
    health: 'Gesundheit',
    community: 'Gemeinschaft',
    date: 'Datum',
    time: 'Zeit',
    location: 'Ort',
    price: 'Preis',
    category: 'Kategorie',
    organizer: 'Veranstalter',
    capacity: 'Kapazität',
    ticketsAvailable: 'Tickets Verfügbar',
    description: 'Beschreibung',
    about: 'Über',
    share: 'Teilen',
    save: 'Speichern',
    report: 'Melden',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    cancel: 'Abbrechen',
    confirm: 'Bestätigen',
    filterByCategory: 'Nach Kategorie Filtern',
    filterByDate: 'Nach Datum Filtern',
    filterByLocation: 'Nach Ort Filtern',
    filterByPrice: 'Nach Preis Filtern',
    searchPlaceholder: 'Events Suchen...',
    loading: 'Laden...',
    noEventsFound: 'Keine Events Gefunden',
    errorLoading: 'Fehler Beim Laden',
    successSaved: 'Erfolgreich Gespeichert',
    successDeleted: 'Erfolgreich Gelöscht',
    aboutUs: 'Über Uns',
    contact: 'Kontakt',
    privacyPolicy: 'Datenschutz',
    termsOfService: 'Nutzungsbedingungen',
    followUs: 'Folge Uns',
  },
  
  fr: {
    home: 'Accueil',
    events: 'Événements',
    createEvent: 'Créer Un Événement',
    myEvents: 'Mes Événements',
    dashboard: 'Tableau De Bord',
    profile: 'Profil',
    admin: 'Admin',
    signIn: 'Se Connecter',
    signOut: 'Se Déconnecter',
    landingTitle: 'Découvrez Des Événements Incroyables Près De Chez Vous',
    landingSubtitle: 'Rejoignez des milliers de personnes vivant des moments inoubliables',
    landingCTA: 'Commencer',
    exploreEvents: 'Explorer Les Événements',
    free: 'GRATUIT',
    from: 'À partir de',
    viewDetails: 'Voir Les Détails',
    bookNow: 'Réserver Maintenant',
    soldOut: 'Complet',
    register: 'S\'inscrire',
    all: 'Tous',
    music: 'Musique',
    sports: 'Sports',
    business: 'Affaires',
    technology: 'Technologie',
    arts: 'Arts',
    food: 'Cuisine',
    education: 'Éducation',
    health: 'Santé',
    community: 'Communauté',
    date: 'Date',
    time: 'Heure',
    location: 'Lieu',
    price: 'Prix',
    category: 'Catégorie',
    organizer: 'Organisateur',
    capacity: 'Capacité',
    ticketsAvailable: 'Billets Disponibles',
    description: 'Description',
    about: 'À Propos',
    share: 'Partager',
    save: 'Sauvegarder',
    report: 'Signaler',
    edit: 'Modifier',
    delete: 'Supprimer',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    filterByCategory: 'Filtrer Par Catégorie',
    filterByDate: 'Filtrer Par Date',
    filterByLocation: 'Filtrer Par Lieu',
    filterByPrice: 'Filtrer Par Prix',
    searchPlaceholder: 'Rechercher des événements...',
    loading: 'Chargement...',
    noEventsFound: 'Aucun Événement Trouvé',
    errorLoading: 'Erreur De Chargement',
    successSaved: 'Enregistré Avec Succès',
    successDeleted: 'Supprimé Avec Succès',
    aboutUs: 'À Propos',
    contact: 'Contact',
    privacyPolicy: 'Politique De Confidentialité',
    termsOfService: 'Conditions D\'utilisation',
    followUs: 'Suivez-nous',
  },
  
  es: {
    home: 'Inicio',
    events: 'Eventos',
    createEvent: 'Crear Evento',
    myEvents: 'Mis Eventos',
    dashboard: 'Panel',
    profile: 'Perfil',
    admin: 'Admin',
    signIn: 'Iniciar Sesión',
    signOut: 'Cerrar Sesión',
    landingTitle: 'Descubre Eventos Increíbles Cerca De Ti',
    landingSubtitle: 'Únete a miles de personas experimentando momentos inolvidables',
    landingCTA: 'Comenzar',
    exploreEvents: 'Explorar Eventos',
    free: 'GRATIS',
    from: 'Desde',
    viewDetails: 'Ver Detalles',
    bookNow: 'Reservar Ahora',
    soldOut: 'Agotado',
    register: 'Registrarse',
    all: 'Todos',
    music: 'Música',
    sports: 'Deportes',
    business: 'Negocios',
    technology: 'Tecnología',
    arts: 'Arte',
    food: 'Comida',
    education: 'Educación',
    health: 'Salud',
    community: 'Comunidad',
    date: 'Fecha',
    time: 'Hora',
    location: 'Ubicación',
    price: 'Precio',
    category: 'Categoría',
    organizer: 'Organizador',
    capacity: 'Capacidad',
    ticketsAvailable: 'Entradas Disponibles',
    description: 'Descripción',
    about: 'Acerca De',
    share: 'Compartir',
    save: 'Guardar',
    report: 'Reportar',
    edit: 'Editar',
    delete: 'Eliminar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    filterByCategory: 'Filtrar Por Categoría',
    filterByDate: 'Filtrar Por Fecha',
    filterByLocation: 'Filtrar Por Ubicación',
    filterByPrice: 'Filtrar Por Precio',
    searchPlaceholder: 'Buscar eventos...',
    loading: 'Cargando...',
    noEventsFound: 'No Se Encontraron Eventos',
    errorLoading: 'Error Al Cargar',
    successSaved: 'Guardado Exitosamente',
    successDeleted: 'Eliminado Exitosamente',
    aboutUs: 'Sobre Nosotros',
    contact: 'Contacto',
    privacyPolicy: 'Política De Privacidad',
    termsOfService: 'Términos De Servicio',
    followUs: 'Síguenos',
  },
  
  ru: {
    home: 'Главная',
    events: 'События',
    createEvent: 'Создать Событие',
    myEvents: 'Мои События',
    dashboard: 'Панель',
    profile: 'Профиль',
    admin: 'Админ',
    signIn: 'Войти',
    signOut: 'Выйти',
    landingTitle: 'Откройте Удивительные События Рядом',
    landingSubtitle: 'Присоединяйтесь к тысячам людей, переживающих незабываемые моменты',
    landingCTA: 'Начать',
    exploreEvents: 'Исследовать События',
    free: 'БЕСПЛАТНО',
    from: 'От',
    viewDetails: 'Подробнее',
    bookNow: 'Забронировать',
    soldOut: 'Распродано',
    register: 'Зарегистрироваться',
    all: 'Все',
    music: 'Музыка',
    sports: 'Спорт',
    business: 'Бизнес',
    technology: 'Технологии',
    arts: 'Искусство',
    food: 'Еда',
    education: 'Образование',
    health: 'Здоровье',
    community: 'Сообщество',
    date: 'Дата',
    time: 'Время',
    location: 'Место',
    price: 'Цена',
    category: 'Категория',
    organizer: 'Организатор',
    capacity: 'Вместимость',
    ticketsAvailable: 'Билетов Доступно',
    description: 'Описание',
    about: 'О',
    share: 'Поделиться',
    save: 'Сохранить',
    report: 'Сообщить',
    edit: 'Редактировать',
    delete: 'Удалить',
    cancel: 'Отмена',
    confirm: 'Подтвердить',
    filterByCategory: 'Фильтр По Категории',
    filterByDate: 'Фильтр По Дате',
    filterByLocation: 'Фильтр По Месту',
    filterByPrice: 'Фильтр По Цене',
    searchPlaceholder: 'Поиск событий...',
    loading: 'Загрузка...',
    noEventsFound: 'События Не Найдены',
    errorLoading: 'Ошибка Загрузки',
    successSaved: 'Успешно Сохранено',
    successDeleted: 'Успешно Удалено',
    aboutUs: 'О Нас',
    contact: 'Контакт',
    privacyPolicy: 'Политика Конфиденциальности',
    termsOfService: 'Условия Использования',
    followUs: 'Подписывайтесь',
  },
  
  pl: {
    home: 'Strona Główna',
    events: 'Wydarzenia',
    createEvent: 'Utwórz Wydarzenie',
    myEvents: 'Moje Wydarzenia',
    dashboard: 'Panel',
    profile: 'Profil',
    admin: 'Admin',
    signIn: 'Zaloguj',
    signOut: 'Wyloguj',
    landingTitle: 'Odkryj Niesamowite Wydarzenia W Pobliżu',
    landingSubtitle: 'Dołącz do tysięcy ludzi przeżywających niezapomniane chwile',
    landingCTA: 'Rozpocznij',
    exploreEvents: 'Przeglądaj Wydarzenia',
    free: 'DARMOWE',
    from: 'Od',
    viewDetails: 'Zobacz Szczegóły',
    bookNow: 'Zarezerwuj Teraz',
    soldOut: 'Wyprzedane',
    register: 'Zarejestruj',
    all: 'Wszystkie',
    music: 'Muzyka',
    sports: 'Sport',
    business: 'Biznes',
    technology: 'Technologia',
    arts: 'Sztuka',
    food: 'Jedzenie',
    education: 'Edukacja',
    health: 'Zdrowie',
    community: 'Społeczność',
    date: 'Data',
    time: 'Czas',
    location: 'Lokalizacja',
    price: 'Cena',
    category: 'Kategoria',
    organizer: 'Organizator',
    capacity: 'Pojemność',
    ticketsAvailable: 'Dostępne Bilety',
    description: 'Opis',
    about: 'O',
    share: 'Udostępnij',
    save: 'Zapisz',
    report: 'Zgłoś',
    edit: 'Edytuj',
    delete: 'Usuń',
    cancel: 'Anuluj',
    confirm: 'Potwierdź',
    filterByCategory: 'Filtruj Według Kategorii',
    filterByDate: 'Filtruj Według Daty',
    filterByLocation: 'Filtruj Według Lokalizacji',
    filterByPrice: 'Filtruj Według Ceny',
    searchPlaceholder: 'Szukaj wydarzeń...',
    loading: 'Ładowanie...',
    noEventsFound: 'Nie Znaleziono Wydarzeń',
    errorLoading: 'Błąd Ładowania',
    successSaved: 'Zapisano Pomyślnie',
    successDeleted: 'Usunięto Pomyślnie',
    aboutUs: 'O Nas',
    contact: 'Kontakt',
    privacyPolicy: 'Polityka Prywatności',
    termsOfService: 'Warunki Użytkowania',
    followUs: 'Śledź Nas',
  },
};

// In-memory cache for instant access
let currentLanguage = 'en';
let currentTranslations = UI_TRANSLATIONS.en;

/**
 * Set current language and update cache
 */
export const setUILanguage = (languageCode: string): void => {
  if (UI_TRANSLATIONS[languageCode]) {
    currentLanguage = languageCode;
    currentTranslations = UI_TRANSLATIONS[languageCode];
    console.log('🌐 UI Language set to:', languageCode);
  } else {
    console.warn(`Language ${languageCode} not supported, falling back to English`);
    currentLanguage = 'en';
    currentTranslations = UI_TRANSLATIONS.en;
  }
};

/**
 * Get translation for a key
 * Ultra-fast - O(1) lookup from in-memory cache
 */
export const t = (key: keyof UITranslations): string => {
  return currentTranslations[key] || UI_TRANSLATIONS.en[key] || key;
};

/**
 * Get all translations for current language
 */
export const getAllTranslations = (): UITranslations => {
  return currentTranslations;
};

/**
 * Get current UI language
 */
export const getCurrentUILanguage = (): string => {
  return currentLanguage;
};

/**
 * Check if language is supported
 */
export const isUILanguageSupported = (languageCode: string): boolean => {
  return !!UI_TRANSLATIONS[languageCode];
};

/**
 * Get all supported UI languages
 */
export const getSupportedUILanguages = (): string[] => {
  return Object.keys(UI_TRANSLATIONS);
};

// Initialize with English by default
setUILanguage('en');
