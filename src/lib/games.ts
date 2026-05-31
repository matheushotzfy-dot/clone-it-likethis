import tiger from "@/assets/game-tiger.jpg";
import aviator from "@/assets/game-aviator.jpg";
import rabbit from "@/assets/game-rabbit.jpg";
import dragon from "@/assets/game-dragon.jpg";
import spaceman from "@/assets/game-spaceman.jpg";
import mines from "@/assets/game-mines.jpg";
import roulette from "@/assets/game-roulette.jpg";
import jetx from "@/assets/game-jetx.jpg";
import bull from "@/assets/game-bull.jpg";
import blackjack from "@/assets/game-blackjack.jpg";
import ox from "@/assets/game-ox.jpg";

export interface Game {
  id: string;
  name: string;
  provider: string;
  category: "slots" | "crash" | "live" | "table" | "popular";
  image: string;
}

export const games: Game[] = [
  { id: "fortune-tiger", name: "Fortune Tiger", provider: "PG Soft", category: "slots", image: tiger },
  { id: "aviator", name: "Aviator", provider: "Spribe", category: "crash", image: aviator },
  { id: "fortune-rabbit", name: "Fortune Rabbit", provider: "PG Soft", category: "slots", image: rabbit },
  { id: "fortune-dragon", name: "Fortune Dragon", provider: "PG Soft", category: "slots", image: dragon },
  { id: "spaceman", name: "Spaceman", provider: "Pragmatic", category: "crash", image: spaceman },
  { id: "mines", name: "Mines", provider: "Spribe", category: "crash", image: mines },
  { id: "roleta-brasileira", name: "Roleta Brasileira", provider: "Evolution", category: "live", image: roulette },
  { id: "jetx", name: "JetX", provider: "SmartSoft", category: "crash", image: jetx },
  { id: "cowboy-bull", name: "Cowboy Bull", provider: "Hacksaw", category: "slots", image: bull },
  { id: "blackjack", name: "Blackjack VIP", provider: "Evolution", category: "live", image: blackjack },
  { id: "fortune-ox", name: "Fortune Ox", provider: "PG Soft", category: "slots", image: ox },
  { id: "tiger-2", name: "Tiger Gold", provider: "PG Soft", category: "slots", image: tiger },
  { id: "dragon-2", name: "Dragon Power", provider: "PG Soft", category: "slots", image: dragon },
  { id: "rabbit-2", name: "Lucky Rabbit", provider: "PG Soft", category: "slots", image: rabbit },
  { id: "aviator-2", name: "Sky Rocket", provider: "Spribe", category: "crash", image: aviator },
  { id: "mines-2", name: "Treasure Mines", provider: "Spribe", category: "crash", image: mines },
  { id: "roulette-2", name: "Lightning Roulette", provider: "Evolution", category: "live", image: roulette },
  { id: "ox-2", name: "Ox Riches", provider: "PG Soft", category: "slots", image: ox },
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
