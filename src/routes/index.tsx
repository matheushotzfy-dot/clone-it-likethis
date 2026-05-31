import { createFileRoute } from "@tanstack/react-router";
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Trophy, Gift, Dices, Flame, ChevronRight, Menu, Bell, User } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PixBet - O site de apostas do Brasil" },
      { name: "description", content: "Aposte na PixBet, o site com o saque mais rápido do mundo." },
    ],
  }),
  component: Index,
});

function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-[#001224] border-b border-white/10 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <img 
          src="https://static.singlebet.com/build-ceb1b017db09cf76807fbddefbb5/assets/logo-DStm3U-H.svg" 
          alt="PixBet" 
          className="h-8"
        />
        <nav className="hidden lg:flex items-center gap-6 text-white font-medium">
          <a href="#" className="hover:text-primary transition-colors">Esportes</a>
          <a href="#" className="text-primary border-b-2 border-primary pb-1">Cassino</a>
          <a href="#" className="hover:text-primary transition-colors">Ao Vivo</a>
          <a href="#" className="hover:text-primary transition-colors">Torneios</a>
          <a href="#" className="hover:text-primary transition-colors">Promoções</a>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" className="text-white hover:bg-white/10">Entrar</Button>
        <Button className="bg-[#99f301] text-black hover:bg-[#88d901] font-bold">REGISTRAR</Button>
      </div>
    </header>
  );
}

function SidebarNav() {
  const menuItems = [
    { icon: Flame, label: "Missões", active: true },
    { icon: Trophy, label: "Torneios" },
    { icon: Gift, label: "Resgatar" },
    { icon: Dices, label: "Roleta" },
  ];

  return (
    <aside className="w-64 bg-[#001b34] hidden md:flex flex-col border-r border-white/5">
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                item.active ? 'bg-primary text-black' : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-8">
          <h3 className="px-3 text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Ligas Principais</h3>
          <div className="space-y-1">
            {["La Liga", "Brasileirão Série A", "Premier League", "Serie A", "Ligue 1"].map((liga) => (
              <button key={liga} className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                <span>{liga}</span>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>
            ))}
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}

function GameCard({ title, image, rank }: { title: string, image: string, rank?: number }) {
  return (
    <div className="relative group cursor-pointer">
      {rank && (
        <span className="absolute -left-4 top-1/2 -translate-y-1/2 text-6xl font-black text-white/10 italic group-hover:text-primary/20 transition-colors">
          {rank}
        </span>
      )}
      <div className="rounded-xl overflow-hidden aspect-[3/4] bg-white/5 border border-white/5 group-hover:border-primary/50 transition-all">
        <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      </div>
    </div>
  );
}

function Index() {
  return (
    <div className="flex flex-col min-h-screen bg-[#001224] text-white">
      <Header />
      <div className="flex flex-1">
        <SidebarNav />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8">
            {/* Hero Banner */}
            <div className="rounded-2xl overflow-hidden bg-gradient-to-r from-blue-900 to-black aspect-[21/9] relative">
              <img 
                src="https://singlebet.com/cdn-cgi/image/width=1200,quality=80,format=webp/https://assets.singlebet.com/banner/2025-12-01T14:26:05.123Z.webp" 
                alt="Promotion"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Quick Categories */}
            <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
              {['Slots', 'Crash', 'Popok', 'Tada', 'Drops', 'Promo', 'Mesas', 'JetX'].map((cat) => (
                <div key={cat} className="flex flex-col items-center gap-2 cursor-pointer group">
                  <div className="w-14 h-14 rounded-full bg-[#001b34] border border-white/10 flex items-center justify-center group-hover:border-primary group-hover:text-primary transition-all">
                    <Search className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-gray-400 group-hover:text-white">{cat}</span>
                </div>
              ))}
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input className="pl-10 bg-[#001b34] border-white/10 h-12" placeholder="Pesquise um jogo de cassino..." />
              </div>
              <Button variant="secondary" className="bg-[#99f301] text-black h-12 px-6">
                Filtros
              </Button>
            </div>

            {/* Top Games */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Populares</h2>
                <Button variant="link" className="text-primary hover:text-primary/80">Ver mais</Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 pl-4">
                <GameCard rank={1} title="Fortune Rabbit" image="https://singlebet.com/cdn-cgi/image/width=180,quality=80,format=webp/https://assets.singlebet.com/thumbnail/2025-12-01T14:25:28.495Z.webp" />
                <GameCard rank={2} title="JetX" image="https://singlebet.com/cdn-cgi/image/width=180,quality=80,format=webp/https://assets.singlebet.com/thumbnail/2025-12-01T14:25:13.239Z.webp" />
                <GameCard rank={3} title="Fortune Dragon" image="https://singlebet.com/cdn-cgi/image/width=180,quality=80,format=webp/https://assets.singlebet.com/thumbnail/2025-12-01T14:25:06.374Z.webp" />
                <GameCard rank={4} title="Aviator" image="https://singlebet.com/cdn-cgi/image/width=180,quality=80,format=webp/https://assets.singlebet.com/thumbnail/2025-12-01T14:25:21.123Z.webp" />
                <GameCard rank={5} title="Fortune Tiger" image="https://singlebet.com/cdn-cgi/image/width=180,quality=80,format=webp/https://assets.singlebet.com/thumbnail/2025-12-01T14:25:35.789Z.webp" />
                <GameCard rank={6} title="Fortune Ganesha" image="https://singlebet.com/cdn-cgi/image/width=180,quality=80,format=webp/https://assets.singlebet.com/thumbnail/2025-12-01T14:25:42.456Z.webp" />
              </div>
            </div>

            {/* Providers */}
            <div className="bg-[#001b34] p-6 rounded-2xl border border-white/5">
              <div className="flex items-center gap-8 overflow-x-auto no-scrollbar opacity-50 grayscale hover:grayscale-0 transition-all">
                {['PG Soft', 'Pragmatic', 'Evolution', 'Spribe', 'Hacksaw'].map(p => (
                  <span key={p} className="text-xl font-black whitespace-nowrap">{p}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="bg-[#000d1a] mt-16 px-4 py-12 border-t border-white/5">
            <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="space-y-4">
                <h4 className="font-bold text-gray-300">Menu do Site</h4>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li><a href="#" className="hover:text-white">Apostas Esportivas</a></li>
                  <li><a href="#" className="hover:text-white">Atendimento e Suporte</a></li>
                  <li><a href="#" className="hover:text-white">Cassino</a></li>
                  <li><a href="#" className="hover:text-white">Bolões</a></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="font-bold text-gray-300">Documentos Legais</h4>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li><a href="#" className="hover:text-white">Integridade</a></li>
                  <li><a href="#" className="hover:text-white">Política de Jogo</a></li>
                  <li><a href="#" className="hover:text-white">Privacidade</a></li>
                  <li><a href="#" className="hover:text-white">Sobre nós</a></li>
                </ul>
              </div>
              <div className="col-span-2 space-y-6">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center font-bold text-xl">PIX</div>
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center font-bold text-xl text-red-500">+18</div>
                  <div className="flex-1 bg-white/5 p-4 rounded-lg text-xs text-gray-500">
                    Jogue com responsabilidade. A PixBet é operada pela NSX Enterprise N.V.
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
