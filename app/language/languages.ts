// Curated language dataset for the "guess the language" game. Hand-authored so
// every sample is accurate — a starter set that's easy to expand. Each language
// carries a script + family so decoys can be drawn from the same script (and,
// ideally, family), making the guess a real test rather than "spot the script".

export type Language = {
  name: string;
  flag: string; // representative emoji; 🗣️ where no single flag fits
  script: string;
  family: string;
  difficulty: "easy" | "medium" | "hard";
  samples: string[];
};

export const LANGUAGES: Language[] = [
  // --- Romance (Latin) ---
  { name: "Spanish", flag: "🇪🇸", script: "Latin", family: "Romance", difficulty: "easy",
    samples: ["Buenos días, ¿cómo estás hoy?", "Me gustaría un café con leche, por favor."] },
  { name: "French", flag: "🇫🇷", script: "Latin", family: "Romance", difficulty: "easy",
    samples: ["Bonjour, comment allez-vous aujourd'hui ?", "Je voudrais un café, s'il vous plaît."] },
  { name: "Italian", flag: "🇮🇹", script: "Latin", family: "Romance", difficulty: "easy",
    samples: ["Buongiorno, come stai oggi?", "Vorrei un caffè, per favore."] },
  { name: "Portuguese", flag: "🇵🇹", script: "Latin", family: "Romance", difficulty: "medium",
    samples: ["Bom dia, como está hoje?", "Eu gostaria de um café, por favor."] },
  { name: "Romanian", flag: "🇷🇴", script: "Latin", family: "Romance", difficulty: "hard",
    samples: ["Bună dimineața, ce mai faci astăzi?", "Aș dori o cafea, te rog."] },
  { name: "Catalan", flag: "🗣️", script: "Latin", family: "Romance", difficulty: "hard",
    samples: ["Bon dia, com estàs avui?", "Voldria un cafè, si us plau."] },

  // --- Germanic (Latin) ---
  { name: "German", flag: "🇩🇪", script: "Latin", family: "Germanic", difficulty: "easy",
    samples: ["Guten Morgen, wie geht es dir heute?", "Ich hätte gerne einen Kaffee, bitte."] },
  { name: "Dutch", flag: "🇳🇱", script: "Latin", family: "Germanic", difficulty: "medium",
    samples: ["Goedemorgen, hoe gaat het vandaag met je?", "Ik wil graag een kopje koffie, alstublieft."] },
  { name: "Swedish", flag: "🇸🇪", script: "Latin", family: "Germanic", difficulty: "medium",
    samples: ["God morgon, hur mår du idag?", "Jag skulle vilja ha en kopp kaffe, tack."] },
  { name: "Norwegian", flag: "🇳🇴", script: "Latin", family: "Germanic", difficulty: "hard",
    samples: ["God morgen, hvordan har du det i dag?", "Jeg vil gjerne ha en kopp kaffe, takk."] },
  { name: "Danish", flag: "🇩🇰", script: "Latin", family: "Germanic", difficulty: "hard",
    samples: ["Godmorgen, hvordan har du det i dag?", "Jeg vil gerne have en kop kaffe, tak."] },

  // --- Slavic ---
  { name: "Polish", flag: "🇵🇱", script: "Latin", family: "Slavic", difficulty: "medium",
    samples: ["Dzień dobry, jak się masz dzisiaj?", "Poproszę kawę."] },
  { name: "Czech", flag: "🇨🇿", script: "Latin", family: "Slavic", difficulty: "hard",
    samples: ["Dobré ráno, jak se dnes máš?", "Dal bych si kávu, prosím."] },
  { name: "Russian", flag: "🇷🇺", script: "Cyrillic", family: "Slavic", difficulty: "easy",
    samples: ["Доброе утро, как дела сегодня?", "Я бы хотел чашку кофе, пожалуйста."] },
  { name: "Ukrainian", flag: "🇺🇦", script: "Cyrillic", family: "Slavic", difficulty: "medium",
    samples: ["Доброго ранку, як справи сьогодні?", "Я б хотів каву, будь ласка."] },
  { name: "Bulgarian", flag: "🇧🇬", script: "Cyrillic", family: "Slavic", difficulty: "hard",
    samples: ["Добро утро, как си днес?", "Бих искал едно кафе, моля."] },

  // --- Other Latin scripts ---
  { name: "Turkish", flag: "🇹🇷", script: "Latin", family: "Turkic", difficulty: "medium",
    samples: ["Günaydın, bugün nasılsın?", "Bir kahve istiyorum, lütfen."] },
  { name: "Finnish", flag: "🇫🇮", script: "Latin", family: "Uralic", difficulty: "hard",
    samples: ["Hyvää huomenta! Mitä kuuluu?", "Haluaisin kupin kahvia, kiitos."] },
  { name: "Hungarian", flag: "🇭🇺", script: "Latin", family: "Uralic", difficulty: "hard",
    samples: ["Jó reggelt, hogy vagy ma?", "Szeretnék egy kávét, kérem."] },
  { name: "Vietnamese", flag: "🇻🇳", script: "Latin", family: "Austroasiatic", difficulty: "medium",
    samples: ["Chào buổi sáng, hôm nay bạn khỏe không?", "Tôi muốn một ly cà phê."] },
  { name: "Indonesian", flag: "🇮🇩", script: "Latin", family: "Austronesian", difficulty: "hard",
    samples: ["Selamat pagi, apa kabar hari ini?", "Saya ingin secangkir kopi."] },
  { name: "Swahili", flag: "🇰🇪", script: "Latin", family: "Bantu", difficulty: "hard",
    samples: ["Habari za asubuhi. Hujambo?", "Ningependa kikombe cha kahawa."] },

  // --- Distinct scripts ---
  { name: "Greek", flag: "🇬🇷", script: "Greek", family: "Hellenic", difficulty: "easy",
    samples: ["Καλημέρα, πώς είσαι σήμερα;", "Θα ήθελα έναν καφέ, παρακαλώ."] },
  { name: "Arabic", flag: "🗣️", script: "Arabic", family: "Semitic", difficulty: "easy",
    samples: ["صباح الخير، كيف حالك اليوم؟", "أريد فنجان قهوة من فضلك."] },
  { name: "Hebrew", flag: "🇮🇱", script: "Hebrew", family: "Semitic", difficulty: "medium",
    samples: ["בוקר טוב, מה שלומך היום?", "אני רוצה כוס קפה, בבקשה."] },
  { name: "Hindi", flag: "🇮🇳", script: "Devanagari", family: "Indo-Aryan", difficulty: "medium",
    samples: ["सुप्रभात, आज आप कैसे हैं?", "मुझे एक कप कॉफ़ी चाहिए।"] },
  { name: "Thai", flag: "🇹🇭", script: "Thai", family: "Kra-Dai", difficulty: "medium",
    samples: ["สวัสดีตอนเช้า วันนี้สบายดีไหม", "ฉันอยากได้กาแฟสักแก้ว"] },
  { name: "Japanese", flag: "🇯🇵", script: "Japanese", family: "Japonic", difficulty: "easy",
    samples: ["おはようございます。今日は元気ですか？", "コーヒーを一杯ください。"] },
  { name: "Korean", flag: "🇰🇷", script: "Hangul", family: "Koreanic", difficulty: "easy",
    samples: ["좋은 아침이에요. 오늘 어떠세요?", "커피 한 잔 주세요."] },
  { name: "Chinese", flag: "🇨🇳", script: "Han", family: "Sinitic", difficulty: "easy",
    samples: ["早上好，你今天好吗？", "我想要一杯咖啡。"] },
];

