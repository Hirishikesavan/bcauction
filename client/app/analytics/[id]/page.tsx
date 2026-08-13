'use client';
import {
  BarChart3, UserRound, CheckCircle as ChkC, XCircle as XC, IndianRupee as IR,
  Trophy, TrendingDown, Flame, Bot, Lock, Search, TriangleAlert as TrAlert, Target,
  Scale, Wallet
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/shared/AuthGuard';
import api from '@/lib/api';
import { fmt } from '@/lib/utils';
import toast from 'react-hot-toast';
import BackButton from '@/components/shared/BackButton';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [auctions, setAuctions]   = useState<any[]>([]);
  const [selAuction, setSelAuction] = useState<any>(null);
  const [report, setReport]       = useState<any>(null);
  const [orgPkg, setOrgPkg]       = useState<any>(null);
  const [loading, setLoading]     = useState(false);
  const [aiResult, setAiResult]   = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiActiveType, setAiActiveType] = useState('');

  useEffect(() => {
    if (!user) return;
    api.get('/packages/my').then(r => setOrgPkg(r.data.package)).catch(() => {});
    api.get('/auctions/my').then(r => {
      const list = r.data.auctions || [];
      setAuctions(list);
      if (list.length) setSelAuction(list[0]);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!selAuction) return;
    setLoading(true);
    api.get(`/packages/reports/${selAuction._id}`)
      .then(r => setReport(r.data))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [selAuction?._id]);

  const isPro = user?.role === 'admin' || ['pro','elite'].includes(orgPkg?.packageType);
  const isElite = user?.role === 'admin' || orgPkg?.packageType === 'elite';

  const fetchAi = async (type: string) => {
    if (!selAuction) return;
    setAiLoading(true);
    setAiActiveType(type);
    try {
      const r = await api.post('/packages/ai/analyze', { auctionId: selAuction._id, analysisType: type });
      setAiResult({ type, data: r.data.analysis });
    } catch (e: any) {
      if (e.response?.data?.code === 'FEATURE_LOCKED') toast.error('AI requires Elite plan');
      else toast.error('Analysis failed');
    } finally { setAiLoading(false); }
  };

  const summary = report?.summary || {};
  const teamReports: any[] = report?.teamReports || [];
  const allPlayers = teamReports.flatMap((tr: any) =>
    (tr.squad || []).map((p: any) => ({ ...p, teamName: tr.team.name, teamColor: tr.team.primaryColor }))
  );
  const soldPlayers  = allPlayers.filter(p => p.status !== 'unsold' && p.soldPrice > 0);
  const unsoldPlayers = allPlayers.filter(p => p.status === 'unsold' || !p.soldPrice);
  const avgSold = soldPlayers.length ? Math.round(soldPlayers.reduce((s, p) => s + p.soldPrice, 0) / soldPlayers.length) : 0;
  const topSales = [...soldPlayers].sort((a, b) => b.soldPrice - a.soldPrice).slice(0, 8);

  const roleBreakdown = allPlayers.reduce((acc: any, p: any) => {
    acc[p.role] = (acc[p.role] || 0) + 1;
    return acc;
  }, {});
  const categorySpend = soldPlayers.reduce((acc: any, p: any) => {
    acc[p.category] = (acc[p.category] || 0) + p.soldPrice;
    return acc;
  }, {});
  const mostActive = [...teamReports].sort((a, b) => (b.totalSpent||0) - (a.totalSpent||0))[0];
  const mostConservative = [...teamReports].sort((a, b) => (a.totalSpent||0) - (b.totalSpent||0))[0];
  const biggestPurse = [...teamReports].sort((a, b) => b.remainingPurse - a.remainingPurse)[0];
  const unsoldPct = allPlayers.length ? Math.round(unsoldPlayers.length / allPlayers.length * 100) : 0;

  const roleColors: any = { Batsman: '#60a5fa', Bowler: '#f87171', AllRounder: '#4ade80', WicketKeeper: '#a78bfa', Other: '#94a3b8' };
  const catColors: any = { Elite: '#a78bfa', Gold: '#f59e0b', Silver: '#94a3b8', Emerging: '#4ade80' };

  const maxSpend = Math.max(...teamReports.map(t => t.totalSpent || 0), 1);

  return (
    <AuthGuard roles={['organizer','admin']}>
      <div className="min-h-screen bg-background">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "url('/bg-organizer.png')", backgroundSize: 'cover', opacity: 0.1 }} />
        <div className="relative p-6 max-w-7xl mx-auto">
          <div className="mb-4"><BackButton href="/dashboard/organizer" label="Dashboard" /></div>

          <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
            <div>
              <h1 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground">Advanced <span className="text-gradient-gold">Analytics</span></h1>
              <p className="text-muted-foreground font-display text-sm mt-1">Deep auction intelligence — Pro & Elite feature</p>
            </div>
            <select value={selAuction?._id || ''} onChange={e => setSelAuction(auctions.find(a => a._id === e.target.value) || null)}
              className="input-beast" style={{ background: 'hsl(0 0% 8%)', minWidth: 220 }}>
              <option value="">-- Select Auction --</option>
              {auctions.map(a => <option key={a._id} value={a._id} style={{ background: 'hsl(0 0% 8%)' }}>{a.name}</option>)}
            </select>
          </div>

          {!isPro ? (
            <div className="text-center py-24 bg-glass-navy rounded-2xl border border-yellow-500/30">
              <div className="flex justify-center mb-4"><BarChart3 size={56} className="text-primary" /></div>
              <h3 className="font-heading text-2xl uppercase tracking-wider text-foreground mb-3">Pro Feature</h3>
              <p className="text-muted-foreground font-display mb-6">Advanced Analytics requires Pro or Elite plan</p>
              <a href="/dashboard/organizer" className="px-8 py-3 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm glow-gold">Upgrade Now →</a>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-24">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : report ? (
            <div className="space-y-8">

              {/* ── KPI Row ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {[
                  { Icon: UserRound, label: 'Total Players', value: allPlayers.length },
                  { Icon: ChkC, label: 'Sold', value: soldPlayers.length, color: 'text-green-400' },
                  { Icon: XC, label: 'Unsold', value: unsoldPlayers.length, color: 'text-red-400' },
                  { Icon: BarChart3, label: 'Unsold %', value: unsoldPct + '%', color: unsoldPct > 30 ? 'text-red-400' : 'text-green-400' },
                  { Icon: IR, label: 'Total Spent', value: fmt(summary.totalRevenue), color: 'text-gradient-gold' },
                  { Icon: Trophy, label: 'Highest Sale', value: fmt(summary.highestSale), color: 'text-primary' },
                  { Icon: TrendingDown, label: 'Avg Sold', value: fmt(avgSold) },
                ].map(stat => (
                  <div key={stat.label} className="bg-glass-premium rounded-xl p-4 text-center border-gold-subtle">
                    <div className="text-xl mb-1"><stat.Icon size={20} /></div>
                    <div className={`font-heading text-lg font-bold ${stat.color || 'text-foreground'}`}>{stat.value}</div>
                    <div className="text-[9px] font-heading uppercase tracking-wider text-muted-foreground mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* ── Team Spending Bars ── */}
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-glass-premium rounded-2xl p-6 border-gold-subtle">
                  <h3 className="font-heading text-lg uppercase tracking-wider text-foreground mb-5 flex items-center gap-2"><IR size={16} />Team Spending Analysis</h3>
                  <div className="space-y-4">
                    {[...teamReports].sort((a,b)=>(b.totalSpent||0)-(a.totalSpent||0)).map((tr: any) => {
                      const pct = maxSpend > 0 ? (tr.totalSpent||0) / maxSpend * 100 : 0;
                      const budgetPct = (tr.totalSpent||0) / (tr.totalSpent + tr.remainingPurse) * 100;
                      return (
                        <div key={tr.team._id}>
                          <div className="flex justify-between text-xs font-display mb-1.5">
                            <span className="text-foreground font-semibold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full inline-block" style={{ background: tr.team.primaryColor || '#f59e0b' }} />
                              {tr.team.name}
                            </span>
                            <span className="text-muted-foreground">{fmt(tr.totalSpent)} · {Math.round(budgetPct)}% budget</span>
                          </div>
                          <div className="w-full h-3 bg-secondary/20 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.1 }}
                              className="h-full rounded-full" style={{ background: tr.team.primaryColor || '#f59e0b' }} />
                          </div>
                          <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                            <span>{tr.squadSize} players</span>
                            <span>{fmt(tr.remainingPurse)} remaining</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Role Breakdown ── */}
                <div className="bg-glass-premium rounded-2xl p-6 border-gold-subtle">
                  <h3 className="font-heading text-lg uppercase tracking-wider text-foreground mb-5 flex items-center gap-2"><UserRound size={16} />Role Distribution</h3>
                  <div className="space-y-3">
                    {Object.entries(roleBreakdown).map(([role, count]: [string, any]) => {
                      const pct = allPlayers.length > 0 ? count / allPlayers.length * 100 : 0;
                      return (
                        <div key={role}>
                          <div className="flex justify-between text-xs font-display mb-1">
                            <span style={{ color: roleColors[role] || '#94a3b8' }}>{role}</span>
                            <span className="text-muted-foreground">{count} players ({Math.round(pct)}%)</span>
                          </div>
                          <div className="w-full h-2.5 bg-secondary/20 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7 }}
                              className="h-full rounded-full" style={{ background: roleColors[role] || '#94a3b8' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── CATEGORY BREAKDOWN (Elite/Gold/Silver/Emerging) ── */}
              <div className="bg-glass-premium rounded-2xl p-6 border-gold-subtle">
                <h3 className="font-heading text-lg uppercase tracking-wider text-foreground mb-5">⭐ Category Breakdown</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="grid grid-cols-2 gap-3">
                    {['Elite','Gold','Silver','Emerging'].map(cat => {
                      const group = soldPlayers.filter((p:any) => p.category === cat);
                      const spend = group.reduce((s:number,p:any)=>s+(p.soldPrice||0),0);
                      const avg   = group.length ? Math.round(spend/group.length) : 0;
                      if (group.length === 0) return null;
                      return (
                        <div key={cat} className="rounded-xl p-4 text-center" style={{ background: `${catColors[cat]}10`, border: `1px solid ${catColors[cat]}30` }}>
                          <div className="font-heading text-2xl font-bold" style={{ color: catColors[cat] }}>{group.length}</div>
                          <div className="text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-2">{cat} Players</div>
                          <div className="text-xs font-display text-foreground font-semibold">{fmt(spend)}</div>
                          <div className="text-[10px] text-muted-foreground">avg {fmt(avg)}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <h4 className="font-heading text-sm uppercase tracking-wider text-muted-foreground mb-3">Budget Allocation by Category</h4>
                    <div className="space-y-3">
                      {Object.entries(categorySpend).sort(([,a]:any,[,b]:any)=>b-a).map(([cat, spend]: [string, any]) => {
                        const totalCatSpend: number = Object.values(categorySpend).reduce((s:any,v:any)=>s+v, 0) as number;
                        const pct = totalCatSpend > 0 ? (spend / totalCatSpend) * 100 : 0;
                        return (
                          <div key={cat}>
                            <div className="flex justify-between text-xs font-display mb-1">
                              <span style={{ color: catColors[cat] || '#94a3b8' }} className="font-semibold">{cat}</span>
                              <span className="text-muted-foreground">{fmt(spend)} ({Math.round(pct)}%)</span>
                            </div>
                            <div className="w-full h-2.5 bg-secondary/20 rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7 }}
                                className="h-full rounded-full" style={{ background: catColors[cat] || '#94a3b8' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── BEAST AI ANALYSIS (Elite only) ── */}
              <div className="bg-glass-premium rounded-2xl p-6 border border-purple-500/30">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-heading text-lg uppercase tracking-wider text-purple-400 flex items-center gap-2"><Bot size={16} />Beast AI Analysis</h3>
                  {!isElite && <span className="text-[10px] px-2 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 font-heading uppercase tracking-wider">Elite Only</span>}
                </div>
                {!isElite ? (
                  <div className="text-center py-10">
                    <div className="flex justify-center mb-3"><Lock size={36} className="text-primary" /></div>
                    <p className="text-muted-foreground font-display mb-4">AI-powered team analysis, fraud detection, and bid intelligence require the Elite plan.</p>
                    <Link href="/dashboard/organizer" className="inline-block px-6 py-2.5 rounded-lg bg-purple-600 text-white font-heading uppercase tracking-wider text-xs hover:bg-purple-700 transition-all">Upgrade to Elite →</Link>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { type: 'team_analysis',     Icon: Scale, label: 'Team Strength',   desc: 'Squad ratings for every team' },
                      { type: 'auction_summary',   Icon: BarChart3, label: 'Auction Summary', desc: 'Bargains, overpays, key stats' },
                      { type: 'unsold_suggestions',Icon: Search, label: 'Unsold Picks',    desc: 'Best unsold players to target' },
                      { type: 'purse_advice',      Icon: Wallet, label: 'Purse Advice',    desc: 'Budget warnings per team' },
                      { type: 'fraud_detection',   Icon: TrAlert, label: 'Fraud Check',     desc: 'Suspicious bidding alerts' },
                    ].map(item => (
                      <button key={item.type} onClick={() => fetchAi(item.type)} disabled={aiLoading}
                        className="text-left bg-secondary/10 rounded-xl p-4 border border-purple-500/15 hover:border-purple-500/40 transition-all disabled:opacity-50">
                        <div className="text-2xl mb-2"><item.Icon size={22} /></div>
                        <div className="font-heading text-sm uppercase tracking-wider text-foreground">{item.label}</div>
                        <div className="text-xs text-muted-foreground font-display mt-1">{item.desc}</div>
                        <div className="mt-3 text-[10px] font-heading uppercase tracking-wider text-purple-400">{aiLoading && aiActiveType === item.type ? 'Running...' : 'Run →'}</div>
                      </button>
                    ))}
                  </div>
                )}

                {/* AI Result Display */}
                {aiResult && (
                  <div className="mt-5 pt-5 border-t border-purple-500/20">
                    {aiResult.type === 'team_analysis' && (
                      <div className="space-y-2">
                        <h4 className="font-heading text-sm uppercase tracking-wider text-foreground mb-3">Team Rankings</h4>
                        {aiResult.data.teams?.map((t: any, i: number) => (
                          <div key={t.team} className="flex items-center justify-between text-sm font-display p-2 rounded-lg bg-secondary/10">
                            <span className="text-foreground">#{i+1} {t.team}</span>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {t.missing?.length > 0 && <span className="text-red-400">Missing: {t.missing.join(', ')}</span>}
                              <span className="text-primary font-bold">{t.overall}/10</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {aiResult.type === 'auction_summary' && (
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1.5 text-sm font-display">
                          <div className="flex justify-between"><span className="text-muted-foreground">Total Spent</span><span className="text-primary font-bold">{fmt(aiResult.data.totalSpent)}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Highest Bid</span><span className="text-yellow-400">{fmt(aiResult.data.highestBid)}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Average Bid</span><span>{fmt(aiResult.data.avgBid)}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Unsold</span><span className="text-red-400">{aiResult.data.unsoldPercent}%</span></div>
                        </div>
                        <div className="text-xs font-display space-y-1">
                          {aiResult.data.topBargains?.length > 0 && <div className="text-green-400 font-semibold mb-1 flex items-center gap-1"><Target size={13} /> Top Bargains</div>}
                          {aiResult.data.topBargains?.map((b:any) => <div key={b.name} className="flex justify-between text-muted-foreground"><span>{b.name}</span><span className="text-green-400">saved {fmt(b.saving)}</span></div>)}
                        </div>
                      </div>
                    )}
                    {aiResult.type === 'purse_advice' && (
                      <div className="space-y-2">
                        {aiResult.data.teams?.map((t: any) => (
                          <div key={t.team} className="flex items-center justify-between text-sm font-display p-2 rounded-lg bg-secondary/10">
                            <span className="text-foreground">{t.team}</span>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-muted-foreground">{fmt(t.avgBudget)}/slot</span>
                              <span className={t.warningLevel === 'CRITICAL' ? 'text-red-400' : t.warningLevel === 'HIGH' ? 'text-yellow-400' : 'text-green-400'}>{t.warningLevel}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {aiResult.type === 'fraud_detection' && (
                      <div className="text-sm font-display">
                        {aiResult.data.suspiciousPatterns?.length === 0
                          ? <div className="text-green-400"><ChkC size={13} className="inline mr-1" />No suspicious bidding patterns detected — clean auction</div>
                          : aiResult.data.suspiciousPatterns?.map((p:any) => <div key={p.team} className="text-red-400"><TrAlert size={11} className="inline mr-1 text-yellow-400" />{p.team}: {p.reason} ({p.count}x)</div>)
                        }
                      </div>
                    )}
                    {aiResult.type === 'unsold_suggestions' && (
                      <div className="space-y-2">
                        {aiResult.data.suggestions?.slice(0,8).map((s:any) => (
                          <div key={s.player._id} className="flex items-center justify-between text-sm font-display p-2 rounded-lg bg-secondary/10">
                            <span className="text-foreground">{s.player.name} <span className="text-muted-foreground text-xs">({s.player.role})</span></span>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {s.teams?.length > 0 && <span>Needed by: {s.teams.join(', ')}</span>}
                              <span className="text-primary font-bold">{fmt(s.player.basePrice)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Top Sales Table ── */}
              <div className="bg-glass-premium rounded-2xl overflow-hidden border-gold-subtle">
                <div className="px-6 py-4 border-b border-border/30">
                  <h3 className="font-heading text-lg uppercase tracking-wider text-foreground flex items-center gap-2"><Trophy size={16} />Top 8 Highest Sales</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: 'hsl(0 0% 5%)' }}>
                      {['#','Player','Role','Category','Team','Base','Sold','Δ vs Base'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-heading uppercase tracking-wider text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topSales.map((p: any, i: number) => {
                      const delta   = (p.soldPrice || 0) - (p.basePrice || 0);
                      const deltaColor = delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-muted-foreground';
                      return (
                        <tr key={p._id} className="border-t border-border/20 hover:bg-secondary/10 transition-all">
                          <td className="px-4 py-3 font-heading text-muted-foreground">#{i+1}</td>
                          <td className="px-4 py-3 font-display font-semibold text-foreground">{p.name}</td>
                          <td className="px-4 py-3"><span style={{ color: roleColors[p.role], fontSize: 10, border: `1px solid ${roleColors[p.role]}44`, padding: '2px 6px', borderRadius: 4 }} className="font-heading uppercase">{p.role}</span></td>
                          <td className="px-4 py-3"><span style={{ color: catColors[p.category], fontSize: 10 }} className="font-heading uppercase">{p.category}</span></td>
                          <td className="px-4 py-3 text-muted-foreground font-display">{p.teamName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{fmt(p.basePrice)}</td>
                          <td className="px-4 py-3 font-bold text-primary">{fmt(p.soldPrice)}</td>
                          <td className={`px-4 py-3 font-bold ${deltaColor}`}>{delta >= 0 ? '+' : ''}{fmt(delta)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Insights Row ── */}
              <div className="grid md:grid-cols-3 gap-5">
                {[
                  { Icon: Flame, label: 'Most Active Team', team: mostActive, desc: 'Highest total spending' },
                  { Icon: TrendingDown, label: 'Most Conservative', team: mostConservative, desc: 'Lowest total spending' },
                  { Icon: IR, label: 'Biggest Purse Left', team: biggestPurse, desc: 'Most remaining budget' },
                ].map(({ Icon, label, team, desc }) => (
                  <div key={label} className="bg-glass-premium rounded-xl p-5 border-gold-subtle">
                    <div className="text-2xl mb-2"><Icon size={22} /></div>
                    <div className="font-heading text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
                    <div className="font-heading text-xl uppercase tracking-wider text-foreground">{team?.team?.name || '—'}</div>
                    <div className="text-xs text-muted-foreground font-display mt-1">{desc}</div>
                    {team && <div className="text-primary font-bold mt-2">{label.includes('Purse') ? fmt(team.remainingPurse) : fmt(team.totalSpent)}</div>}
                  </div>
                ))}
              </div>

              {/* ── Unsold Analysis ── */}
              {unsoldPlayers.length > 0 && (
                <div className="bg-glass-premium rounded-2xl p-6 border border-red-500/20">
                  <h3 className="font-heading text-lg uppercase tracking-wider text-foreground mb-4 flex items-center gap-2"><XC size={16} className="text-red-400" />Unsold Players ({unsoldPlayers.length})</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {unsoldPlayers.slice(0, 8).map((p: any) => (
                      <div key={p._id} className="bg-secondary/20 rounded-xl p-3 text-xs font-display">
                        <div className="text-foreground font-semibold truncate">{p.name}</div>
                        <div className="text-muted-foreground">{p.role} · {p.category}</div>
                        <div className="text-red-400 font-bold mt-1">Base: {fmt(p.basePrice)}</div>
                      </div>
                    ))}
                  </div>
                  {unsoldPlayers.length > 8 && <p className="text-xs text-muted-foreground mt-3 font-display">+ {unsoldPlayers.length - 8} more unsold players</p>}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-24 bg-glass-navy rounded-2xl border-gold-subtle">
              <div className="flex justify-center mb-4"><BarChart3 size={48} className="text-primary" /></div>
              <h3 className="font-heading text-xl uppercase tracking-wider text-foreground mb-2">Select an Auction</h3>
              <p className="text-muted-foreground font-display">Choose an auction above to view analytics</p>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
