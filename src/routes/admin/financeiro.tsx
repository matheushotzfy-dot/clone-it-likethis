import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, TrendingUp, TrendingDown, DollarSign, Megaphone, Receipt, Percent } from "lucide-react";
import { listAdSpend, createAdSpend, deleteAdSpend, listGatewayRecon, createGatewayRecon, deleteGatewayRecon, getFinanceSummary } from "@/lib/finance.functions";

export const Route = createFileRoute("/admin/financeiro")({ component: FinanceiroPage });

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const today = () => new Date().toISOString().slice(0, 10);

function FinanceiroPage() {
  const qc = useQueryClient();
  const fetchSummary = useServerFn(getFinanceSummary);
  const fetchAds = useServerFn(listAdSpend);
  const fetchRecon = useServerFn(listGatewayRecon);
  const addAd = useServerFn(createAdSpend);
  const delAd = useServerFn(deleteAdSpend);
  const addRecon = useServerFn(createGatewayRecon);
  const delRecon = useServerFn(deleteGatewayRecon);

  const { data: summary } = useQuery({ queryKey: ["finance-summary"], queryFn: () => fetchSummary() });
  const { data: ads } = useQuery({ queryKey: ["ad-spend"], queryFn: () => fetchAds() });
  const { data: recon } = useQuery({ queryKey: ["gateway-recon"], queryFn: () => fetchRecon() });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["finance-summary"] });
    qc.invalidateQueries({ queryKey: ["ad-spend"] });
    qc.invalidateQueries({ queryKey: ["gateway-recon"] });
  };

  // Ad form
  const [adDate, setAdDate] = useState(today());
  const [adAmount, setAdAmount] = useState("");
  const [adPlatform, setAdPlatform] = useState("meta");
  const [adCampaign, setAdCampaign] = useState("");
  const [adNotes, setAdNotes] = useState("");

  const submitAd = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(adAmount.replace(",", "."));
    if (!amount || amount <= 0) return toast.error("Informe um valor válido");
    try {
      await addAd({ data: { spend_date: adDate, amount, platform: adPlatform, campaign: adCampaign || null, notes: adNotes || null } });
      toast.success("Gasto registrado");
      setAdAmount(""); setAdCampaign(""); setAdNotes("");
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  // Recon form
  const [rDate, setRDate] = useState(today());
  const [rReal, setRReal] = useState("");
  const [rFees, setRFees] = useState("");
  const [rNotes, setRNotes] = useState("");

  const submitRecon = async (e: React.FormEvent) => {
    e.preventDefault();
    const real_amount = Number(rReal.replace(",", "."));
    const fees = Number((rFees || "0").replace(",", "."));
    if (real_amount < 0 || isNaN(real_amount)) return toast.error("Valor inválido");
    try {
      await addRecon({ data: { ref_date: rDate, real_amount, fees, notes: rNotes || null } });
      toast.success("Conciliação registrada");
      setRReal(""); setRFees(""); setRNotes("");
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const s = summary ?? { deposits: 0, withdrawals: 0, adSpend: 0, gatewayReal: 0, gatewayFees: 0, grossProfit: 0, realGross: 0, netProfit: 0, roi: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black">Financeiro</h2>
        <p className="text-sm text-muted-foreground">Acompanhe gastos com ADS, taxas do gateway e seu lucro real.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI title="Depósitos" value={brl(s.deposits)} icon={<TrendingUp className="size-4" />} tone="success" />
        <KPI title="Saques" value={brl(s.withdrawals)} icon={<TrendingDown className="size-4" />} tone="danger" />
        <KPI title="Gasto em ADS" value={brl(s.adSpend)} icon={<Megaphone className="size-4" />} />
        <KPI title="Taxas Gateway" value={brl(s.gatewayFees)} icon={<Percent className="size-4" />} />
        <KPI title="Recebido real (Gateway)" value={brl(s.gatewayReal)} icon={<DollarSign className="size-4" />} />
        <KPI title="Lucro bruto (real - saques)" value={brl(s.realGross)} tone={s.realGross >= 0 ? "success" : "danger"} icon={<Receipt className="size-4" />} />
        <KPI title="Lucro líquido" value={brl(s.netProfit)} tone={s.netProfit >= 0 ? "success" : "danger"} icon={<DollarSign className="size-4" />} highlight />
        <KPI title="ROI" value={`${s.roi.toFixed(1)}%`} tone={s.roi >= 0 ? "success" : "danger"} icon={<TrendingUp className="size-4" />} />
      </div>

      <Tabs defaultValue="ads">
        <TabsList>
          <TabsTrigger value="ads">Gastos com ADS</TabsTrigger>
          <TabsTrigger value="recon">Conciliação Gateway</TabsTrigger>
        </TabsList>

        <TabsContent value="ads" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Registrar gasto</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={submitAd} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                <div><Label>Data</Label><Input type="date" value={adDate} onChange={(e) => setAdDate(e.target.value)} required /></div>
                <div><Label>Valor (R$)</Label><Input inputMode="decimal" placeholder="0,00" value={adAmount} onChange={(e) => setAdAmount(e.target.value)} required /></div>
                <div>
                  <Label>Plataforma</Label>
                  <Select value={adPlatform} onValueChange={setAdPlatform}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meta">Meta (FB/IG)</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="kwai">Kwai</SelectItem>
                      <SelectItem value="influencer">Influencer</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2"><Label>Campanha</Label><Input value={adCampaign} onChange={(e) => setAdCampaign(e.target.value)} placeholder="opcional" /></div>
                <Button type="submit" className="h-10">Adicionar</Button>
                <div className="md:col-span-6"><Label>Observações</Label><Textarea rows={2} value={adNotes} onChange={(e) => setAdNotes(e.target.value)} /></div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Histórico de ADS</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Plataforma</TableHead><TableHead>Campanha</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Obs</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {(ads ?? []).map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell>{new Date(a.spend_date).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="capitalize">{a.platform}</TableCell>
                      <TableCell>{a.campaign ?? "—"}</TableCell>
                      <TableCell className="text-right font-semibold">{brl(Number(a.amount))}</TableCell>
                      <TableCell className="max-w-[260px] truncate text-muted-foreground text-xs">{a.notes ?? ""}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={async () => { if (confirm("Apagar este registro?")) { await delAd({ data: { id: a.id } }); refresh(); } }}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!ads?.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum gasto registrado</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recon" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Conciliação do Gateway</CardTitle>
              <p className="text-xs text-muted-foreground">Informe o valor real que entrou no gateway e as taxas pra calcular o lucro de verdade.</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitRecon} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <div><Label>Data</Label><Input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} required /></div>
                <div><Label>Valor real (R$)</Label><Input inputMode="decimal" placeholder="0,00" value={rReal} onChange={(e) => setRReal(e.target.value)} required /></div>
                <div><Label>Taxas (R$)</Label><Input inputMode="decimal" placeholder="0,00" value={rFees} onChange={(e) => setRFees(e.target.value)} /></div>
                <Button type="submit" className="h-10">Adicionar</Button>
                <div className="md:col-span-5"><Label>Observações</Label><Textarea rows={2} value={rNotes} onChange={(e) => setRNotes(e.target.value)} /></div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Histórico de conciliações</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead className="text-right">Valor real</TableHead><TableHead className="text-right">Taxas</TableHead><TableHead>Obs</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {(recon ?? []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(r.ref_date).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-right font-semibold">{brl(Number(r.real_amount))}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{brl(Number(r.fees))}</TableCell>
                      <TableCell className="max-w-[260px] truncate text-muted-foreground text-xs">{r.notes ?? ""}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={async () => { if (confirm("Apagar este registro?")) { await delRecon({ data: { id: r.id } }); refresh(); } }}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!recon?.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma conciliação registrada</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPI({ title, value, icon, tone, highlight }: { title: string; value: string; icon?: React.ReactNode; tone?: "success" | "danger"; highlight?: boolean }) {
  const toneClass = tone === "success" ? "text-emerald-500" : tone === "danger" ? "text-destructive" : "text-foreground";
  return (
    <Card className={highlight ? "border-primary/40 bg-primary/5" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">{icon}{title}</div>
        <div className={`text-xl font-black ${toneClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
