'use client';
import {
  Bot, BarChart3, Trophy, UserRound, FolderOpen, Lock, IndianRupee as IR,
  Loader2, Target, CheckCircle as ChkC, XCircle as XC, TriangleAlert as TriangleAlert
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import api, { imgUrl } from '@/lib/api';
import { fmt } from '@/lib/utils';
import toast from 'react-hot-toast';
import BackButton from '@/components/shared/BackButton';
import { generateSquadBookPdf } from '@/lib/squadBookPdf';

const categoryColors: any = {
  Elite: 'border-purple-500/40 text-purple-400 bg-purple-500/10',
  Gold: 'border-yellow-500/40 text-yellow-400 bg-yellow-500/10',
  Silver: 'border-gray-400/40 text-gray-300 bg-gray-400/10',
  Emerging: 'border-green-500/40 text-green-400 bg-green-500/10',
};
const roleColors: any = {
  Batsman: 'border-blue-500/40 text-blue-400',
  Bowler: 'border-red-500/40 text-red-400',
  AllRounder: 'border-green-500/40 text-green-400',
  WicketKeeper: 'border-purple-500/40 text-purple-400',
  Other: 'border-gray-500/40 text-gray-400',
};

export default function ReportsPage() {
  const { user } = useAuth();
  const [auctions, setAuctions]       = useState<any[]>([]);
  const [selAuction, setSelAuction]   = useState<any>(null);
  const [report, setReport]           = useState<any>(null);
  const [aiSummary, setAiSummary]     = useState<any>(null);
  const [orgPkg, setOrgPkg]           = useState<any>(null);
  const [loading, setLoading]         = useState(false);
  const [aiLoading, setAiLoading]     = useState(false);
  const [activeTab, setActiveTab]     = useState<'overview'|'teams'|'players'|'reports'|'ai'>('overview');
  const [pdfGenerating, setPdfGenerating] = useState(false);

  useEffect(() => {
    if (!user) return;
    // FIX: this page used to ONLY work for organizers (/auctions/my).
    // Team owners and viewers now get a role-appropriate auction list too.
    const fetchAuctions = user.role === 'organizer' || user.role === 'admin'
      ? api.get('/auctions/my')
      : user.role === 'team_owner'
        ? api.get('/auctions/participated')
        : api.get('/auctions').then(r => ({ data: { auctions: (r.data.auctions || []).filter((a: any) => a.status === 'completed' || a.status === 'active') } }));

    fetchAuctions.then((r: any) => {
      const list = r.data.auctions || [];
      setAuctions(list);
      if (list.length) setSelAuction(list[0]);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!selAuction) return;
    setLoading(true);
    setReport(null); setAiSummary(null);
    api.get(`/packages/reports/${selAuction._id}`)
      .then(r => setReport(r.data))
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false));
    // For admin, bypass package check - they have full access
    // For team owners and organizers, fetch the organizer's plan
    const ADMIN_EMAILS = ['hirishidraj07@gmail.com', 'hirishi2020@gmail.com'];
    const isAdmin = user?.role === 'admin' || (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
    if (isAdmin) {
      setOrgPkg({ packageType: 'elite' }); // Admin gets full Elite access
    } else {
      api.get(`/auctions/${selAuction._id}/plan`).then(r => setOrgPkg(r.data)).catch(() => {});
    }
  }, [selAuction?._id, user?.role, user?.email]);

  const fetchAiSummary = async () => {
    if (!selAuction) return;
    setAiLoading(true);
    try {
      const r = await api.post('/packages/ai/analyze', { auctionId: selAuction._id, analysisType: 'auction_summary' });
      setAiSummary(r.data.analysis);
      setActiveTab('ai');
    } catch (err: any) {
      if (err.response?.data?.code === 'FEATURE_LOCKED') toast.error('AI Features require Elite plan');
      else toast.error('AI analysis failed');
    } finally { setAiLoading(false); }
  };

  const exportCSV = () => {
    if (!report) return;
    const rows: string[] = ['Team,Player,Role,Category,Sold Price,Base Price'];
    report.teamReports?.forEach((tr: any) => {
      tr.squad?.forEach((p: any) => {
        rows.push(`"${tr.team.name}","${p.name}","${p.role}","${p.category}",${p.soldPrice||0},${p.basePrice||0}`);
      });
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${selAuction?.name}-report.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded!');
  };

  const exportExcel = () => {
    if (!report || !['pro','elite'].includes(orgPkg?.packageType)) {
      toast.error('Excel Export requires Pro or Elite plan'); return;
    }
    // We generate a tab-separated file which Excel opens natively
    const rows: string[] = ['Team\tPlayer\tRole\tCategory\tSold Price\tBase Price'];
    report.teamReports?.forEach((tr: any) => {
      tr.squad?.forEach((p: any) => {
        rows.push(`${tr.team.name}\t${p.name}\t${p.role}\t${p.category}\t${p.soldPrice||0}\t${p.basePrice||0}`);
      });
    });
    const blob = new Blob([rows.join('\n')], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${selAuction?.name}-report.xls`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Excel downloaded!');
  };

  // ── Generic exporters used by every report type below ──────────────────
  const toCsvValue = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const exportRowsCSV = (filename: string, columns: { key: string; label: string }[], rows: any[]) => {
    if (!rows?.length) { toast.error('No data to export for this report yet'); return; }
    const lines = [columns.map(c => toCsvValue(c.label)).join(',')];
    rows.forEach(r => lines.push(columns.map(c => toCsvValue(r[c.key])).join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${selAuction?.name}-${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded!');
  };

  const exportRowsExcel = (filename: string, columns: { key: string; label: string }[], rows: any[]) => {
    if (!isPro) { toast.error('Excel export requires Pro plan or higher'); return; }
    if (!rows?.length) { toast.error('No data to export for this report yet'); return; }
    const lines = [columns.map(c => c.label).join('\t')];
    rows.forEach(r => lines.push(columns.map(c => String(r[c.key] ?? '')).join('\t')));
    const blob = new Blob([lines.join('\n')], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${selAuction?.name}-${filename}.xls`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Excel downloaded!');
  };

  // Print View — opens a styled, branded HTML doc and triggers the browser
  // print dialog. "Save as PDF" in that dialog produces a real PDF, so this
  // covers both the "PDF" and "Print View" requirements with one function.
  const printReport = (title: string, columns: { key: string; label: string }[], rows: any[], summaryLine?: string) => {
    if (!rows?.length) { toast.error('No data to export for this report yet'); return; }
    const win = window.open('', '_blank');
    if (!win) { toast.error('Please allow popups to print this report'); return; }
    const esc = (v: any) => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;');
    let html = `<!DOCTYPE html><html><head><title>${esc(selAuction?.name)} — ${esc(title)}</title><style>
      body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:linear-gradient(135deg,#070b14 0%,#0c1a2e 40%,#13243d 100%);color:#fff;margin:0;padding:28px;}
      .header{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #f5b942;padding-bottom:14px;margin-bottom:20px;}
      .header h1{margin:0;font-size:22px;color:#f5b942;font-weight:700;letter-spacing:0.05em;}
      .header .sub{color:#ffffff99;font-size:12px;margin-top:2px;}
      table{width:100%;border-collapse:collapse;font-size:12px;}
      th{background:linear-gradient(135deg,#ffffff10,#ffffff03);color:#f5b942;text-align:left;padding:10px 12px;text-transform:uppercase;font-size:10px;letter-spacing:0.04em;border:1px solid #f5b94233;}
      td{padding:10px 12px;border-bottom:1px solid #ffffff10;color:#fff;}
      tr:nth-child(even){background:rgba(255,255,255,0.03);}
      tr:hover{background:rgba(245,185,66,0.08);}
      .summary{margin-top:18px;padding:12px 16px;background:rgba(245,185,66,0.1);border:1px solid #f5b94244;border-radius:8px;font-size:12px;color:#fff;}
      .footer{margin-top:24px;text-align:center;color:#ffffff66;font-size:10px;letter-spacing:1px;}
      @media print { body{padding:10px;} }
    </style></head><body>
      <div class="header"><div><h1>${esc(selAuction?.name)}</h1><div class="sub">${esc(title)} — Beast Cricket Auction Platform</div></div><div class="sub">${new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div></div>
      <table><thead><tr>${columns.map(c=>`<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>
      ${rows.map(r=>`<tr>${columns.map(c=>`<td>${esc(r[c.key])}</td>`).join('')}</tr>`).join('')}
      </tbody></table>
      ${summaryLine ? `<div class="summary">${esc(summaryLine)}</div>` : ''}
      <div class="footer">Generated by Beast Cricket Auction Platform</div>
    </body></html>`;
    win.document.write(html); win.document.close(); win.focus();
    setTimeout(() => win.print(), 400);
  };

  // ── Report catalog — every report type, built from real auction data ──
  const reportCatalog = report ? [
    {
      key: 'auction-summary', title: 'Complete Auction Summary',
      columns: [{key:'metric',label:'Metric'},{key:'value',label:'Value'}],
      rows: [
        { metric: 'Auction Name', value: selAuction?.name },
        { metric: 'Status', value: report.auction?.status },
        { metric: 'Total Players', value: report.summary?.totalPlayers },
        { metric: 'Players Sold', value: report.summary?.soldCount },
        { metric: 'Players Unsold', value: report.summary?.unsoldCount },
        { metric: 'Teams', value: report.summary?.teamCount },
        { metric: 'Total Revenue', value: fmt(report.summary?.totalRevenue || 0) },
        { metric: 'Highest Sale', value: fmt(report.summary?.highestSale || 0) },
      ],
    },
    {
      key: 'sold-players', title: 'Players Sold',
      columns: [{key:'name',label:'Player'},{key:'role',label:'Role'},{key:'category',label:'Category'},{key:'teamName',label:'Team'},{key:'basePrice',label:'Base Price'},{key:'soldPrice',label:'Sold Price'}],
      rows: (report.soldPlayers || []).map((p:any)=>({...p, basePrice: fmt(p.basePrice||0), soldPrice: fmt(p.soldPrice||0)})),
    },
    {
      key: 'unsold-players', title: 'Players Unsold',
      columns: [{key:'name',label:'Player'},{key:'role',label:'Role'},{key:'category',label:'Category'},{key:'basePrice',label:'Base Price'}],
      rows: (report.unsoldPlayers || []).map((p:any)=>({...p, basePrice: fmt(p.basePrice||0)})),
    },
    {
      key: 'team-purchases', title: 'Team-wise Purchases',
      columns: [{key:'team',label:'Team'},{key:'player',label:'Player'},{key:'role',label:'Role'},{key:'category',label:'Category'},{key:'soldPrice',label:'Sold Price'}],
      rows: (report.teamReports || []).flatMap((tr:any) => (tr.squad||[]).map((p:any) => ({ team: tr.team.name, player: p.name, role: p.role, category: p.category, soldPrice: fmt(p.soldPrice||0) }))),
    },
    {
      key: 'team-spending', title: 'Team Spending & Remaining Purse',
      columns: [{key:'team',label:'Team'},{key:'squadSize',label:'Players Bought'},{key:'totalSpent',label:'Total Spent'},{key:'remainingPurse',label:'Remaining Purse'}],
      rows: (report.teamReports || []).map((tr:any) => ({ team: tr.team.name, squadSize: tr.squadSize, totalSpent: fmt(tr.totalSpent||0), remainingPurse: fmt(tr.remainingPurse||0) })),
    },
    {
      key: 'bid-history', title: 'Bid History',
      columns: [{key:'playerName',label:'Player'},{key:'teamName',label:'Team'},{key:'bidAmount',label:'Bid Amount'},{key:'timestamp',label:'Time'}],
      rows: (report.bidHistory || []).map((b:any) => ({ ...b, bidAmount: fmt(b.bidAmount||0), timestamp: new Date(b.timestamp).toLocaleTimeString('en-IN') })),
    },
    {
      key: 'category-stats', title: 'Category Statistics',
      columns: [{key:'category',label:'Category'},{key:'count',label:'Players Sold'},{key:'totalSpent',label:'Total Spent'},{key:'avgPrice',label:'Avg Price'},{key:'highest',label:'Highest Sale'}],
      rows: (report.categoryStats || []).map((c:any) => ({ ...c, totalSpent: fmt(c.totalSpent||0), avgPrice: fmt(c.avgPrice||0), highest: fmt(c.highest||0) })),
    },
    {
      key: 'auction-timeline', title: 'Auction Timeline',
      columns: [{key:'playerName',label:'Player'},{key:'role',label:'Role'},{key:'status',label:'Result'},{key:'teamName',label:'Team'},{key:'soldPrice',label:'Price'},{key:'at',label:'Time'}],
      rows: (report.timeline || []).map((t:any) => ({ ...t, teamName: t.teamName || '—', soldPrice: t.soldPrice ? fmt(t.soldPrice) : '—', at: new Date(t.at).toLocaleTimeString('en-IN') })),
    },
    {
      key: 'revenue-report', title: 'Revenue Report',
      columns: [{key:'metric',label:'Metric'},{key:'value',label:'Value'}],
      rows: [
        { metric: 'Total Auction Value (sold)', value: fmt(report.revenue?.totalAuctionValue || 0) },
        { metric: 'Total Base Price Value (all players)', value: fmt(report.revenue?.totalBasePriceValue || 0) },
        { metric: 'Active Sponsors', value: report.revenue?.sponsorCount || 0 },
      ],
    },
    {
      key: 'sponsor-report', title: 'Sponsor Report',
      columns: [{key:'name',label:'Sponsor'},{key:'websiteUrl',label:'Website'}],
      rows: report.revenue?.sponsors || [],
    },
    {
      key: 'player-stats', title: 'Player Statistics',
      columns: [{key:'name',label:'Player'},{key:'role',label:'Role'},{key:'category',label:'Category'},{key:'basePrice',label:'Base Price'},{key:'soldPrice',label:'Sold Price'},{key:'teamName',label:'Team'}],
      rows: [...(report.soldPlayers||[]), ...(report.unsoldPlayers||[])].map((p:any)=>({...p, basePrice: fmt(p.basePrice||0), soldPrice: p.soldPrice ? fmt(p.soldPrice) : '—', teamName: p.teamName || '—'})),
    },
    {
      key: 'team-summary', title: 'Team Summary',
      columns: [{key:'team',label:'Team'},{key:'owner',label:'Owner'},{key:'squadSize',label:'Squad Size'},{key:'roleBreakdown',label:'Role Breakdown'}],
      rows: (report.teamReports || []).map((tr:any) => ({ team: tr.team.name, owner: tr.team.ownerName || '—', squadSize: tr.squadSize, roleBreakdown: Object.entries(tr.roleBreakdown||{}).map(([r,n])=>`${r}:${n}`).join(', ') })),
    },
    {
      key: 'organizer-summary', title: 'Organizer Summary',
      columns: [{key:'metric',label:'Metric'},{key:'value',label:'Value'}],
      rows: [
        { metric: 'Organizer', value: user?.name },
        { metric: 'Auction', value: selAuction?.name },
        { metric: 'Plan', value: (orgPkg?.packageType || 'starter').toUpperCase() },
        { metric: 'Total Teams', value: report.summary?.teamCount },
        { metric: 'Total Revenue Collected', value: fmt(report.summary?.totalRevenue || 0) },
      ],
    },
  ] : [];

  const generatePDF = async () => {
    if (!report) return;
    const ADMIN_EMAILS = ['hirishidraj07@gmail.com', 'hirishi2020@gmail.com'];
    const isAdmin = user?.role === 'admin' || (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
    if (!isAdmin && !['pro','elite'].includes(orgPkg?.packageType)) {
      toast.error('PDF Export requires Pro or Elite plan'); return;
    }
    if (!report.teamReports?.length) { toast.error('No squads to export yet'); return; }
    setPdfGenerating(true);
    const toastId = toast.loading('Building squad report…');
    try {
      let sponsors: any[] = [];
      try { sponsors = (await api.get(`/packages/sponsors/${selAuction._id}`)).data.sponsors || []; } catch {}
      
      // For team owners, only include their own team
      let teamReportsToExport = report.teamReports;
      if (user?.role === 'team_owner') {
        teamReportsToExport = report.teamReports.filter((tr: any) => 
          tr.team.ownerId === user.id || String(tr.team.ownerId) === String(user.id)
        );
        if (teamReportsToExport.length === 0) {
          toast.error('You do not own a team in this auction'); setPdfGenerating(false); return;
        }
      }
      
      await generateSquadBookPdf({
        auctionName: selAuction?.name || 'Beast Cricket League',
        teamReports: teamReportsToExport,
        sponsors,
        imgUrl,
        onProgress: (msg) => toast.loading(msg, { id: toastId }),
      });
      toast.success('Squad PDF downloaded!', { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error('PDF generation failed — please try again', { id: toastId });
    } finally { setPdfGenerating(false); }
  };

  // ELITE ACCESS: All organizers have full Elite access for production auction
  const isPro  = true;
  const isElite = true;
  const LBL = 'block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5';

  return (
    <div className="min-h-screen bg-background relative">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "url('/bg-organizer.png')", backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.15 }} />
        <div className="relative p-6 max-w-7xl mx-auto">
          <div className="mb-4"><BackButton href="/dashboard/organizer" label="Organizer Dashboard" /></div>

          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground">Auction <span className="text-gradient-gold">Reports</span></h1>
              <p className="text-muted-foreground font-display text-sm mt-1">Full analytics, exports and squad books</p>
            </div>
            {selAuction && (
              <div className="flex gap-3 flex-wrap">
                <button onClick={exportCSV} className="px-4 py-2 rounded-lg border border-border text-muted-foreground font-heading uppercase tracking-wider text-xs hover:bg-secondary/40 transition-all"> CSV</button>
                <button onClick={exportExcel} disabled={!isPro} className={`px-4 py-2 rounded-lg font-heading uppercase tracking-wider text-xs transition-all ${isPro ? 'border border-green-500/40 text-green-400 hover:bg-green-500/10' : 'border border-border text-muted-foreground opacity-50 cursor-not-allowed'}`} title={!isPro ? 'Requires Pro plan' : ''}>Excel{!isPro && <Lock size={10} className="inline ml-1" />}</button>
                <button onClick={generatePDF} disabled={!isPro || pdfGenerating} className={`px-4 py-2 rounded-lg font-heading uppercase tracking-wider text-xs transition-all ${isPro ? 'bg-primary text-primary-foreground glow-gold hover:scale-[1.02]' : 'border border-border text-muted-foreground opacity-50 cursor-not-allowed'} disabled:opacity-60 disabled:cursor-wait`} title={!isPro ? 'Requires Pro plan' : ''}>{pdfGenerating ? <><Loader2 size={13} className="inline mr-1.5 animate-spin" />Generating…</> : <>Squad PDF{!isPro && <Lock size={11} className="inline ml-1" />}</>}</button>
                {isElite && (
                  <button onClick={fetchAiSummary} disabled={aiLoading} className="px-4 py-2 rounded-lg bg-purple-600 text-white font-heading uppercase tracking-wider text-xs hover:bg-purple-700 transition-all disabled:opacity-50">
                    {aiLoading ? <><Loader2 size={12} className="inline mr-1 animate-spin" />Analyzing…</> : <><Bot size={12} className="inline mr-1" />AI Summary</>}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Auction Selector */}
          <div className="mb-6">
            <label className={LBL}>Select Auction</label>
            <select value={selAuction?._id || ''} onChange={e => setSelAuction(auctions.find(a => a._id === e.target.value))}
              className="input-beast max-w-sm" style={{ background: 'hsl(0 0% 8%)' }}>
              <option value="">-- Select Auction --</option>
              {auctions.map(a => <option key={a._id} value={a._id} style={{ background: 'hsl(0 0% 8%)' }}>{a.name}</option>)}
            </select>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-24">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          )}

          {report && !loading && (
            <>
              {/* Tabs */}
              <div className="flex gap-1 mb-6 border-b border-border/30">
                {(['overview','teams','players','reports','ai'] as const).map(t => (
                  <button key={t} onClick={() => setActiveTab(t)}
                    className={`px-5 py-2.5 font-heading uppercase tracking-wider text-xs border-b-2 transition-all ${activeTab===t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                    {t==='overview'?<><BarChart3 size={12} className="inline mr-1" />Overview</>:t==='teams'?<><Trophy size={12} className="inline mr-1" />Teams</>:t==='players'?<><UserRound size={12} className="inline mr-1" />Players</>:t==='reports'?<><FolderOpen size={12} className="inline mr-1" />All Reports</>:<><Bot size={12} className="inline mr-1" />AI Analysis</>}
                    {t==='ai' && !isElite && <Lock size={10} className="inline ml-1" />}
                  </button>
                ))}
              </div>

              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    {[
                      { label: 'Total Players', value: report.summary?.totalPlayers, Icon: UserRound },
                      { label: 'Sold', value: report.summary?.soldCount, Icon: ChkC, color: 'text-green-400' },
                      { label: 'Unsold', value: report.summary?.unsoldCount, Icon: XC, color: 'text-red-400' },
                      { label: 'Teams', value: report.summary?.teamCount, Icon: Trophy },
                      { label: 'Total Revenue', value: fmt(report.summary?.totalRevenue), Icon: IR, color: 'text-gradient-gold' },
                      { label: 'Highest Sale', value: fmt(report.summary?.highestSale), Icon: Trophy, color: 'text-primary' },
                    ].map(stat => (
                      <div key={stat.label} className="bg-glass-premium rounded-xl p-4 border-gold-subtle text-center">
                        <div className="text-2xl mb-1"><stat.Icon size={18} className={stat.color || 'text-primary'} /></div>
                        <div className={`font-heading text-xl font-bold ${stat.color || 'text-foreground'}`}>{stat.value}</div>
                        <div className="text-[10px] font-heading uppercase tracking-wider text-muted-foreground mt-1">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Team Spending Chart */}
                  <div className="bg-glass-premium rounded-xl p-6 border-gold-subtle">
                    <h3 className="font-heading text-xl uppercase tracking-wider text-foreground mb-5 flex items-center gap-2"><IR size={18} />Team Spending Analysis</h3>
                    <div className="space-y-3">
                      {report.teamReports?.sort((a:any,b:any)=>b.totalSpent-a.totalSpent).map((tr:any) => {
                        const pct = tr.totalSpent / (tr.totalSpent + tr.remainingPurse) * 100;
                        return (
                          <div key={tr.team._id}>
                            <div className="flex justify-between text-xs font-display mb-1">
                              <span className="text-foreground font-semibold">{tr.team.name}</span>
                              <span className="text-muted-foreground">{fmt(tr.totalSpent)} / {fmt(tr.totalSpent + tr.remainingPurse)}</span>
                            </div>
                            <div className="w-full h-3 bg-secondary/30 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: tr.team.primaryColor || 'hsl(45,100%,51%)' }} />
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{tr.squadSize} players · {fmt(tr.remainingPurse)} remaining</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TEAMS TAB */}
              {activeTab === 'teams' && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {report.teamReports?.map((tr:any) => (
                    <div key={tr.team._id} className="bg-glass-premium rounded-xl overflow-hidden border-gold-subtle">
                      <div className="h-1" style={{ background: `linear-gradient(90deg,${tr.team.primaryColor||'#f59e0b'},${tr.team.primaryColor||'#f59e0b'}60)` }} />
                      <div className="p-5">
                        <div className="flex items-center gap-3 mb-4">
                          {tr.team.logo ? <img src={imgUrl(tr.team.logo)} alt="" className="w-12 h-12 rounded-xl object-cover" /> : <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm text-black" style={{ background: tr.team.primaryColor||'#f59e0b' }}>{tr.team.shortName||'?'}</div>}
                          <div>
                            <div className="font-heading text-lg uppercase tracking-wider text-foreground">{tr.team.name}</div>
                            <div className="text-xs text-muted-foreground">{tr.team.ownerName||'—'}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center mb-4">
                          <div className="bg-secondary/20 rounded-lg p-2"><div className="text-primary font-bold text-sm">{tr.squadSize}</div><div className="text-[9px] text-muted-foreground uppercase">Players</div></div>
                          <div className="bg-secondary/20 rounded-lg p-2"><div className="text-green-400 font-bold text-sm">{fmt(tr.totalSpent)}</div><div className="text-[9px] text-muted-foreground uppercase">Spent</div></div>
                          <div className="bg-secondary/20 rounded-lg p-2"><div className="text-yellow-400 font-bold text-sm">{fmt(tr.remainingPurse)}</div><div className="text-[9px] text-muted-foreground uppercase">Left</div></div>
                        </div>
                        <div className="space-y-1">
                          {Object.entries(tr.roleBreakdown||{}).map(([role, count]:any) => (
                            <div key={role} className="flex justify-between text-xs font-display">
                              <span className={`px-2 py-0.5 rounded border text-[9px] font-heading uppercase ${roleColors[role]||''}`}>{role}</span>
                              <span className="text-muted-foreground">{count} player{count>1?'s':''}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* PLAYERS TAB */}
              {activeTab === 'players' && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="bg-glass-premium rounded-xl overflow-hidden border-gold-subtle">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: 'hsl(0 0% 5%)' }}>
                          {['Player','Team','Role','Category','Base Price','Sold Price'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-[10px] font-heading uppercase tracking-wider text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {report.teamReports?.flatMap((tr:any) => tr.squad?.map((p:any) => (
                          <tr key={p._id} className="border-t border-border/20 hover:bg-secondary/20 transition-all">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {p.imageUrl ? <img src={imgUrl(p.imageUrl)} alt="" className="w-7 h-7 rounded-full object-cover object-top" /> : <div className="w-7 h-7 rounded-full bg-secondary/40 flex items-center justify-center text-xs"></div>}
                                <span className="font-display font-semibold text-foreground">{p.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{tr.team.name}</td>
                            <td className="px-4 py-3"><span className={`text-[9px] px-2 py-0.5 rounded border font-heading uppercase ${roleColors[p.role]||''}`}>{p.role}</span></td>
                            <td className="px-4 py-3"><span className={`text-[9px] px-2 py-0.5 rounded border font-heading uppercase ${categoryColors[p.category]||''}`}>{p.category}</span></td>
                            <td className="px-4 py-3 text-muted-foreground">{fmt(p.basePrice)}</td>
                            <td className="px-4 py-3 font-bold text-gradient-gold">{fmt(p.soldPrice)}</td>
                          </tr>
                        )))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* ALL REPORTS TAB — full catalog, every report type */}
              {activeTab === 'reports' && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="text-muted-foreground font-display text-sm mb-5">Every report below uses live data from this auction. Export as CSV, Excel, or open Print View and choose "Save as PDF" in the print dialog.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reportCatalog.map(rc => (
                      <div key={rc.key} className="bg-glass-premium rounded-xl p-5 border-gold-subtle flex flex-col">
                        <div className="font-heading text-sm uppercase tracking-wider text-foreground mb-1">{rc.title}</div>
                        <div className="text-muted-foreground text-xs font-display mb-4">{rc.rows.length} row{rc.rows.length===1?'':'s'}</div>
                        <div className="grid grid-cols-3 gap-2 mt-auto">
                          <button onClick={() => exportRowsCSV(rc.key, rc.columns, rc.rows)}
                            className="py-2 rounded-lg text-[10px] font-heading uppercase tracking-wider border border-border text-muted-foreground hover:bg-secondary/40 transition-all">CSV</button>
                          <button onClick={() => exportRowsExcel(rc.key, rc.columns, rc.rows)} disabled={!isPro}
                            className={`py-2 rounded-lg text-[10px] font-heading uppercase tracking-wider transition-all ${isPro ? 'border border-green-500/40 text-green-400 hover:bg-green-500/10' : 'border border-border text-muted-foreground opacity-50 cursor-not-allowed'}`}
                            title={!isPro ? 'Requires Pro plan' : ''}>Excel{!isPro && <Lock size={10} className="inline ml-1" />}</button>
                          <button onClick={() => printReport(rc.title, rc.columns, rc.rows)}
                            className="py-2 rounded-lg text-[10px] font-heading uppercase tracking-wider bg-primary text-primary-foreground hover:scale-[1.03] transition-all">Print / PDF</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* AI TAB */}
              {activeTab === 'ai' && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  {!isElite ? (
                    <div className="text-center py-24 bg-glass-navy rounded-xl border-gold-subtle">
                      <div className="flex justify-center mb-4"><Bot size={56} className="text-purple-400" /></div>
                      <h3 className="font-heading text-2xl uppercase tracking-wider text-foreground mb-3">AI Analysis — Elite Only</h3>
                      <p className="text-muted-foreground font-display mb-6">Upgrade to Elite to unlock AI-powered auction intelligence</p>
                      <Link href="/dashboard/organizer" className="px-8 py-3 rounded-lg bg-purple-600 text-white font-heading uppercase tracking-wider text-sm hover:bg-purple-700 transition-all">Upgrade to Elite →</Link>
                    </div>
                  ) : aiSummary ? (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-glass-premium rounded-xl p-6 border border-purple-500/30">
                        <h3 className="font-heading text-lg uppercase tracking-wider text-purple-400 mb-4 flex items-center gap-2"><Bot size={16} />AI Auction Summary</h3>
                        <div className="space-y-3">
                          {[
                            { label: 'Total Players', value: aiSummary.totalPlayers },
                            { label: 'Sold', value: aiSummary.soldCount, color: 'text-green-400' },
                            { label: 'Unsold', value: `${aiSummary.unsoldCount} (${aiSummary.unsoldPercent}%)`, color: 'text-red-400' },
                            { label: 'Total Spent', value: fmt(aiSummary.totalSpent), color: 'text-gradient-gold' },
                            { label: 'Highest Bid', value: fmt(aiSummary.highestBid), color: 'text-primary' },
                            { label: 'Average Bid', value: fmt(aiSummary.avgBid) },
                          ].map(s => (
                            <div key={s.label} className="flex justify-between text-sm font-display py-1.5 border-b border-border/20">
                              <span className="text-muted-foreground">{s.label}</span>
                              <span className={`font-bold ${s.color||'text-foreground'}`}>{s.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        {aiSummary.topBargains?.length > 0 && (
                          <div className="bg-glass-premium rounded-xl p-5 border border-green-500/30">
                            <h4 className="font-heading text-sm uppercase tracking-wider text-green-400 mb-3 flex items-center gap-1"><Target size={13} />Top Bargains</h4>
                            {aiSummary.topBargains.map((b:any) => (
                              <div key={b.name} className="flex justify-between text-xs font-display py-1.5 border-b border-border/20">
                                <span className="text-foreground">{b.name}</span>
                                <span className="text-green-400">Saved {fmt(b.saving)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {aiSummary.topOverpays?.length > 0 && (
                          <div className="bg-glass-premium rounded-xl p-5 border border-red-500/30">
                            <h4 className="font-heading text-sm uppercase tracking-wider text-red-400 mb-3 flex items-center gap-1"><TriangleAlert size={13} />Overpayments</h4>
                            {aiSummary.topOverpays.map((b:any) => (
                              <div key={b.name} className="flex justify-between text-xs font-display py-1.5 border-b border-border/20">
                                <span className="text-foreground">{b.name}</span>
                                <span className="text-red-400">+{fmt(b.extra)} over base</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-24 bg-glass-navy rounded-xl border border-purple-500/30">
                      <div className="flex justify-center mb-4"><Bot size={56} className="text-purple-400" /></div>
                      <h3 className="font-heading text-xl uppercase tracking-wider text-foreground mb-3">Ready to Analyze</h3>
                      <p className="text-muted-foreground font-display mb-6">Click AI Summary above to generate intelligent auction analysis</p>
                      <button onClick={fetchAiSummary} disabled={aiLoading} className="px-8 py-3 rounded-lg bg-purple-600 text-white font-heading uppercase tracking-wider text-sm hover:bg-purple-700 transition-all disabled:opacity-50">
                        {aiLoading ? <><Loader2 size={14} className="inline mr-1.5 animate-spin" />Analyzing…</> : <><Bot size={14} className="inline mr-1.5" />Generate AI Analysis</>}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </>
          )}

          {!selAuction && !loading && (
            <div className="text-center py-24 bg-glass-navy rounded-xl border-gold-subtle">
              <div className="flex justify-center mb-4"><BarChart3 size={48} className="text-primary" /></div>
              <h3 className="font-heading text-2xl uppercase tracking-wider text-foreground mb-2">Select an Auction</h3>
              <p className="text-muted-foreground font-display">Choose an auction above to view reports</p>
            </div>
          )}
        </div>
      </div>
  );
}
