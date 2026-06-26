export type LangKey = "en" | "am";

const translations = {
  en: {
    // App
    appName: "Saba Wolaitegna SDA Lyrics Songs",
    appSub: "Wolaitegna lyrics SDA Songs",

    // Auth
    signIn: "Sign in",
    join: "Join Saba App",
    createAcc: "Create account",
    email: "Email",
    password: "Password",
    fullName: "Full name",
    singerName: "Singer name",
    singerHint: "Name shown on your songs",
    btnSignIn: "Sign in",
    btnCreate: "Create account",
    noAcc: "No account?",
    haveAcc: "Have an account?",
    invalidCreds: "Invalid email or password.",
    emailTaken: "Email already registered.",
    fillAll: "Please fill all fields.",
    signingIn: "Signing in...",
    creatingAcc: "Creating account...",

    // Nav
    home: "Home",
    songs: "Songs",
    setlists: "Setlists",
    favs: "Favorites",
    notifs: "Updates",

    // Admin
    adminDash: "Dashboard",
    members: "Members",
    totalSongs: "Songs",
    totalWorshipers: "Worshipers",
    totalSingers: "Singers",
    totalSetlists: "Setlists",
    allMembers: "All members",

    // Home
    greeting: "Good day,",
    verse: '"Let everything that has breath praise the Lord." — Psalm 150:6',
    nextSat: "Next Saturday",
    allSongs: "All songs",
    myFavs: "Favorites",

    // Songs
    search: "Search songs...",
    addSong: "Add new song",
    editSong: "Edit song",
    newSong: "New song",
    songTitle: "Title",
    key: "Key",
    tempo: "Tempo",
    singer: "Singer",
    category: "Category",
    lyrics: "Lyrics",
    lyricsHint: "VERSE 1:\nLyrics here...\n\nCHORUS:\nLyrics here...",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    confirmDelete: "Are you sure you want to delete this?",

    // Setlists
    newSetlist: "New setlist",
    buildSetlist: "Build setlist",
    setlistTheme: "Theme / title",
    setlistDate: "Date (e.g. Sat, May 24)",
    pickSongs: "Pick songs to include:",
    createSetlist: "Create setlist",
    deleteSetlist: "Delete setlist",
    editSetlist: "Edit setlist",

    // Lyrics
    keyOf: "Key",
    savedFav: "Saved to favorites",
    removeFav: "Remove from favorites",
    noFavs: "No favorites yet.\nTap any song to save it here.",

    // Notifications
    notifTitle: "Updates & notifications",

    // Settings
    settings: "Settings",
    appearance: "Appearance",
    fontSize: "Font Size",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    lightMode: "Light mode",
    darkMode: "Dark mode",
    language: "Language",
    textDisplay: "Text Display",
    lineSpacing: "Line Spacing",
    boldLyrics: "Bold Lyrics",
    preview: "Preview",
    account: "Account",
    logout: "Sign out",
    credit: "Developed by 3AMMM Media and Communication",

    // Misc
    songs2: "songs",
    loading: "Loading...",
    error: "Something went wrong",
    retry: "Retry",
    justNow: "Just now",
    minAgo: "min ago",
    hrAgo: "hr ago",
    all: "All",
    tapAvatarLogout: "Tap your avatar to sign out",

    // Social & Engagement
    tiktok: "TikTok",
    instagram: "Instagram",
    facebook: "Facebook",
    telegram: "Telegram",
    visitWebsite: "Visit Website",
    shareThoughts: "Share your thoughts",
    feedbackComments: "Feedback and Comments",
    followUs: "Follow us",
    contactUs: "Contact us",
    appUpdates: "App Updates",
    checkForUpdates: "Check for updates",

    // Settings / actions
    writeFeedback: "Write your feedback here...",
    sendViaTelegram: "Send via Telegram",
    signOutTitle: "Sign Out",
    confirmSignOut: "Are you sure you want to sign out?",
    emptyFeedbackTitle: "Empty Feedback",
    writeMessageFirst: "Please write a message first.",
    telegramOpenError: "Could not open Telegram. Make sure the app is installed.",
    telegramLaunchError: "Failed to launch Telegram.",
    upToDate: "Up to Date",
    runningVersion: "You are running version",
    latestVersion: "the latest version.",
    couldNotSignOut: "Could not sign out. Please try again.",
    office: "Office",
    english: "English",
    amharic: "አማርኛ",
  },

  am: {
    // App
    appName: "ሳባ ወላይትኛ የሰ.ደ.አ መዝሙር ግጥሞች",
    appSub: "የወላይትኛ ሰ.ደ.አ መዝሙሮች",

    // Auth
    signIn: "ይግቡ",
    join: "ሳባን ይቀላቀሉ",
    createAcc: "መለያ ይፍጠሩ",
    email: "ኢሜይል",
    password: "የይለፍ ቃል",
    fullName: "ሙሉ ስም",
    singerName: "የዘማሪ ስም",
    singerHint: "በመዝሙሮችዎ ላይ የሚታየው ስም",
    btnSignIn: "ይግቡ",
    btnCreate: "መለያ ይፍጠሩ",
    noAcc: "መለያ የለዎትም?",
    haveAcc: "መለያ አለዎት?",
    invalidCreds: "ኢሜይል ወይም የይለፍ ቃል ትክክል አይደለም።",
    emailTaken: "ኢሜይሉ አስቀድሞ ተመዝግቧል።",
    fillAll: "እባክዎ ሁሉንም መረጃዎች ይሙሉ",
    signingIn: "በመግባት ላይ...",
    creatingAcc: "መለያ በመፍጠር ላይ...",

    // Nav
    home: "መነሻ",
    songs: "መዝሙሮች",
    setlists: "የመዝሙር ዝርዝሮች",
    favs: "ተወዳጆች",
    notifs: "ማሳወቂያዎች",

    // Admin
    adminDash: "ዳሽቦርድ",
    members: "አባላት",
    totalSongs: "መዝሙሮች",
    totalWorshipers: "አምላኪዎች",
    totalSingers: "ዘማሪዎች",
    totalSetlists: "የመዝሙር ዝርዝሮች",
    allMembers: "ሁሉም አባላት",

    // Home
    greeting: "ሰላም,",
    verse: '"እስትንፋስ ያለው ሁሉ እግዚአብሔርን ያመስግን" — መዝሙር 150:6',
    nextSat: "የሚቀጥለው ቅዳሜ",
    allSongs: "ሁሉም መዝሙሮች",
    myFavs: "ተወዳጆቼ",

    // Songs
    search: "መዝሙር ይፈልጉ...",
    addSong: "አዲስ መዝሙር ይጨምሩ",
    editSong: "መዝሙር ያርሙ",
    newSong: "አዲስ መዝሙር",
    songTitle: "ርዕስ",
    key: "ቁልፍ",
    tempo: "ቴምፖ (ፍጥነት)",
    singer: "ዘማሪ",
    category: "ምድብ",
    lyrics: "ግጥም",
    lyricsHint: "ቁጥር 1:\nግጥም...\n\nዝማሬ:\nግጥም...",
    save: "ያስቀምጡ",
    cancel: "ይተው",
    delete: "ይሰርዙ",
    confirmDelete: "በእርግጠኝነት ይህንን መሰረዝ ይፈልጋሉ?",

    // Setlists
    newSetlist: "አዲስ የመዝሙር ዝርዝር",
    buildSetlist: "የመዝሙር ዝርዝር ያዘጋጁ",
    setlistTheme: "ጭብጥ / ርዕስ",
    setlistDate: "ቀን (ለምሳሌ ቅዳሜ፣ ግንቦት 24)",
    pickSongs: "የሚካተቱትን መዝሙሮች ይምረጡ፦",
    createSetlist: "የመዝሙር ዝርዝር ይፍጠሩ",
    deleteSetlist: "የመዝሙር ዝርዝር ይሰርዙ",
    editSetlist: "የመዝሙር ዝርዝር ያርሙ",

    // Lyrics
    keyOf: "ቁልፍ",
    savedFav: "ወደ ተወዳጆች ተቀምጧል",
    removeFav: "ከተወዳጆች ያስወግዱ",
    noFavs: "እስካሁን ምንም ተወዳጅ መዝሙር የለም።\nለመቆጠብ የማንኛውንም መዝሙር ምልክት ይጫኑ።",

    // Notifications
    notifTitle: "ማሳወቂያዎች እና አዳዲስ መረጃዎች",

    // Settings
    settings: "ቅንብሮች",
    appearance: "ገጽታ",
    fontSize: "የፊደል መጠን",
    theme: "ገጽታ",
    light: "ብርሃን",
    dark: "ጨለማ",
    lightMode: "የብርሃን ገጽታ",
    darkMode: "የጨለማ ገጽታ",
    language: "ቋንቋ",
    textDisplay: "የጽሑፍ ማሳያ",
    lineSpacing: "የመስመር ክፍተት",
    boldLyrics: "ደማቅ ግጥም",
    preview: "ቅድመ-እይታ",
    account: "መለያ",
    logout: "ይውጡ",
    credit: "በ3AMMM ሚዲያ እና ኮሙኒኬሽን የተዘጋጀ",

    // Misc
    songs2: "መዝሙሮች",
    loading: "እየጫነ ነው...",
    error: "የሆነ ችግር ተፈጥሯል",
    retry: "እንደገና ይሞክሩ",
    justNow: "አሁን",
    minAgo: "ደቂቃ በፊት",
    hrAgo: "ሰዓት በፊት",
    all: "ሁሉም",
    tapAvatarLogout: "ለመውጣት ምስልዎን ይንኩ",

    // Social & Engagement
    tiktok: "ቲክቶክ",
    instagram: "ኢንስታግራም",
    facebook: "ፌስቡክ",
    telegram: "ቴሌግራም",
    visitWebsite: "ድረ-ገጻችንን ይጎብኙ",
    shareThoughts: "ሀሳብዎን ያካፍሉን",
    feedbackComments: "አስተያየቶች እና ጥቆማዎች",
    followUs: "ይከተሉን",
    contactUs: "ያግኙን",
    appUpdates: "የመተግበሪያ ዝመናዎች",
    checkForUpdates: "ዝመናዎችን ይፈትሹ",

    // Settings / actions
    writeFeedback: "እባክዎ አስተያየትዎን እዚህ ይጻፉ...",
    sendViaTelegram: "በቴሌግራም ይላኩ",
    signOutTitle: "ከመለያ መውጣት",
    confirmSignOut: "በእርግጠኝነት ከመለያዎ መውጣት ይፈልጋሉ?",
    emptyFeedbackTitle: "ባዶ አስተያየት",
    writeMessageFirst: "እባክዎ መጀመሪያ መልእክት ይጻፉ።",
    telegramOpenError: "ቴሌግራም መክፈት አልተቻለም። መተግበሪያው ስልክዎ ላይ መጫኑን ያረጋግጡ።",
    telegramLaunchError: "ቴሌግራም መክፈት አልተሳካም።",
    upToDate: "ተዘምኗል",
    runningVersion: "አሁን እየተጠቀሙበት ያለው ስሪት",
    latestVersion: "የቅርብ ጊዜው ስሪት ነው።",
    couldNotSignOut: "ከመለያ መውጣት አልተቻለም። እባክዎ እንደገና ይሞክሩ።",
    office: "ቢሮ",
    english: "English",
    amharic: "አማርኛ",
  },
};

export type Translations = typeof translations.en;
export default translations;