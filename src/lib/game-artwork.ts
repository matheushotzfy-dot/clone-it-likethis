import { games } from "./games";
import cover0 from "@/assets/game-covers/originais-do-stake-dice.webp.asset.json";
import cover1 from "@/assets/game-covers/originais-do-stake-mines.webp.asset.json";
import cover2 from "@/assets/game-covers/originais-do-stake-plinko.webp.asset.json";
import cover3 from "@/assets/game-covers/originais-do-stake-keno.webp.asset.json";
import cover4 from "@/assets/game-covers/originais-do-stake-crash.webp.asset.json";
import cover5 from "@/assets/game-covers/originais-do-stake-limbo.webp.asset.json";
import cover6 from "@/assets/game-covers/originais-do-stake-slide.webp.asset.json";
import cover7 from "@/assets/game-covers/originais-do-stake-chicken.webp.asset.json";
import cover8 from "@/assets/game-covers/valkyrie-waylanders-forge.webp.asset.json";
import cover9 from "@/assets/game-covers/paperclip-gaming-dragonspire-frostfall.webp.asset.json";
import cover10 from "@/assets/game-covers/valkyrie-odin-s-vault.webp.asset.json";
import cover11 from "@/assets/game-covers/twist-gaming-fish.webp.asset.json";
import cover12 from "@/assets/game-covers/twist-gaming-boom.webp.asset.json";
import cover13 from "@/assets/game-covers/twist-gaming-bank-basher.webp.asset.json";
import cover14 from "@/assets/game-covers/twist-gaming-elemental-ways.webp.asset.json";
import cover15 from "@/assets/game-covers/paperclip-gaming-candy-dash.webp.asset.json";
import cover16 from "@/assets/game-covers/pragmatic-play-originais-do-stake.webp.asset.json";
import cover17 from "@/assets/game-covers/evolution-roleta-ao-vivo.webp.asset.json";
import cover18 from "@/assets/game-covers/pragmatic-play-baccarat-lobby.webp.asset.json";
import cover19 from "@/assets/game-covers/evolution-mega-bola-da-sorte.webp.asset.json";
import cover20 from "@/assets/game-covers/evolution-blackjack.webp.asset.json";
import cover21 from "@/assets/game-covers/pragmatic-play-brazilian-roulette.webp.asset.json";
import cover22 from "@/assets/game-covers/pragmatic-play-super-trunfo.webp.asset.json";
import cover23 from "@/assets/game-covers/evolution-bac-bo-ao-vivo.webp.asset.json";
import cover24 from "@/assets/game-covers/evolution-crazy-time.webp.asset.json";
import cover25 from "@/assets/game-covers/pragmatic-play-gates-of-olympus-roulette.webp.asset.json";
import cover26 from "@/assets/game-covers/pragmatic-play-mega-roulette-3000.webp.asset.json";
import cover27 from "@/assets/game-covers/evolution-lightning-roulette.webp.asset.json";
import cover28 from "@/assets/game-covers/evolution-ice-fishing.webp.asset.json";
import cover29 from "@/assets/game-covers/pragmatic-play-mega-baccarat.webp.asset.json";
import cover30 from "@/assets/game-covers/evolution-xxxtreme-lightning-roulette.webp.asset.json";
import cover31 from "@/assets/game-covers/evolution-lucky-baccarat.webp.asset.json";
import cover32 from "@/assets/game-covers/twist-gaming-valkyrie.webp.asset.json";
import cover33 from "@/assets/game-covers/meta-gaming-raid-bound.webp.asset.json";
import cover34 from "@/assets/game-covers/paperclip-gaming-lazy-vampire.webp.asset.json";
import cover35 from "@/assets/game-covers/coreffect-interactive-candy-swipe-matchwin.webp.asset.json";
import cover36 from "@/assets/game-covers/titan-gaming-wheel-of-thunder.webp.asset.json";
import cover37 from "@/assets/game-covers/valkyrie-retro-gangster.webp.asset.json";
import cover38 from "@/assets/game-covers/donut-gaming-ganja-snail.webp.asset.json";
import cover39 from "@/assets/game-covers/colorful-play-graffiti-ways.webp.asset.json";
import cover40 from "@/assets/game-covers/paperclip-gaming-minedrop-2.webp.asset.json";
import cover41 from "@/assets/game-covers/bgaming-aviamasters.webp.asset.json";
import cover42 from "@/assets/game-covers/degen-lab-keno-xtreme.webp.asset.json";
import cover43 from "@/assets/game-covers/coreffect-interactive-angry-balls.webp.asset.json";
import cover44 from "@/assets/game-covers/paperclip-gaming-minedrop.webp.asset.json";
import cover45 from "@/assets/game-covers/lk7-plinko-100000.webp.asset.json";
import cover46 from "@/assets/game-covers/degen-lab-dice-xtreme.webp.asset.json";
import cover47 from "@/assets/game-covers/lk7-blackjack-5000.webp.asset.json";
import cover48 from "@/assets/game-covers/twist-gaming-clock.webp.asset.json";
import cover49 from "@/assets/game-covers/paperclip-gaming-deal-with-the-devil.webp.asset.json";
import cover50 from "@/assets/game-covers/titan-gaming-fat-gamba.webp.asset.json";
import cover51 from "@/assets/game-covers/uppercut-gaming-gems-rush.webp.asset.json";
import cover52 from "@/assets/game-covers/terminal-games-doom-lord.webp.asset.json";

