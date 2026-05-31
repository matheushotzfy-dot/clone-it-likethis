export interface Game {
  id: string;
  name: string;
  provider: string;
  category: "slots" | "crash" | "live" | "table" | "popular";
  image: string;
}

const img = (n: string) => `/games/${n}.webp`;

export const games: Game[] = [
  // Top slots PG
  { id: "fortune-tiger", name: "Fortune Tiger", provider: "PG Soft", category: "slots", image: img("fortune-tiger") },
  { id: "fortune-rabbit", name: "Fortune Rabbit", provider: "PG Soft", category: "slots", image: img("fortune-rabbit") },
  { id: "fortune-dragon", name: "Fortune Dragon", provider: "PG Soft", category: "slots", image: img("fortune-dragon") },
  { id: "fortune-ox", name: "Fortune Ox", provider: "PG Soft", category: "slots", image: img("fortune-ox") },
  { id: "fortune-snake", name: "Fortune Snake", provider: "PG Soft", category: "slots", image: img("fortune-snake") },
  { id: "touro-sortudo", name: "Touro Sortudo", provider: "PG Soft", category: "slots", image: img("touro-sortudo") },
  { id: "pinata-wins", name: "Piñata Wins", provider: "PG Soft", category: "slots", image: img("pinata-wins") },
  { id: "tigre-da-sorte", name: "Tigre da Sorte", provider: "TaDa Gaming", category: "slots", image: img("tigre-da-sorte") },
  { id: "yo-dragon", name: "Yo Dragon", provider: "TaDa Gaming", category: "slots", image: img("yo-dragon") },
  { id: "caramelo-sortudo", name: "Caramelo Sortudo", provider: "PIXBET", category: "slots", image: img("caramelo-sortudo") },
  { id: "sweet-bonanza-2500", name: "Sweet Bonanza 2500", provider: "Pragmatic", category: "slots", image: img("sweet-bonanza-2500") },
  { id: "gates-olympus-1000", name: "Gates of Olympus 1000", provider: "Pragmatic", category: "slots", image: img("gates-olympus-1000") },
  { id: "gates-olympus-super-scatter", name: "Gates of Olympus Super Scatter", provider: "Pragmatic", category: "slots", image: img("gates-olympus-super-scatter") },
  { id: "fortune-garuda-500", name: "Fortune Garuda 500", provider: "PG Soft", category: "slots", image: img("fortune-garuda-500") },
  { id: "lucky-jaguar-500", name: "Lucky Jaguar 500", provider: "PG Soft", category: "slots", image: img("lucky-jaguar-500") },
  { id: "super-7s", name: "Super 7s", provider: "BGaming", category: "slots", image: img("super-7s") },
  { id: "mega-fire-blaze", name: "Mega Fire Blaze Lucky Ball", provider: "Playtech", category: "slots", image: img("mega-fire-blaze") },

  // Crash
  { id: "aviator", name: "Aviator", provider: "Spribe", category: "crash", image: img("aviator") },
  { id: "jetx", name: "JetX", provider: "SmartSoft", category: "crash", image: img("jetx") },
  { id: "spaceman", name: "Spaceman", provider: "Pragmatic", category: "crash", image: img("spaceman") },
  { id: "high-flyer", name: "High Flyer Pixbet", provider: "PIXBET", category: "crash", image: img("high-flyer") },
  { id: "balloon-race", name: "Balloon Race", provider: "Smartsoft", category: "crash", image: img("balloon-race") },

  // Live / Mesas
  { id: "roleta-brasileira", name: "Roleta Brasileira", provider: "Evolution", category: "live", image: img("roleta-brasileira") },
  { id: "speed-roleta-brasileira", name: "Speed Roleta Brasileira", provider: "Evolution", category: "live", image: img("speed-roleta-brasileira") },
  { id: "mega-roleta-brasileira", name: "Mega Roleta Brasileira", provider: "Pragmatic", category: "live", image: img("mega-roleta-brasileira") },
  { id: "roleta-ao-vivo", name: "Roleta Ao Vivo", provider: "Evolution", category: "live", image: img("roleta-ao-vivo") },
  { id: "auto-roulette", name: "Auto Roulette", provider: "Evolution", category: "live", image: img("auto-roulette") },
  { id: "roulette", name: "Roulette", provider: "Evolution", category: "live", image: img("roulette") },
  { id: "roulette-ruby", name: "Roulette Ruby", provider: "Evolution", category: "live", image: img("roulette-ruby") },
  { id: "roulette-lobby", name: "Roulette Lobby", provider: "Evolution", category: "live", image: img("roulette-lobby") },
  { id: "roulette-extra-time", name: "Roulette Extra Time", provider: "Evolution", category: "live", image: img("roulette-extra-time") },
  { id: "gates-olympus-roulette", name: "Gates of Olympus Roulette", provider: "Pragmatic", category: "live", image: img("gates-olympus-roulette") },
  { id: "crazy-time", name: "Crazy Time", provider: "Evolution", category: "live", image: img("crazy-time") },
  { id: "crazy-time-brasil", name: "Crazy Time Brasil", provider: "Evolution", category: "live", image: img("crazy-time-brasil") },
  { id: "crazy-pachinko", name: "Crazy Pachinko", provider: "Evolution", category: "live", image: img("crazy-pachinko") },
  { id: "monopoly-live", name: "Monopoly Live", provider: "Evolution", category: "live", image: img("monopoly-live") },
  { id: "futebol-studio", name: "Futebol Studio", provider: "Evolution", category: "live", image: img("futebol-studio") },
  { id: "football-blitz", name: "Football Blitz", provider: "Evolution", category: "live", image: img("football-blitz") },
  { id: "bac-bo", name: "Bac Bo Ao Vivo", provider: "Evolution", category: "live", image: img("bac-bo") },
  { id: "fan-tan", name: "Fan Tan", provider: "Evolution", category: "live", image: img("fan-tan") },
  { id: "baccarat-1", name: "Baccarat", provider: "Evolution", category: "live", image: img("baccarat-1") },
  { id: "baccarat-2", name: "Baccarat 2", provider: "Evolution", category: "live", image: img("baccarat-2") },
  { id: "baccarat-3", name: "Baccarat 3", provider: "Evolution", category: "live", image: img("baccarat-3") },
  { id: "baccarat-5", name: "Baccarat 5", provider: "Evolution", category: "live", image: img("baccarat-5") },
  { id: "mega-baccarat", name: "Mega Baccarat", provider: "Pragmatic", category: "live", image: img("mega-baccarat") },
  { id: "brazilian-turbo-baccarat", name: "Brazilian Turbo Baccarat", provider: "Evolution", category: "live", image: img("brazilian-turbo-baccarat") },
  { id: "speed-baccarat-1", name: "Speed Baccarat", provider: "Evolution", category: "live", image: img("speed-baccarat-1") },
  { id: "speed-baccarat-2", name: "Speed Baccarat 2", provider: "Evolution", category: "live", image: img("speed-baccarat-2") },
  { id: "speed-baccarat-14", name: "Speed Baccarat 14", provider: "Evolution", category: "live", image: img("speed-baccarat-14") },
  { id: "roleta-brasileira-2", name: "Roleta Brasileira VIP", provider: "Evolution", category: "live", image: img("roleta-brasileira-2") },
];

export const providers = [
  "PG Soft", "Pragmatic", "Evolution", "Spribe",
  "Hacksaw", "SmartSoft", "BGaming", "TaDa Gaming",
];

export const categories = [
  { id: "slots", label: "Slots", icon: "🎰" },
  { id: "crash", label: "Crash", icon: "🚀" },
  { id: "popok", label: "Popok", icon: "💥" },
  { id: "tada", label: "TaDa", icon: "✋" },
  { id: "drops", label: "Drops", icon: "▶" },
  { id: "promocoes", label: "Promoções", icon: "🎁" },
  { id: "mesas", label: "Mesas BR", icon: "🎯" },
  { id: "jetx", label: "JetX", icon: "✈" },
];
