/**
 * Islamic Utility Data & Helpers:
 * - Prayer Times Calculator (Standard astronomical calculation)
 * - Curated Daily Masnoon Du'as with transliteration and translation
 * - Interactive Quran Practice Surahs with Mishary Rashid Alafasy Audio
 */

export interface PrayerTimeSchedule {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

export interface CityPreset {
  name: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
}

export const POPULAR_CITIES: CityPreset[] = [
  { name: "Dhaka", country: "Bangladesh", lat: 23.8103, lng: 90.4125, timezone: "Asia/Dhaka" },
  { name: "Chittagong", country: "Bangladesh", lat: 22.3569, lng: 91.7832, timezone: "Asia/Dhaka" },
  { name: "Sylhet", country: "Bangladesh", lat: 24.8949, lng: 91.8687, timezone: "Asia/Dhaka" },
  { name: "London", country: "United Kingdom", lat: 51.5074, lng: -0.1278, timezone: "Europe/London" },
  { name: "New York", country: "USA", lat: 40.7128, lng: -74.006, timezone: "America/New_York" },
  { name: "Toronto", country: "Canada", lat: 43.6532, lng: -79.3832, timezone: "America/Toronto" },
  { name: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708, timezone: "Asia/Dubai" },
  { name: "Riyadh", country: "Saudi Arabia", lat: 24.7136, lng: 46.6753, timezone: "Asia/Riyadh" },
  { name: "Kuala Lumpur", country: "Malaysia", lat: 3.139, lng: 101.6869, timezone: "Asia/Kuala_Lumpur" },
  { name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093, timezone: "Australia/Sydney" },
];

/**
 * Approximate prayer calculation for standard University of Islamic Sciences (Karachi / MWL / ISNA fallback)
 */
export function calculatePrayerTimes(lat: number, lng: number, date: Date = new Date()): PrayerTimeSchedule {
  const d = new Date(date);
  const startOfYear = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  // Solar declination approximation
  const declination = 23.45 * Math.sin(((2 * Math.PI) / 365) * (dayOfYear - 81));
  const decRad = (declination * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;

  // Equation of time in minutes
  const b = ((2 * Math.PI) / 365) * (dayOfYear - 81);
  const eqTime = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);

  // Solar noon
  const timezoneOffsetHours = -d.getTimezoneOffset() / 60;
  const solarNoon = 12 + (timezoneOffsetHours * 15 - lng) / 15 - eqTime / 60;

  // Hour angles for twilight (-18° Fajr/Isha, -0.833° Sunrise/Sunset)
  const calcHourAngle = (angle: number) => {
    const angleRad = (angle * Math.PI) / 180;
    const cosH = (Math.sin(angleRad) - Math.sin(latRad) * Math.sin(decRad)) / (Math.cos(latRad) * Math.cos(decRad));
    if (cosH > 1 || cosH < -1) return 6; // fallback 6 hours
    return (Math.acos(cosH) * 180) / Math.PI / 15;
  };

  // Asr shadow (Shafi'i/Hanafi average shadow factor 1.5)
  const asrAlt = (Math.atan(1 / (1.5 + Math.tan(Math.abs(latRad - decRad)))) * 180) / Math.PI;
  const asrHA = calcHourAngle(asrAlt);

  const fajrHA = calcHourAngle(-18.0);
  const sunHA = calcHourAngle(-0.833);
  const ishaHA = calcHourAngle(-18.0);

  const formatHours = (h: number) => {
    let normalized = h % 24;
    if (normalized < 0) normalized += 24;
    const hours = Math.floor(normalized);
    const minutes = Math.floor((normalized - hours) * 60);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  return {
    fajr: formatHours(solarNoon - fajrHA),
    sunrise: formatHours(solarNoon - sunHA),
    dhuhr: formatHours(solarNoon),
    asr: formatHours(solarNoon + asrHA),
    maghrib: formatHours(solarNoon + sunHA),
    isha: formatHours(solarNoon + ishaHA),
  };
}

export interface DuaItem {
  id: string;
  category: string;
  title: string;
  arabic: string;
  transliteration: string;
  english: string;
  benefit: string;
  source: string;
  audioText?: string;
}

export const DAILY_DUAS: DuaItem[] = [
  {
    id: "dua-knowledge",
    category: "Learning & Knowledge",
    title: "Du'a for Increasing Knowledge",
    arabic: "رَّبِّ زِدْنِي عِلْمًا",
    transliteration: "Rabbi zidnee 'ilmaa",
    english: "My Lord, increase me in knowledge.",
    benefit: "Recite before beginning Quran studies or any lesson for sharpness of mind and understanding.",
    source: "Surah Taha (20:114)",
  },
  {
    id: "dua-ease",
    category: "Ease & Success",
    title: "Du'a for Ease in Tasks & Speech",
    arabic: "رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي وَاحْلُلْ عُقْدَةً مِّن لِّسَانِي يَفْقَهُوا قَوْلِي",
    transliteration: "Rabbish rah lee sadree, wa yassir lee amree, wahlul 'uqdatan min lisaanee, yafqahoo qawlee",
    english: "My Lord, expand for me my chest, ease for me my task, and remove the impediment from my tongue that they may understand my speech.",
    benefit: "Du'a of Prophet Musa (AS) for clarity in reciting, presenting, and speech.",
    source: "Surah Taha (20:25-28)",
  },
  {
    id: "dua-morning",
    category: "Morning Azkar",
    title: "Morning Remembrance for Protection",
    arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ",
    transliteration: "Asbahnaa wa asbahal mulku lillaahi walhamdu lillaahi, laa ilaaha illallaahu wahdahu laa shareeka lah",
    english: "We have entered the morning and the kingdom belongs to Allah, and all praise is for Allah. None has the right to be worshipped except Allah alone, without partner.",
    benefit: "Brings barakah, peace, and protection into the student's entire day.",
    source: "Sahih Muslim (2723)",
  },
  {
    id: "dua-leaving-home",
    category: "Daily Living",
    title: "Du'a When Leaving Home",
    arabic: "بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ، وَلاَ حَوْلَ وَلاَ قُوَّةَ إِلاَّ بِاللَّهِ",
    transliteration: "Bismillaahi tawakkaltu 'alallaahi, wa laa hawla wa laa quwwata illaa billaah",
    english: "In the name of Allah, I trust in Allah; there is no power and no strength except with Allah.",
    benefit: "Angles declare: 'You are guided, defended and protected.'",
    source: "Abu Dawud (5095)",
  },
  {
    id: "dua-parents",
    category: "Family & Parents",
    title: "Du'a for Parents (Mercy & Forgiveness)",
    arabic: "رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
    transliteration: "Rabbir hamhumaa kamaa rabbayaanee sagheeraa",
    english: "My Lord, have mercy upon them as they brought me up when I was small.",
    benefit: "Earns tremendous reward and makes the student a source of Sadaqah Jariyah for parents.",
    source: "Surah Al-Isra (17:24)",
  },
  {
    id: "dua-sleep",
    category: "Night & Bedtime",
    title: "Du'a Before Sleeping",
    arabic: "بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِكَ أَرْفَعُهُ",
    transliteration: "Bismika Rabbee wada'tu jambee, wa bika arfa'uh",
    english: "In Your name, my Lord, I lay down my side and by You I raise it up.",
    benefit: "Guarantees peaceful sleep under Allah's care and angels' guardianship.",
    source: "Sahih al-Bukhari (6320)",
  },
];

export interface QuranVerse {
  ayahNumber: number;
  arabic: string;
  transliteration: string;
  english: string;
  audioUrl: string;
}

export interface QuranSurah {
  number: number;
  nameArabic: string;
  nameEnglish: string;
  meaning: string;
  versesCount: number;
  audioUrl: string; // Full surah recitation by Mishary Alafasy
  reciter: string;
  verses: QuranVerse[];
}

export const PRACTICE_SURAHS: QuranSurah[] = [
  {
    number: 1,
    nameArabic: "الفَاتِحَة",
    nameEnglish: "Al-Fatihah",
    meaning: "The Opener",
    versesCount: 7,
    audioUrl: "https://server8.mp3quran.net/afs/001.mp3",
    reciter: "Mishary Rashid Alafasy",
    verses: [
      {
        ayahNumber: 1,
        arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
        transliteration: "Bismillaahir Rahmaanir Raheem",
        english: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/001001.mp3",
      },
      {
        ayahNumber: 2,
        arabic: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
        transliteration: "Alhamdu lillaahi Rabbil 'aalameen",
        english: "[All] praise is [due] to Allah, Lord of the worlds.",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/001002.mp3",
      },
      {
        ayahNumber: 3,
        arabic: "الرَّحْمَٰنِ الرَّحِيمِ",
        transliteration: "Ar-Rahmaanir-Raheem",
        english: "The Entirely Merciful, the Especially Merciful,",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/001003.mp3",
      },
      {
        ayahNumber: 4,
        arabic: "مَالِكِ يَوْمِ الدِّينِ",
        transliteration: "Maaliki Yawmid-Deen",
        english: "Sovereign of the Day of Recompense.",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/001004.mp3",
      },
      {
        ayahNumber: 5,
        arabic: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
        transliteration: "Iyyaaka na'budu wa lyyaaka nasta'een",
        english: "It is You we worship and You we ask for help.",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/001005.mp3",
      },
      {
        ayahNumber: 6,
        arabic: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ",
        transliteration: "Ihdinas-Siraatal-Mustaqeem",
        english: "Guide us to the straight path -",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/001006.mp3",
      },
      {
        ayahNumber: 7,
        arabic: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ",
        transliteration: "Siraatal-lazeena an'amta 'alayhim ghayril-maghdoobi 'alayhim wa lad-daaalleen",
        english: "The path of those upon whom You have bestowed favor, not of those who have evoked [Your] anger or of those who are astray.",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/001007.mp3",
      },
    ],
  },
  {
    number: 112,
    nameArabic: "الإِخْلَاص",
    nameEnglish: "Al-Ikhlas",
    meaning: "The Sincerity",
    versesCount: 4,
    audioUrl: "https://server8.mp3quran.net/afs/112.mp3",
    reciter: "Mishary Rashid Alafasy",
    verses: [
      {
        ayahNumber: 1,
        arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ",
        transliteration: "Qul Huwal Laahu Ahad",
        english: "Say, 'He is Allah, [who is] One,",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/112001.mp3",
      },
      {
        ayahNumber: 2,
        arabic: "اللَّهُ الصَّمَدُ",
        transliteration: "Allahus-Samad",
        english: "Allah, the Eternal Refuge.",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/112002.mp3",
      },
      {
        ayahNumber: 3,
        arabic: "لَمْ يَلِدْ وَلَمْ يُولَدْ",
        transliteration: "Lam yalid wa lam yoolad",
        english: "He neither begets nor is born,",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/112003.mp3",
      },
      {
        ayahNumber: 4,
        arabic: "وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ",
        transliteration: "Wa lam yakul-lahu kufuwan ahad",
        english: "Nor is there to Him any equivalent.'",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/112004.mp3",
      },
    ],
  },
  {
    number: 113,
    nameArabic: "الفَلَق",
    nameEnglish: "Al-Falaq",
    meaning: "The Daybreak",
    versesCount: 5,
    audioUrl: "https://server8.mp3quran.net/afs/113.mp3",
    reciter: "Mishary Rashid Alafasy",
    verses: [
      {
        ayahNumber: 1,
        arabic: "قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ",
        transliteration: "Qul a'oozu bi rabbil-falaq",
        english: "Say, 'I seek refuge in the Lord of daybreak,",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/113001.mp3",
      },
      {
        ayahNumber: 2,
        arabic: "مِن شَرِّ مَا خَلَقَ",
        transliteration: "Min sharri maa khalaq",
        english: "From the evil of that which He created,",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/113002.mp3",
      },
      {
        ayahNumber: 3,
        arabic: "وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ",
        transliteration: "Wa min sharri ghaasiqin izaa waqab",
        english: "And from the evil of darkness when it settles,",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/113003.mp3",
      },
      {
        ayahNumber: 4,
        arabic: "وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ",
        transliteration: "Wa min sharrin-naffaasaati fil 'uqad",
        english: "And from the evil of the blowers in knots,",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/113004.mp3",
      },
      {
        ayahNumber: 5,
        arabic: "وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ",
        transliteration: "Wa min sharri haasidin izaa hasad",
        english: "And from the evil of an envier when he envies.'",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/113005.mp3",
      },
    ],
  },
  {
    number: 114,
    nameArabic: "النَّاس",
    nameEnglish: "An-Nas",
    meaning: "Mankind",
    versesCount: 6,
    audioUrl: "https://server8.mp3quran.net/afs/114.mp3",
    reciter: "Mishary Rashid Alafasy",
    verses: [
      {
        ayahNumber: 1,
        arabic: "قُلْ أَعُوذُ بِرَبِّ النَّاسِ",
        transliteration: "Qul a'oozu birabbin naas",
        english: "Say, 'I seek refuge in the Lord of mankind,",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/114001.mp3",
      },
      {
        ayahNumber: 2,
        arabic: "مَلِكِ النَّاسِ",
        transliteration: "Malikin naas",
        english: "The Sovereign of mankind,",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/114002.mp3",
      },
      {
        ayahNumber: 3,
        arabic: "إِلَٰهِ النَّاسِ",
        transliteration: "Ilaahin naas",
        english: "The God of mankind,",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/114003.mp3",
      },
      {
        ayahNumber: 4,
        arabic: "مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ",
        transliteration: "Min sharril waswaasil khannaas",
        english: "From the evil of the retreating whisperer -",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/114004.mp3",
      },
      {
        ayahNumber: 5,
        arabic: "الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ",
        transliteration: "Allazee yuwaswisu fee sudoorin naas",
        english: "Who whispers [evil] into the breasts of mankind -",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/114005.mp3",
      },
      {
        ayahNumber: 6,
        arabic: "مِنَ الْجِنَّةِ وَالنَّاسِ",
        transliteration: "Minal jinnati wannaas",
        english: "From among the jinn and mankind.'",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/114006.mp3",
      },
    ],
  },
  {
    number: 108,
    nameArabic: "الكَوْثَر",
    nameEnglish: "Al-Kawthar",
    meaning: "The Abundance",
    versesCount: 3,
    audioUrl: "https://server8.mp3quran.net/afs/108.mp3",
    reciter: "Mishary Rashid Alafasy",
    verses: [
      {
        ayahNumber: 1,
        arabic: "إِنَّا أَعْطَيْنَاكَ الْكَوْثَرَ",
        transliteration: "Innaaa a'tainaakal kawthar",
        english: "Indeed, We have granted you, [O Muhammad], al-Kawthar.",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/108001.mp3",
      },
      {
        ayahNumber: 2,
        arabic: "فَصَلِّ لِرَبِّكَ وَانْحَرْ",
        transliteration: "Fasalli li rabbika wanhar",
        english: "So pray to your Lord and sacrifice [to Him alone].",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/108002.mp3",
      },
      {
        ayahNumber: 3,
        arabic: "إِنَّ شَانِئَكَ هُوَ الْأَبْتَرُ",
        transliteration: "Inna shaani'aka huwal abtar",
        english: "Indeed, your enemy is the one cut off.",
        audioUrl: "https://everyayah.com/data/Alafasy_128kbps/108003.mp3",
      },
    ],
  },
];
