/**
 * UI Translation System
 * Supports platform interface translations for major languages
 */

export interface UITranslations {
  // Navigation
  nav: {
    home: string;
    events: string;
    map: string;
    dashboard: string;
    profile: string;
    settings: string;
    tickets: string;
    communities: string;
    blog: string;
    pricing: string;
    help: string;
    signIn: string;
    signUp: string;
    signOut: string;
    createEvent: string;
  };
  
  // Landing Page
  landing: {
    hero: {
      title: string;
      subtitle: string;
      ctaPrimary: string;
      ctaSecondary: string;
      signupBenefitsTitle: string;
      benefit1: string;
      benefit2: string;
      benefit3: string;
      stat1: string;
      stat2Label: string;
      stat2: string;
      stat3: string;
    };
    stats: {
      cities: string;
      worldwide: string;
      freeEvents: string;
      activeNow: string;
    };
    features: {
      title: string;
      subtitle: string;
      whyTitle: string;
      aiTranslation: string;
      languagesSupported: string;
      securePayments: string;
      pciCompliant: string;
      zeroFees: string;
      freeForAttendees: string;
      liveMap: {
        title: string;
        description: string;
      };
      aiPowered: {
        title: string;
        description: string;
      };
      social: {
        title: string;
        description: string;
      };
      tickets: {
        title: string;
        description: string;
      };
    };
    pricing: {
      title: string;
      subtitle: string;
      free: string;
      basic: string;
      pro: string;
      perMonth: string;
      getStarted: string;
    };
    footer: {
      about: string;
      contact: string;
      terms: string;
      privacy: string;
      allRightsReserved: string;
    };
  };
  
  // Common UI Elements
  common: {
    loading: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    search: string;
    filter: string;
    back: string;
    next: string;
    submit: string;
    confirm: string;
    close: string;
    seeMore: string;
    showLess: string;
    learnMore: string;
    getStarted: string;
    viewDetails: string;
  };
  
  // Event Related
  events: {
    title: string;
    createNew: string;
    upcoming: string;
    past: string;
    myEvents: string;
    discover: string;
    category: string;
    date: string;
    location: string;
    price: string;
    free: string;
    noEventsFound: string;
    loadMore: string;
  };
  
  // User Profile
  profile: {
    title: string;
    settings: string;
    notifications: string;
    tickets: string;
    myEvents: string;
    language: string;
    preferences: string;
    account: string;
    security: string;
  };
  
  // Authentication
  auth: {
    signIn: string;
    signUp: string;
    signOut: string;
    email: string;
    password: string;
    forgotPassword: string;
    rememberMe: string;
    noAccount: string;
    haveAccount: string;
    createAccount: string;
  };
  
  // Forms
  forms: {
    name: string;
    description: string;
    category: string;
    startDate: string;
    endDate: string;
    location: string;
    address: string;
    city: string;
    country: string;
    price: string;
    capacity: string;
    image: string;
    required: string;
    optional: string;
  };
  
  // Notifications
  notifications: {
    title: string;
    markAsRead: string;
    deleteAll: string;
    noNotifications: string;
    newEvent: string;
    eventUpdate: string;
    ticketPurchase: string;
  };
  
  // Dashboard
  dashboard: {
    title: string;
    overview: string;
    analytics: string;
    totalEvents: string;
    upcomingEvents: string;
    pastEvents: string;
    totalTickets: string;
    revenue: string;
  };
  
  // Language Selector
  language: {
    selectLanguage: string;
    searchLanguages: string;
    registeredUsers: string;
    guestLimit: string;
    unlockLanguages: string;
  };
}