function key(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
function providerKey(value: string) {
 const p = key(value.replace(/oficial|original|slots|live|casino|cassino|games|gaming/gi, ""));
 if (p.includes("pragmatic")) return "pragmatic";
 if (p.includes("evolution")) return "evolution";
 if (p.includes("pgsoft") || p.includes("pgsoft")) return "pgsoft";
 if (p.includes("spribe")) return "spribe";
 if (p.includes("smartsoft") || p.includes("jetx")) return "smartsoft";
 return p;
}
const covers = [
  { name: "dice", provider: "Originais do Stake", url: cover0.url },
  { name: "mines", provider: "Originais do Stake", url: cover1.url },
  { name: "plinko", provider: "Originais do Stake", url: cover2.url },
  { name: "keno", provider: "Originais do Stake", url: cover3.url },
  { name: "crash", provider: "Originais do Stake", url: cover4.url },
  { name: "limbo", provider: "Originais do Stake", url: cover5.url },
  { name: "slide", provider: "Originais do Stake", url: cover6.url },
  { name: "Chicken", provider: "Originais do Stake", url: cover7.url },
  { name: "Waylanders Forge", provider: "Valkyrie", url: cover8.url },
  { name: "Dragonspire Frostfall", provider: "Paperclip Gaming", url: cover9.url },
  { name: "Odin's Vault", provider: "Valkyrie", url: cover10.url },
  { name: "Fish", provider: "Twist Gaming", url: cover11.url },
  { name: "Boom", provider: "Twist Gaming", url: cover12.url },
  { name: "Bank Basher", provider: "Twist Gaming", url: cover13.url },
  { name: "Elemental Ways", provider: "Twist Gaming", url: cover14.url },
  { name: "Candy Dash", provider: "Paperclip Gaming", url: cover15.url },
  { name: "Originais do Stake", provider: "Pragmatic Play", url: cover16.url },
  { name: "Roleta ao Vivo", provider: "Evolution", url: cover17.url },
  { name: "Baccarat Lobby", provider: "Pragmatic Play", url: cover18.url },
  { name: "Mega Bola Da Sorte", provider: "Evolution", url: cover19.url },
  { name: "Blackjack", provider: "Evolution", url: cover20.url },
  { name: "Brazilian Roulette", provider: "Pragmatic Play", url: cover21.url },
  { name: "Super Trunfo", provider: "Pragmatic Play", url: cover22.url },
  { name: "Bac Bo Ao Vivo", provider: "Evolution", url: cover23.url },
  { name: "Crazy Time", provider: "Evolution", url: cover24.url },
  { name: "Gates of Olympus Roulette", provider: "Pragmatic Play", url: cover25.url },
  { name: "Mega Roulette 3000", provider: "Pragmatic Play", url: cover26.url },
  { name: "Lightning Roulette", provider: "Evolution", url: cover27.url },
  { name: "Ice Fishing", provider: "Evolution", url: cover28.url },
  { name: "Mega Baccarat", provider: "Pragmatic Play", url: cover29.url },
  { name: "XXXtreme Lightning Roulette", provider: "Evolution", url: cover30.url },
  { name: "Lucky Baccarat", provider: "Evolution", url: cover31.url },
  { name: "Valkyrie", provider: "Twist Gaming", url: cover32.url },
  { name: "Raid Bound", provider: "Meta Gaming", url: cover33.url },
  { name: "Lazy Vampire", provider: "Paperclip Gaming", url: cover34.url },
  { name: "Candy Swipe MatchWin\u2122", provider: "Coreffect Interactive", url: cover35.url },
  { name: "Wheel of Thunder", provider: "Titan Gaming", url: cover36.url },
  { name: "Retro Gangster", provider: "Valkyrie", url: cover37.url },
  { name: "Ganja Snail", provider: "Donut Gaming", url: cover38.url },
  { name: "Graffiti Ways", provider: "Colorful Play", url: cover39.url },
  { name: "Minedrop 2", provider: "Paperclip Gaming", url: cover40.url },
  { name: "Aviamasters", provider: "BGaming", url: cover41.url },
  { name: "Keno Xtreme", provider: "Degen Lab", url: cover42.url },
  { name: "Angry Balls", provider: "Coreffect Interactive", url: cover43.url },
  { name: "Minedrop", provider: "Paperclip Gaming", url: cover44.url },
  { name: "Plinko 100000", provider: "LK7", url: cover45.url },
  { name: "Dice Xtreme", provider: "Degen Lab", url: cover46.url },
  { name: "Blackjack 5000", provider: "LK7", url: cover47.url },
  { name: "Clock", provider: "Twist Gaming", url: cover48.url },
  { name: "Deal with the Devil", provider: "Paperclip Gaming", url: cover49.url },
  { name: "Fat Gamba", provider: "Titan Gaming", url: cover50.url },
  { name: "Gems Rush", provider: "Uppercut Gaming", url: cover51.url },
  { name: "Doom Lord", provider: "Terminal Games", url: cover52.url },
];

export function getGameArtwork(name: string, provider: string): string | undefined {
 const match = covers.find((c) => key(c.name) === key(name) && providerKey(c.provider) === providerKey(provider));
 if (match) return match.url;
 return games.find((g) => key(g.name) === key(name) && providerKey(g.provider) === providerKey(provider))?.image;
}