export type LangRound = {
  language: Language;
  sample: string;
  options: Language[];
  correctIndex: number;
};

export function difficultyMeta(difficulty: string): {
  label: string;
  color: string;
} {
  switch (difficulty) {
    case "easy":
      return { label: "EASY", color: "emerald" };
    case "medium":
      return { label: "MEDIUM", color: "gold" };
    default:
      return { label: "HARD", color: "rose" };
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Three decoys for a target, hardest first: same script AND family, then same
 * script, then anything. Same-script decoys are what make it a real test — you
 * can't win by recognizing the alphabet alone.
 */
function decoysFor(target: Language): Language[] {
  const rest = LANGUAGES.filter((l) => l.name !== target.name);
  const sameFamily = rest.filter(
    (l) => l.script === target.script && l.family === target.family,
  );
  const sameScript = rest.filter(
    (l) => l.script === target.script && l.family !== target.family,
  );
  const other = rest.filter((l) => l.script !== target.script);
  return [...shuffle(sameFamily), ...shuffle(sameScript), ...shuffle(other)].slice(0, 3);
}

/** `count` rounds, no repeated language. */
export function buildLanguageRounds(count: number): LangRound[] {
  const pool = shuffle(LANGUAGES);
  const n = Math.min(count, pool.length);
  return pool.slice(0, n).map((target) => {
    const options = shuffle([target, ...decoysFor(target)]);
    return {
      language: target,
      sample: target.samples[Math.floor(Math.random() * target.samples.length)],
      options,
      correctIndex: options.findIndex((o) => o.name === target.name),
    };
  });
}