export const translations: Record<string, UITranslations> = {
  en: {
    nav: {
      home: 'Home',
      events: 'Events',
      map: 'Map',
      dashboard: 'Dashboard',
      profile: 'Profile',
      settings: 'Settings',
      tickets: 'Tickets',
      communities: 'Communities',
      blog: 'Blog',
      pricing: 'Pricing',
      help: 'Help',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      signOut: 'Sign Out',
      createEvent: 'Create Event',
    },
    landing: {
      hero: {
        title: 'Stop Missing Out',
        subtitle: 'We solve the problem of high platform fees and language barriers. EventNexus uses AI to discover and translate events into 50+ languages.',
        ctaPrimary: 'Get Started Free',
        ctaSecondary: 'Explore the Map',
        signupBenefitsTitle: 'Sign up to unlock:',
        benefit1: 'Personalized event recommendations based on your interests',
        benefit2: 'Save favorite events to your wishlist',
        benefit3: 'One-click ticket booking with instant QR codes',
        stat1: 'attendees discovering events right now',
        stat2Label: 'Zero',
        stat2: 'platform fees for attendees',
        stat3: 'languages supported by AI',
      },
      stats: {
        cities: 'Cities',
        worldwide: 'Worldwide',
        freeEvents: 'Free Events',
        activeNow: 'Active now',
      },
      features: {
        title: 'Why EventNexus?',
        subtitle: 'The all-in-one platform for discovering and managing events',
        whyTitle: 'Why EventNexus?',
        aiTranslation: 'AI Translation',
        languagesSupported: '50+ languages supported',
        securePayments: 'Secure Payments',
        pciCompliant: 'PCI-compliant checkout',
        zeroFees: 'Zero Fees',
        freeForAttendees: 'Free for attendees',
        liveMap: {
          title: 'Live Event Map',
          description: 'See events on an interactive map. Filter by radius, category, date—discover events intuitively.',
        },
        aiPowered: {
          title: 'AI-Powered',
          description: 'Smart recommendations, instant translations, and intelligent search powered by advanced AI.',
        },
        social: {
          title: 'Social Discovery',
          description: 'Join communities, connect with like-minded people, discover events through your network.',
        },
        tickets: {
          title: 'Seamless Ticketing',
          description: 'Buy, sell, and manage tickets effortlessly. QR code scanning, instant confirmation.',
        },
      },
      pricing: {
        title: 'Choose Your Plan',
        subtitle: 'Start free, upgrade when you need more',
        free: 'Free',
        basic: 'Basic',
        pro: 'Pro',
        perMonth: '/month',
        getStarted: 'Get Started',
      },
      footer: {
        about: 'About',
        contact: 'Contact',
        terms: 'Terms of Service',
        privacy: 'Privacy Policy',
        allRightsReserved: 'All rights reserved',
      },
    },
    common: {
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      search: 'Search',
      filter: 'Filter',
      back: 'Back',
      next: 'Next',
      submit: 'Submit',
      confirm: 'Confirm',
      close: 'Close',
      seeMore: 'See More',
      showLess: 'Show Less',
      learnMore: 'Learn More',
      getStarted: 'Get Started',
      viewDetails: 'View Details',
    },
    events: {
      title: 'Events',
      createNew: 'Create New Event',
      upcoming: 'Upcoming',
      past: 'Past',
      myEvents: 'My Events',
      discover: 'Discover',
      category: 'Category',
      date: 'Date',
      location: 'Location',
      price: 'Price',
      free: 'Free',
      noEventsFound: 'No events found',
      loadMore: 'Load More',
    },
    profile: {
      title: 'Profile',
      settings: 'Settings',
      notifications: 'Notifications',
      tickets: 'My Tickets',
      myEvents: 'My Events',
      language: 'Language',
      preferences: 'Preferences',
      account: 'Account',
      security: 'Security',
    },
    auth: {
      signIn: 'Sign In',
      signUp: 'Sign Up',
      signOut: 'Sign Out',
      email: 'Email',
      password: 'Password',
      forgotPassword: 'Forgot Password?',
      rememberMe: 'Remember Me',
      noAccount: "Don't have an account?",
      haveAccount: 'Already have an account?',
      createAccount: 'Create Account',
    },
    forms: {
      name: 'Name',
      description: 'Description',
      category: 'Category',
      startDate: 'Start Date',
      endDate: 'End Date',
      location: 'Location',
      address: 'Address',
      city: 'City',
      country: 'Country',
      price: 'Price',
      capacity: 'Capacity',
      image: 'Image',
      required: 'Required',
      optional: 'Optional',
    },
    notifications: {
      title: 'Notifications',
      markAsRead: 'Mark as Read',
      deleteAll: 'Delete All',
      noNotifications: 'No notifications',
      newEvent: 'New Event',
      eventUpdate: 'Event Update',
      ticketPurchase: 'Ticket Purchase',
    },
    dashboard: {
      title: 'Dashboard',
      overview: 'Overview',
      analytics: 'Analytics',
      totalEvents: 'Total Events',
      upcomingEvents: 'Upcoming Events',
      pastEvents: 'Past Events',
      totalTickets: 'Total Tickets',
      revenue: 'Revenue',
    },
    language: {
      selectLanguage: 'Select Language',
      searchLanguages: 'Search languages...',
      registeredUsers: 'As a registered user, you can choose from 100+ languages!',
      guestLimit: 'Limited selection for guests',
      unlockLanguages: 'Register to unlock 100+ languages',
    },
  },
  
  et: {
    nav: {
      home: 'Avaleht',
      events: 'Üritused',
      map: 'Kaart',
      dashboard: 'Töölaud',
      profile: 'Profiil',
      settings: 'Seaded',
      tickets: 'Piletid',
      communities: 'Kogukonnad',
      blog: 'Blogi',
      pricing: 'Hinnad',
      help: 'Abi',
      signIn: 'Logi sisse',
      signUp: 'Registreeru',
      signOut: 'Logi välja',
      createEvent: 'Loo üritus',
    },
    landing: {
      hero: {
        title: 'Ära jää enam ilma',
        subtitle: 'Lahendame kõrgete platvormitasude ja keelebarjääride probleemi. EventNexus kasutab AI-d ürituste leidmiseks ja tõlkimiseks üle 50 keelde.',
        ctaPrimary: 'Alusta tasuta',
        ctaSecondary: 'Uuri kaarti',
        signupBenefitsTitle: 'Registreeru ja saa juurdepääs:',
        benefit1: 'Isikupärastatud ürituste soovitused sinu huvide põhjal',
        benefit2: 'Salvesta lemmiküritused oma soovide nimekirja',
        benefit3: 'Ühe klõpsuga piletite broneerimine koos koheste QR-koodidega',
        stat1: 'osalejat avastavad üritusi praegu',
        stat2Label: 'Null',
        stat2: 'platvormitasusid osalejatele',
        stat3: 'AI toetatud keelt',
      },
      stats: {
        cities: 'Linnad',
        worldwide: 'Üle maailma',
        freeEvents: 'Tasuta üritused',
        activeNow: 'Aktiivsed praegu',
      },
      features: {
        title: 'Miks EventNexus?',
        subtitle: 'Kõik-ühes platvorm ürituste avastamiseks ja haldamiseks',
        whyTitle: 'Miks EventNexus?',
        aiTranslation: 'AI tõlge',
        languagesSupported: '50+ toetatud keelt',
        securePayments: 'Turvalised maksed',
        pciCompliant: 'PCI-nõuetele vastav kassasüsteem',
        zeroFees: 'Null tasusid',
        freeForAttendees: 'Tasuta osalejatele',
        liveMap: {
          title: 'Reaalajas ürituste kaart',
          description: 'Vaata üritusi interaktiivsel kaardil. Filtreeri raadiuse, kategooria, kuupäeva järgi - avasta üritusi intuitiivselt.',
        },
        aiPowered: {
          title: 'AI-põhine',
          description: 'Nutikad soovitused, kiired tõlked ja intelligentne otsing, mida toetab kõrgtasemel AI.',
        },
        social: {
          title: 'Sotsiaalne avastamine',
          description: 'Liitu kogukondadega, suhtle samameelsete inimestega, avasta üritusi oma võrgustiku kaudu.',
        },
        tickets: {
          title: 'Sujuv piletisüsteem',
          description: 'Osta, müü ja halda pileteid vaevata. QR-koodi skaneerimine, kohene kinnitamine.',
        },
      },
      pricing: {
        title: 'Vali oma plaan',
        subtitle: 'Alusta tasuta, täienda kui vajad rohkemat',
        free: 'Tasuta',
        basic: 'Baas',
        pro: 'Pro',
        perMonth: '/kuus',
        getStarted: 'Alusta',
      },
      footer: {
        about: 'Meist',
        contact: 'Kontakt',
        terms: 'Kasutustingimused',
        privacy: 'Privaatsuspoliitika',
        allRightsReserved: 'Kõik õigused kaitstud',
      },
    },
    common: {
      loading: 'Laadimine...',
      save: 'Salvesta',
      cancel: 'Tühista',
      delete: 'Kustuta',
      edit: 'Muuda',
      search: 'Otsi',
      filter: 'Filtreeri',
      back: 'Tagasi',
      next: 'Järgmine',
      submit: 'Saada',
      confirm: 'Kinnita',
      close: 'Sulge',
      seeMore: 'Vaata rohkem',
      showLess: 'Näita vähem',
      learnMore: 'Loe rohkem',
      getStarted: 'Alusta',
      viewDetails: 'Vaata detaile',
    },
    events: {
      title: 'Üritused',
      createNew: 'Loo uus üritus',
      upcoming: 'Tulevased',
      past: 'Möödunud',
      myEvents: 'Minu üritused',
      discover: 'Avasta',
      category: 'Kategooria',
      date: 'Kuupäev',
      location: 'Asukoht',
      price: 'Hind',
      free: 'Tasuta',
      noEventsFound: 'Üritusi ei leitud',
      loadMore: 'Laadi rohkem',
    },
    profile: {
      title: 'Profiil',
      settings: 'Seaded',
      notifications: 'Teavitused',
      tickets: 'Minu piletid',
      myEvents: 'Minu üritused',
      language: 'Keel',
      preferences: 'Eelistused',
      account: 'Konto',
      security: 'Turvalisus',
    },
    auth: {
      signIn: 'Logi sisse',
      signUp: 'Registreeru',
      signOut: 'Logi välja',
      email: 'E-post',
      password: 'Parool',
      forgotPassword: 'Unustasid parooli?',
      rememberMe: 'Mäleta mind',
      noAccount: 'Pole kontot?',
      haveAccount: 'Juba on konto?',
      createAccount: 'Loo konto',
    },
    forms: {
      name: 'Nimi',
      description: 'Kirjeldus',
      category: 'Kategooria',
      startDate: 'Alguskuupäev',
      endDate: 'Lõppkuupäev',
      location: 'Asukoht',
      address: 'Aadress',
      city: 'Linn',
      country: 'Riik',
      price: 'Hind',
      capacity: 'Mahutavus',
      image: 'Pilt',
      required: 'Kohustuslik',
      optional: 'Valikuline',
    },
    notifications: {
      title: 'Teavitused',
      markAsRead: 'Märgi loetuks',
      deleteAll: 'Kustuta kõik',
      noNotifications: 'Teavitusi pole',
      newEvent: 'Uus üritus',
      eventUpdate: 'Ürituse uuendus',
      ticketPurchase: 'Pileti ost',
    },
    dashboard: {
      title: 'Töölaud',
      overview: 'Ülevaade',
      analytics: 'Analüütika',
      totalEvents: 'Üritusi kokku',
      upcomingEvents: 'Tulevased üritused',
      pastEvents: 'Möödunud üritused',
      totalTickets: 'Pileteid kokku',
      revenue: 'Tulu',
    },
    language: {
      selectLanguage: 'Vali keel',
      searchLanguages: 'Otsi keeli...',
      registeredUsers: 'Registreeritud kasutajana saad valida üle 100 keele!',
      guestLimit: 'Külalistele piiratud valik',
      unlockLanguages: 'Registreeru, et avada 100+ keelt',
    },
  },
  
  ru: {
    nav: {
      home: 'Главная',
      events: 'События',
      map: 'Карта',
      dashboard: 'Панель',
      profile: 'Профиль',
      settings: 'Настройки',
      tickets: 'Билеты',
      communities: 'Сообщества',
      blog: 'Блог',
      pricing: 'Цены',
      help: 'Помощь',
      signIn: 'Войти',
      signUp: 'Регистрация',
      signOut: 'Выйти',
      createEvent: 'Создать событие',
    },
    landing: {
      hero: {
        title: 'Не упускайте возможности',
        subtitle: 'Мы решаем проблему высоких комиссий платформ и языковых барьеров. EventNexus использует ИИ для поиска и перевода событий на более 50 языков.',
        ctaPrimary: 'Начать бесплатно',
        ctaSecondary: 'Изучить карту',
        signupBenefitsTitle: 'Зарегистрируйтесь, чтобы получить:',
        benefit1: 'Персонализированные рекомендации событий на основе ваших интересов',
        benefit2: 'Сохраните избранные события в список желаний',
        benefit3: 'Бронирование билетов одним кликом с мгновенными QR-кодами',
        stat1: 'участников открывают события прямо сейчас',
        stat2Label: 'Ноль',
        stat2: 'комиссий платформы для участников',
        stat3: 'языков поддерживается ИИ',
      },
      stats: {
        cities: 'Города',
        worldwide: 'По всему миру',
        freeEvents: 'Бесплатные события',
        activeNow: 'Активны сейчас',
      },
      features: {
        title: 'Почему EventNexus?',
        subtitle: 'Универсальная платформа для поиска и управления событиями',
        whyTitle: 'Почему EventNexus?',
        aiTranslation: 'Перевод ИИ',
        languagesSupported: '50+ поддерживаемых языков',
        securePayments: 'Безопасные платежи',
        pciCompliant: 'Платёжная система PCI-совместимая',
        zeroFees: 'Нулевые комиссии',
        freeForAttendees: 'Бесплатно для участников',
        liveMap: {
          title: 'Карта событий в реальном времени',
          description: 'Просматривайте события на интерактивной карте. Фильтруйте по радиусу, категории, дате - находите события интуитивно.',
        },
        aiPowered: {
          title: 'На основе ИИ',
          description: 'Умные рекомендации, мгновенные переводы и интеллектуальный поиск на основе передового ИИ.',
        },
        social: {
          title: 'Социальные открытия',
          description: 'Присоединяйтесь к сообществам, общайтесь с единомышленниками, открывайте события через свою сеть.',
        },
        tickets: {
          title: 'Удобная система билетов',
          description: 'Покупайте, продавайте и управляйте билетами без усилий. Сканирование QR-кода, мгновенное подтверждение.',
        },
      },
      pricing: {
        title: 'Выберите план',
        subtitle: 'Начните бесплатно, обновитесь когда нужно больше',
        free: 'Бесплатно',
        basic: 'Базовый',
        pro: 'Про',
        perMonth: '/месяц',
        getStarted: 'Начать',
      },
      footer: {
        about: 'О нас',
        contact: 'Контакты',
        terms: 'Условия использования',
        privacy: 'Политика конфиденциальности',
        allRightsReserved: 'Все права защищены',
      },
    },
    common: {
      loading: 'Загрузка...',
      save: 'Сохранить',
      cancel: 'Отмена',
      delete: 'Удалить',
      edit: 'Редактировать',
      search: 'Поиск',
      filter: 'Фильтр',
      back: 'Назад',
      next: 'Далее',
      submit: 'Отправить',
      confirm: 'Подтвердить',
      close: 'Закрыть',
      seeMore: 'Показать больше',
      showLess: 'Показать меньше',
      learnMore: 'Узнать больше',
      getStarted: 'Начать',
      viewDetails: 'Подробнее',
    },
    events: {
      title: 'События',
      createNew: 'Создать новое событие',
      upcoming: 'Предстоящие',
      past: 'Прошедшие',
      myEvents: 'Мои события',
      discover: 'Открыть',
      category: 'Категория',
      date: 'Дата',
      location: 'Место',
      price: 'Цена',
      free: 'Бесплатно',
      noEventsFound: 'События не найдены',
      loadMore: 'Загрузить ещё',
    },
    profile: {
      title: 'Профиль',
      settings: 'Настройки',
      notifications: 'Уведомления',
      tickets: 'Мои билеты',
      myEvents: 'Мои события',
      language: 'Язык',
      preferences: 'Предпочтения',
      account: 'Аккаунт',
      security: 'Безопасность',
    },
    auth: {
      signIn: 'Войти',
      signUp: 'Регистрация',
      signOut: 'Выйти',
      email: 'Email',
      password: 'Пароль',
      forgotPassword: 'Забыли пароль?',
      rememberMe: 'Запомнить меня',
      noAccount: 'Нет аккаунта?',
      haveAccount: 'Уже есть аккаунт?',
      createAccount: 'Создать аккаунт',
    },
    forms: {
      name: 'Название',
      description: 'Описание',
      category: 'Категория',
      startDate: 'Дата начала',
      endDate: 'Дата окончания',
      location: 'Место',
      address: 'Адрес',
      city: 'Город',
      country: 'Страна',
      price: 'Цена',
      capacity: 'Вместимость',
      image: 'Изображение',
      required: 'Обязательно',
      optional: 'Необязательно',
    },
    notifications: {
      title: 'Уведомления',
      markAsRead: 'Отметить как прочитанное',
      deleteAll: 'Удалить все',
      noNotifications: 'Нет уведомлений',
      newEvent: 'Новое событие',
      eventUpdate: 'Обновление события',
      ticketPurchase: 'Покупка билета',
    },
    dashboard: {
      title: 'Панель',
      overview: 'Обзор',
      analytics: 'Аналитика',
      totalEvents: 'Всего событий',
      upcomingEvents: 'Предстоящие события',
      pastEvents: 'Прошедшие события',
      totalTickets: 'Всего билетов',
      revenue: 'Доход',
    },
    language: {
      selectLanguage: 'Выбрать язык',
      searchLanguages: 'Поиск языков...',
      registeredUsers: 'Зарегистрированные пользователи могут выбрать из более чем 100 языков!',
      guestLimit: 'Ограниченный выбор для гостей',
      unlockLanguages: 'Зарегистрируйтесь, чтобы разблокировать 100+ языков',
    },
  },
  
  fi: {
    nav: {
      home: 'Etusivu',
      events: 'Tapahtumat',
      map: 'Kartta',
      dashboard: 'Kojelauta',
      profile: 'Profiili',
      settings: 'Asetukset',
      tickets: 'Liput',
      communities: 'Yhteisöt',
      blog: 'Blogi',
      pricing: 'Hinnoittelu',
      help: 'Apua',
      signIn: 'Kirjaudu sisään',
      signUp: 'Rekisteröidy',
      signOut: 'Kirjaudu ulos',
      createEvent: 'Luo tapahtuma',
    },
    landing: {
      hero: {
        title: 'Älä jää paitsi',
        subtitle: 'Ratkaisemme korkeiden alustamaksujen ja kieliesteiden ongelmat. EventNexus käyttää tekoälyä tapahtumien löytämiseen ja kääntämiseen yli 50 kielelle.',
        ctaPrimary: 'Aloita ilmaiseksi',
        ctaSecondary: 'Tutki karttaa',
        signupBenefitsTitle: 'Rekisteröidy avataksesi:',
        benefit1: 'Henkilökohtaiset tapahtumasuositukset kiinnostuksiesi perusteella',
        benefit2: 'Tallenna suosikkitapahtumat toivelistallesi',
        benefit3: 'Yhdellä napsautuksella lippuvaraus välittömillä QR-koodeilla',
        stat1: 'osallistujaa löytää tapahtumia juuri nyt',
        stat2Label: 'Nolla',
        stat2: 'alustamaksuja osallistujille',
        stat3: 'tekoälyn tukemaa kieltä',
      },
      stats: {
        cities: 'Kaupungit',
        worldwide: 'Maailmanlaajuisesti',
        freeEvents: 'Ilmaiset tapahtumat',
        activeNow: 'Aktiiviset nyt',
      },
      features: {
        title: 'Miksi EventNexus?',
        subtitle: 'Kaikki-yhdessä-alusta tapahtumien löytämiseen ja hallintaan',
        whyTitle: 'Miksi EventNexus?',
        aiTranslation: 'Tekoälykäännös',
        languagesSupported: '50+ tuettua kieltä',
        securePayments: 'Turvalliset maksut',
        pciCompliant: 'PCI-yhteensopiva kassa',
        zeroFees: 'Nolla maksuja',
        freeForAttendees: 'Ilmainen osallistujille',
        liveMap: {
          title: 'Reaaliaikainen tapahtumakartta',
          description: 'Katso tapahtumia interaktiivisella kartalla. Suodata säteen, kategorian, päivämäärän mukaan - löydä tapahtumia intuitiivisesti.',
        },
        aiPowered: {
          title: 'AI-pohjainen',
          description: 'Älykkäät suositukset, välittömät käännökset ja älykäs haku edistyneen AI:n avulla.',
        },
        social: {
          title: 'Sosiaalinen löytäminen',
          description: 'Liity yhteisöihin, ota yhteyttä samanhenkisiin ihmisiin, löydä tapahtumia verkostosi kautta.',
        },
        tickets: {
          title: 'Saumaton lipunjärjestelmä',
          description: 'Osta, myy ja hallitse lippuja vaivattomasti. QR-koodin skannaus, välitön vahvistus.',
        },
      },
      pricing: {
        title: 'Valitse suunnitelmasi',
        subtitle: 'Aloita ilmaiseksi, päivitä kun tarvitset enemmän',
        free: 'Ilmainen',
        basic: 'Perus',
        pro: 'Pro',
        perMonth: '/kk',
        getStarted: 'Aloita',
      },
      footer: {
        about: 'Tietoja',
        contact: 'Yhteystiedot',
        terms: 'Käyttöehdot',
        privacy: 'Tietosuojakäytäntö',
        allRightsReserved: 'Kaikki oikeudet pidätetään',
      },
    },
    common: {
      loading: 'Ladataan...',
      save: 'Tallenna',
      cancel: 'Peruuta',
      delete: 'Poista',
      edit: 'Muokkaa',
      search: 'Hae',
      filter: 'Suodata',
      back: 'Takaisin',
      next: 'Seuraava',
      submit: 'Lähetä',
      confirm: 'Vahvista',
      close: 'Sulje',
      seeMore: 'Näytä lisää',
      showLess: 'Näytä vähemmän',
      learnMore: 'Lue lisää',
      getStarted: 'Aloita',
      viewDetails: 'Näytä tiedot',
    },
    events: {
      title: 'Tapahtumat',
      createNew: 'Luo uusi tapahtuma',
      upcoming: 'Tulevat',
      past: 'Menneet',
      myEvents: 'Omat tapahtumat',
      discover: 'Löydä',
      category: 'Kategoria',
      date: 'Päivämäärä',
      location: 'Sijainti',
      price: 'Hinta',
      free: 'Ilmainen',
      noEventsFound: 'Tapahtumia ei löytynyt',
      loadMore: 'Lataa lisää',
    },
    profile: {
      title: 'Profiili',
      settings: 'Asetukset',
      notifications: 'Ilmoitukset',
      tickets: 'Omat liput',
      myEvents: 'Omat tapahtumat',
      language: 'Kieli',
      preferences: 'Asetukset',
      account: 'Tili',
      security: 'Turvallisuus',
    },
    auth: {
      signIn: 'Kirjaudu sisään',
      signUp: 'Rekisteröidy',
      signOut: 'Kirjaudu ulos',
      email: 'Sähköposti',
      password: 'Salasana',
      forgotPassword: 'Unohditko salasanan?',
      rememberMe: 'Muista minut',
      noAccount: 'Ei tiliä?',
      haveAccount: 'Onko sinulla jo tili?',
      createAccount: 'Luo tili',
    },
    forms: {
      name: 'Nimi',
      description: 'Kuvaus',
      category: 'Kategoria',
      startDate: 'Alkamispäivä',
      endDate: 'Päättymispäivä',
      location: 'Sijainti',
      address: 'Osoite',
      city: 'Kaupunki',
      country: 'Maa',
      price: 'Hinta',
      capacity: 'Kapasiteetti',
      image: 'Kuva',
      required: 'Pakollinen',
      optional: 'Valinnainen',
    },
    notifications: {
      title: 'Ilmoitukset',
      markAsRead: 'Merkitse luetuksi',
      deleteAll: 'Poista kaikki',
      noNotifications: 'Ei ilmoituksia',
      newEvent: 'Uusi tapahtuma',
      eventUpdate: 'Tapahtuman päivitys',
      ticketPurchase: 'Lipun osto',
    },
    dashboard: {
      title: 'Kojelauta',
      overview: 'Yleiskatsaus',
      analytics: 'Analytiikka',
      totalEvents: 'Tapahtumia yhteensä',
      upcomingEvents: 'Tulevat tapahtumat',
      pastEvents: 'Menneet tapahtumat',
      totalTickets: 'Lippuja yhteensä',
      revenue: 'Tulot',
    },
    language: {
      selectLanguage: 'Valitse kieli',
      searchLanguages: 'Hae kieliä...',
      registeredUsers: 'Rekisteröityneenä käyttäjänä voit valita yli 100 kieltä!',
      guestLimit: 'Rajoitettu valinta vieraille',
      unlockLanguages: 'Rekisteröidy avataksesi 100+ kieltä',
    },
  },
  
  de: {
    nav: {
      home: 'Startseite',
      events: 'Veranstaltungen',
      map: 'Karte',
      dashboard: 'Dashboard',
      profile: 'Profil',
      settings: 'Einstellungen',
      tickets: 'Tickets',
      communities: 'Gemeinschaften',
      blog: 'Blog',
      pricing: 'Preise',
      help: 'Hilfe',
      signIn: 'Anmelden',
      signUp: 'Registrieren',
      signOut: 'Abmelden',
      createEvent: 'Veranstaltung erstellen',
    },
    landing: {
      hero: {
        title: 'Verpassen Sie nichts mehr',
        subtitle: 'Wir lösen das Problem hoher Plattformgebühren und Sprachbarrieren. EventNexus nutzt KI, um Veranstaltungen zu finden und in über 50 Sprachen zu übersetzen.',
        ctaPrimary: 'Kostenlos starten',
        ctaSecondary: 'Karte erkunden',
        signupBenefitsTitle: 'Registrieren Sie sich, um freizuschalten:',
        benefit1: 'Personalisierte Veranstaltungsempfehlungen basierend auf Ihren Interessen',
        benefit2: 'Speichern Sie Lieblingsveranstaltungen in Ihrer Wunschliste',
        benefit3: 'Ein-Klick-Ticketbuchung mit sofortigen QR-Codes',
        stat1: 'Teilnehmer entdecken gerade Veranstaltungen',
        stat2Label: 'Null',
        stat2: 'Plattformgebühren für Teilnehmer',
        stat3: 'von KI unterstützte Sprachen',
      },
      stats: {
        cities: 'Städte',
        worldwide: 'Weltweit',
        freeEvents: 'Kostenlose Veranstaltungen',
        activeNow: 'Aktuell aktiv',
      },
      features: {
        title: 'Warum EventNexus?',
        subtitle: 'Die All-in-One-Plattform zum Entdecken und Verwalten von Veranstaltungen',
        whyTitle: 'Warum EventNexus?',
        aiTranslation: 'KI-Übersetzung',
        languagesSupported: '50+ unterstützte Sprachen',
        securePayments: 'Sichere Zahlungen',
        pciCompliant: 'PCI-konforme Kasse',
        zeroFees: 'Null Gebühren',
        freeForAttendees: 'Kostenlos für Teilnehmer',
        liveMap: {
          title: 'Live-Veranstaltungskarte',
          description: 'Sehen Sie Veranstaltungen auf einer interaktiven Karte. Filtern Sie nach Radius, Kategorie, Datum - entdecken Sie Veranstaltungen intuitiv.',
        },
        aiPowered: {
          title: 'KI-gestützt',
          description: 'Intelligente Empfehlungen, sofortige Übersetzungen und intelligente Suche mit fortschrittlicher KI.',
        },
        social: {
          title: 'Soziale Entdeckung',
          description: 'Treten Sie Gemeinschaften bei, vernetzen Sie sich mit Gleichgesinnten, entdecken Sie Veranstaltungen über Ihr Netzwerk.',
        },
        tickets: {
          title: 'Nahtloses Ticketing',
          description: 'Kaufen, verkaufen und verwalten Sie Tickets mühelos. QR-Code-Scannen, sofortige Bestätigung.',
        },
      },
      pricing: {
        title: 'Wählen Sie Ihren Plan',
        subtitle: 'Kostenlos starten, upgraden wenn Sie mehr brauchen',
        free: 'Kostenlos',
        basic: 'Basic',
        pro: 'Pro',
        perMonth: '/Monat',
        getStarted: 'Loslegen',
      },
      footer: {
        about: 'Über uns',
        contact: 'Kontakt',
        terms: 'Nutzungsbedingungen',
        privacy: 'Datenschutzerklärung',
        allRightsReserved: 'Alle Rechte vorbehalten',
      },
    },
    common: {
      loading: 'Wird geladen...',
      save: 'Speichern',
      cancel: 'Abbrechen',
      delete: 'Löschen',
      edit: 'Bearbeiten',
      search: 'Suchen',
      filter: 'Filtern',
      back: 'Zurück',
      next: 'Weiter',
      submit: 'Absenden',
      confirm: 'Bestätigen',
      close: 'Schließen',
      seeMore: 'Mehr anzeigen',
      showLess: 'Weniger anzeigen',
      learnMore: 'Mehr erfahren',
      getStarted: 'Loslegen',
      viewDetails: 'Details anzeigen',
    },
    events: {
      title: 'Veranstaltungen',
      createNew: 'Neue Veranstaltung erstellen',
      upcoming: 'Kommend',
      past: 'Vergangen',
      myEvents: 'Meine Veranstaltungen',
      discover: 'Entdecken',
      category: 'Kategorie',
      date: 'Datum',
      location: 'Ort',
      price: 'Preis',
      free: 'Kostenlos',
      noEventsFound: 'Keine Veranstaltungen gefunden',
      loadMore: 'Mehr laden',
    },
    profile: {
      title: 'Profil',
      settings: 'Einstellungen',
      notifications: 'Benachrichtigungen',
      tickets: 'Meine Tickets',
      myEvents: 'Meine Veranstaltungen',
      language: 'Sprache',
      preferences: 'Einstellungen',
      account: 'Konto',
      security: 'Sicherheit',
    },
    auth: {
      signIn: 'Anmelden',
      signUp: 'Registrieren',
      signOut: 'Abmelden',
      email: 'E-Mail',
      password: 'Passwort',
      forgotPassword: 'Passwort vergessen?',
      rememberMe: 'Angemeldet bleiben',
      noAccount: 'Kein Konto?',
      haveAccount: 'Bereits ein Konto?',
      createAccount: 'Konto erstellen',
    },
    forms: {
      name: 'Name',
      description: 'Beschreibung',
      category: 'Kategorie',
      startDate: 'Startdatum',
      endDate: 'Enddatum',
      location: 'Ort',
      address: 'Adresse',
      city: 'Stadt',
      country: 'Land',
      price: 'Preis',
      capacity: 'Kapazität',
      image: 'Bild',
      required: 'Erforderlich',
      optional: 'Optional',
    },
    notifications: {
      title: 'Benachrichtigungen',
      markAsRead: 'Als gelesen markieren',
      deleteAll: 'Alle löschen',
      noNotifications: 'Keine Benachrichtigungen',
      newEvent: 'Neue Veranstaltung',
      eventUpdate: 'Veranstaltungsaktualisierung',
      ticketPurchase: 'Ticketkauf',
    },
    dashboard: {
      title: 'Dashboard',
      overview: 'Übersicht',
      analytics: 'Analytik',
      totalEvents: 'Veranstaltungen gesamt',
      upcomingEvents: 'Kommende Veranstaltungen',
      pastEvents: 'Vergangene Veranstaltungen',
      totalTickets: 'Tickets gesamt',
      revenue: 'Umsatz',
    },
    language: {
      selectLanguage: 'Sprache auswählen',
      searchLanguages: 'Sprachen suchen...',
      registeredUsers: 'Als registrierter Benutzer können Sie aus über 100 Sprachen wählen!',
      guestLimit: 'Begrenzte Auswahl für Gäste',
      unlockLanguages: 'Registrieren Sie sich, um 100+ Sprachen freizuschalten',
    },
  },
};
