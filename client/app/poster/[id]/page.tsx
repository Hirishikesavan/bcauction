'use client';
import {
  Lock, Palette, Loader2, Download, FileText, Smartphone, Lightbulb
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/shared/AuthGuard';
import api, { imgUrl } from '@/lib/api';
import { fmt } from '@/lib/utils';
import BackButton from '@/components/shared/BackButton';
import toast from 'react-hot-toast';

export default function PosterGenerator() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [auction, setAuction]     = useState<any>(null);
  const [teams, setTeams]         = useState<any[]>([]);
  const [players, setPlayers]     = useState<any[]>([]);
  const [selTeam, setSelTeam]     = useState<any>(null);
  const [orgPkg, setOrgPkg]       = useState<any>(null);
  const [posterType, setPosterType] = useState<'squad'|'champion'|'signing'>('squad');
  const [socialFormat, setSocialFormat] = useState<'poster'|'square'>('poster');
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview]     = useState<string>('');
  const [bgColor, setBgColor]     = useState('#0c1a2e');
  const [accentColor, setAccentColor] = useState('#f5b942');

  useEffect(() => {
    if (!id || !user) return;
    // For admin, bypass package check - they have full access
    // For team owners, fetch the organizer's plan for this auction
    // For organizers, fetch their own package
    const ADMIN_EMAILS = ['hirishidraj07@gmail.com', 'hirishi2020@gmail.com'];
    const isAdmin = user.role === 'admin' || (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
    if (isAdmin) {
      setOrgPkg({ packageType: 'elite' }); // Admin gets full Elite access
      Promise.all([
        api.get(`/auctions/${id}`),
        api.get(`/auctions/${id}/teams`),
        api.get(`/auctions/${id}/players`),
      ]).then(([a, t, p]) => {
        setAuction(a.data.auction);
        setTeams(t.data.teams || []);
        setPlayers(p.data.players || []);
        if ((t.data.teams || []).length > 0) setSelTeam((t.data.teams || [])[0]);
      }).catch(() => {});
    } else {
      Promise.all([
        api.get(`/auctions/${id}`),
        api.get(`/auctions/${id}/teams`),
        api.get(`/auctions/${id}/players`),
        api.get(`/auctions/${id}/plan`),
      ]).then(([a, t, p, pkg]) => {
        setAuction(a.data.auction);
        setTeams(t.data.teams || []);
        setPlayers(p.data.players || []);
        setOrgPkg(pkg.data);
        if ((t.data.teams || []).length > 0) setSelTeam((t.data.teams || [])[0]);
      }).catch(() => {});
    }
  }, [id, user]);

  const isElite = user?.role === 'admin' || orgPkg?.packageType === 'elite';

  const generatePoster = async () => {
    if (!selTeam) { toast.error('Select a team first'); return; }
    if (!isElite) { toast.error('Social Posters require Elite plan'); return; }
    setGenerating(true);

    try {
      // FIX: Improved filtering to handle both populated and non-populated teamId references
      // Also filter by status='sold' to only include players who were actually bought
      const squad = players.filter(p => {
        if (!p.teamId) return false;
        if (p.status !== 'sold') return false; // Only include sold players
        const teamIdStr = p.teamId._id ? p.teamId._id.toString() : p.teamId.toString();
        return teamIdStr === selTeam._id.toString();
      });
      const teamColor = selTeam.primaryColor || accentColor;
      const bg = bgColor;

      // Build HTML poster that opens in print window
      const win = window.open('', '_blank');
      if (!win) { toast.error('Popup blocked — allow popups'); return; }

      // Use consistent navy/gold theme matching squad PDF
      const NAVY_DARK = '#070b14';
      const NAVY = '#0c1a2e';
      const NAVY_LIGHT = '#13243d';
      const GOLD = '#f5b942';
      const GOLD_LIGHT = '#ffe3a3';

      let html = `<!DOCTYPE html>
<html><head><title>${selTeam.name} — ${posterType === 'squad' ? 'Squad Poster' : posterType === 'champion' ? 'Champion Poster' : 'Player Signing'}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Rajdhani:wght@400;600;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{background:${NAVY_DARK};min-height:100vh;font-family:'Oswald',sans-serif;color:white;padding:24px;}
  .poster{max-width:${socialFormat === 'square' ? '1080px' : '900px'};${socialFormat === 'square' ? 'aspect-ratio:1/1;display:flex;flex-direction:column;justify-content:center;' : ''}margin:0 auto;position:relative;
    background:radial-gradient(ellipse 900px 500px at 50% -5%, ${NAVY_LIGHT} 0%, ${NAVY} 45%, ${NAVY_DARK} 100%);border:3px solid ${GOLD};box-shadow:inset 0 0 0 14px ${NAVY_DARK}, inset 0 0 0 18px ${GOLD}55;}
  .header{text-align:center;padding:32px 24px 24px;background:linear-gradient(135deg,${NAVY} 0%,${teamColor}30 100%);border-radius:20px;border:2px solid ${GOLD}60;margin-bottom:20px;position:relative;overflow:hidden;}
  .header::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 0%,${GOLD}22 0%,transparent 70%);}
  .team-logo{width:90px;height:90px;border-radius:50%;object-fit:cover;border:4px solid ${GOLD};margin:0 auto 12px;box-shadow:0 0 24px ${GOLD}55;}
  .team-logo-placeholder{width:90px;height:90px;border-radius:50%;background:${teamColor};display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900;color:#000;margin:0 auto 12px;border:4px solid ${GOLD};}
  .team-name{font-size:42px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${GOLD_LIGHT};text-shadow:0 3px 0 ${GOLD}, 0 6px 14px rgba(0,0,0,0.5);}
  .auction-name{font-size:14px;color:${GOLD};letter-spacing:4px;text-transform:uppercase;margin-top:6px;}
  .badge{display:inline-block;padding:6px 20px;border-radius:30px;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;background:${GOLD};color:#000;margin-top:12px;}
  .players-grid{display:grid;grid-template-columns:repeat(${Math.min(squad.length, 4)},1fr);gap:12px;margin-bottom:20px;}
  .player-card{background:linear-gradient(160deg,#ffffff10,#ffffff03);border-radius:14px;overflow:hidden;border:1px solid ${GOLD}55;text-align:center;}
  .player-img{width:100%;height:150px;object-fit:contain;object-position:center;display:block;background:#0c1424;}
  .player-placeholder{width:100%;height:150px;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;font-size:48px;}
  .player-info{padding:10px 8px;}
  .player-name{font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff;}
  .player-role{font-size:10px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:2px;margin:3px 0;}
  .player-price{font-size:15px;font-weight:700;color:${GOLD};}
  .footer{text-align:center;padding:16px;border-radius:12px;background:rgba(0,0,0,0.3);border:1px solid ${GOLD}30;}
  .footer-stats{display:flex;justify-content:center;gap:40px;margin-bottom:8px;}
  .stat{text-align:center;}
  .stat-val{font-size:22px;font-weight:700;color:${GOLD};}
  .stat-lab{font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:2px;text-transform:uppercase;}
  .watermark{font-size:11px;color:${GOLD};letter-spacing:3px;text-transform:uppercase;margin-top:6px;}
  @media print{body{padding:0;}.poster{max-width:100%;}}
</style></head><body>
<div class="poster">`;

      if (posterType === 'squad') {
        html += `
  <div class="header">
    ${selTeam.logo ? `<img src="${imgUrl(selTeam.logo)}" class="team-logo" onerror="this.style.display='none'" />` : `<div class="team-logo-placeholder">${(selTeam.shortName || selTeam.name).slice(0,2).toUpperCase()}</div>`}
    <div class="team-name">${selTeam.name}</div>
    <div class="auction-name">${auction?.name || 'Beast Cricket Auction'}</div>
    <div class="badge">Official Squad</div>
  </div>
  <div class="players-grid">`;
        squad.forEach(p => {
          html += `<div class="player-card">
      <div style="position:relative;width:100%;height:150px;background:#0006;">
        ${p.imageUrl ? `<img src="${imgUrl(p.imageUrl)}" class="player-img" crossorigin="anonymous" onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'player-placeholder\\'></div>'" />` : `<div class="player-placeholder"></div>`}
        <div style="position:absolute;left:0;right:0;bottom:0;height:55%;background:linear-gradient(180deg,transparent,#000000cc);"></div>
        <div style="position:absolute;top:8px;left:8px;background:${teamColor};color:#000;font-size:11px;font-weight:bold;padding:3px 8px;border-radius:6px;letter-spacing:0.5px;">${(p.role || '').toUpperCase()}</div>
      </div>
      <div class="player-info">
        <div class="player-name">${p.name}</div>
        <div class="player-role">${p.role}</div>
        <div class="player-price">${p.soldPrice ? fmt(p.soldPrice) : 'Base: ' + fmt(p.basePrice)}</div>
      </div>
    </div>`;
        });
        html += `</div>`;
      } else if (posterType === 'champion') {
        html += `
  <div class="header" style="padding:48px 24px;">
    ${selTeam.logo ? `<img src="${imgUrl(selTeam.logo)}" class="team-logo" style="width:110px;height:110px;" crossorigin="anonymous" onerror="this.style.display='none'" />` : `<div class="team-logo-placeholder" style="width:110px;height:110px;">${(selTeam.shortName || selTeam.name).slice(0,2).toUpperCase()}</div>`}
    <div class="team-name" style="font-size:52px;">${selTeam.name}</div>
    <div style="font-size:28px;color:${GOLD};letter-spacing:4px;text-transform:uppercase;margin-top:8px;font-weight:700;">CHAMPIONS CHAMPIONS</div>
    <div class="auction-name" style="margin-top:10px;">${auction?.name || 'Beast Cricket Auction'}</div>
    <div style="font-size:13px;color:${GOLD};letter-spacing:2px;margin-top:6px;">${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</div>
  </div>
  <div class="players-grid">`;
        squad.slice(0, 8).forEach(p => {
          html += `<div class="player-card">
      <div style="position:relative;width:100%;height:150px;background:#0006;">
        ${p.imageUrl ? `<img src="${imgUrl(p.imageUrl)}" class="player-img" crossorigin="anonymous" onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\\'player-placeholder\\'></div>'" />` : `<div class="player-placeholder"></div>`}
        <div style="position:absolute;left:0;right:0;bottom:0;height:55%;background:linear-gradient(180deg,transparent,#000000cc);"></div>
        <div style="position:absolute;top:8px;left:8px;background:${teamColor};color:#000;font-size:11px;font-weight:bold;padding:3px 8px;border-radius:6px;letter-spacing:0.5px;">${(p.role || '').toUpperCase()}</div>
      </div>
      <div class="player-info">
        <div class="player-name">${p.name}</div>
        <div class="player-role">${p.role}</div>
        <div class="player-price">${p.soldPrice ? fmt(p.soldPrice) : ''}</div>
      </div>
    </div>`;
        });
        html += `</div>`;
      } else {
        // signing poster — one player highlighted
        const highlight = squad[0];
        html += `
  <div class="header" style="padding:48px;display:flex;align-items:center;gap:40px;text-align:left;">
    <div style="position:relative;">
      ${highlight?.imageUrl ? `<img src="${imgUrl(highlight.imageUrl)}" crossorigin="anonymous" style="width:200px;height:240px;border-radius:16px;object-fit:contain;object-position:center;background:#0c1424;border:3px solid ${GOLD};box-shadow:0 0 24px ${GOLD}55;" onerror="this.style.display='none'" />` : `<div style="width:200px;height:240px;border-radius:16px;background:${teamColor};display:flex;align-items:center;justify-content:center;font-size:64px;border:3px solid ${GOLD};"></div>`}
    </div>
    <div style="flex:1;">
      <div style="font-size:13px;letter-spacing:4px;text-transform:uppercase;color:${GOLD};margin-bottom:10px;">New Signing</div>
      <div style="font-size:48px;font-weight:700;letter-spacing:2px;text-transform:uppercase;line-height:1;color:${GOLD_LIGHT};text-shadow:0 3px 0 ${GOLD}, 0 6px 14px rgba(0,0,0,0.5);">${highlight?.name || 'Player'}</div>
      <div style="font-size:18px;color:${GOLD};letter-spacing:2px;text-transform:uppercase;margin:10px 0;">${highlight?.role || ''} · ${highlight?.category || ''}</div>
      <div style="font-size:36px;font-weight:700;color:${GOLD};">${highlight?.soldPrice ? fmt(highlight.soldPrice) : ''}</div>
      <div style="margin-top:20px;display:flex;align-items:center;gap:14px;">
        ${selTeam.logo ? `<img src="${imgUrl(selTeam.logo)}" crossorigin="anonymous" style="width:50px;height:50px;border-radius:50%;object-fit:cover;border:2px solid ${GOLD};box-shadow:0 0 24px ${GOLD}55;" onerror="this.style.display='none'" />` : ''}
        <div style="font-size:24px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${GOLD};">${selTeam.name}</div>
      </div>
    </div>
  </div>`;
      }

      const totalSpent = squad.reduce((s, p) => s + (p.soldPrice || 0), 0);
      html += `
  <div class="footer">
    <div class="footer-stats">
      <div class="stat"><div class="stat-val">${squad.length}</div><div class="stat-lab">Players</div></div>
      <div class="stat"><div class="stat-val">${fmt(totalSpent)}</div><div class="stat-lab">Total Spent</div></div>
      <div class="stat"><div class="stat-val">${fmt(selTeam.purse)}</div><div class="stat-lab">Remaining Purse</div></div>
    </div>
    <div class="watermark">Beast Cricket Auction Platform · ${auction?.name || ''}</div>
  </div>
</div>
<script>window.onload = function(){ setTimeout(()=>window.print(), 600); }</script>
</body></html>`;

      win.document.write(html);
      win.document.close();
      toast.success('Poster opened — use Print → Save as PDF or share!');
    } finally {
      setGenerating(false);
    }
  };

  const LBL = 'block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5';
  const INP = 'w-full px-4 py-2.5 rounded-xl bg-secondary/20 border border-border/40 text-foreground text-sm focus:border-primary/60 focus:outline-none transition-all';

  return (
    <AuthGuard roles={['organizer','admin','team_owner']}>
      <div className="min-h-screen bg-background relative">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage:"url('/bg-organizer.png')", backgroundSize:'cover', opacity: 0.1 }} />
        <div className="relative p-6 max-w-5xl mx-auto">
          <div className="mb-4"><BackButton href="/dashboard/organizer" label="Back" /></div>

          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground">Team <span className="text-gradient-gold">Poster</span> Generator</h1>
              <p className="text-muted-foreground font-display text-sm mt-1">{auction?.name} · Social-media ready posters</p>
            </div>
            {!isElite && (
              <div className="px-4 py-2 rounded-xl border border-purple-500/30 bg-purple-500/10">
                <span className="text-purple-400 text-sm font-heading uppercase tracking-wider flex items-center gap-1"><Lock size={13} />Elite Only Feature</span>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Controls */}
            <div className="md:col-span-1 space-y-5">
              <div className="bg-glass-premium rounded-xl p-5 border-gold-subtle">
                <h3 className="font-heading text-sm uppercase tracking-wider text-foreground mb-4">Poster Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className={LBL}>Select Team</label>
                    <select value={selTeam?._id || ''} onChange={e => setSelTeam(teams.find(t => t._id === e.target.value))}
                      className={INP} style={{ background: 'hsl(0 0% 8%)' }}>
                      <option value="">-- Select Team --</option>
                      {teams.map(t => <option key={t._id} value={t._id} style={{ background: 'hsl(0 0% 8%)' }}>{t.name}</option>)}}
                    </select>
                  </div>
                  <div>
                    <label className={LBL}>Poster Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([['squad','Squad'],['champion','Champs'],['signing','Signing']] as const).map(([v,l]) => (
                        <button key={v} onClick={() => setPosterType(v)}
                          className={`py-2 rounded-lg text-xs font-heading uppercase tracking-wider transition-all ${posterType === v ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-secondary/40'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={LBL}>Output Format</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setSocialFormat('poster')}
                        className={`py-2 rounded-lg text-xs font-heading uppercase tracking-wider transition-all ${socialFormat === 'poster' ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-secondary/40'}`}>
                        <FileText size={12} className="inline mr-1" />Poster
                      </button>
                      <button onClick={() => setSocialFormat('square')}
                        className={`py-2 rounded-lg text-xs font-heading uppercase tracking-wider transition-all ${socialFormat === 'square' ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-secondary/40'}`}>
                        <Smartphone size={12} className="inline mr-1" />Social Kit (1:1)
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LBL}>Background</label>
                      <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-full h-10 rounded-lg cursor-pointer p-1 border border-border bg-transparent" />
                    </div>
                    <div>
                      <label className={LBL}>Accent</label>
                      <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-full h-10 rounded-lg cursor-pointer p-1 border border-border bg-transparent" />
                    </div>
                  </div>
                  <button onClick={generatePoster} disabled={generating || !selTeam || !isElite}
                    className={`w-full py-3.5 rounded-xl font-heading uppercase tracking-widest text-sm transition-all ${isElite ? 'bg-primary text-primary-foreground glow-gold hover:scale-[1.02] active:scale-[0.98]' : 'bg-secondary/20 text-muted-foreground cursor-not-allowed'} disabled:opacity-50`}>
                    {generating ? <><Loader2 size={14} className="inline mr-1.5 animate-spin" />Generating…</> : <><Palette size={14} className="inline mr-1.5" />Generate Poster</>}
                  </button>
                  {!isElite && (
                    <p className="text-center text-xs text-purple-400 font-display">Requires Elite plan</p>
                  )}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-glass-navy rounded-xl p-4 border-gold-subtle">
                <div className="font-heading text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1"><Lightbulb size={11} />Tips</div>
                <ul className="space-y-1.5 text-xs font-display text-muted-foreground">
                  <li>• Squad Poster — all players in grid</li>
                  <li>• Champion Poster — top 8 players, big logo</li>
                  <li>• Signing Poster — spotlight one player</li>
                  <li>• Print → Save as PDF for social media</li>
                  <li>• Use 1080×1080 crop for Instagram</li>
                </ul>
              </div>
            </div>

            {/* Team Preview */}
            <div className="md:col-span-2">
              <div className="bg-glass-premium rounded-xl p-5 border-gold-subtle">
                <h3 className="font-heading text-sm uppercase tracking-wider text-foreground mb-4">
                  {selTeam ? `${selTeam.name} · ${players.filter(p => {
                    if (!p.teamId) return false;
                    if (p.status !== 'sold') return false; // Only show sold players
                    const teamIdStr = p.teamId._id ? p.teamId._id.toString() : p.teamId.toString();
                    return teamIdStr === selTeam._id.toString();
                  }).length} players` : 'Select a team to preview'}
                </h3>
                {selTeam ? (
                  <>
                    <div className="flex items-center gap-4 mb-5 p-4 rounded-xl" style={{ background: `${selTeam.primaryColor || '#f59e0b'}10`, border: `1px solid ${selTeam.primaryColor || '#f59e0b'}30` }}>
                      {selTeam.logo ? <img src={imgUrl(selTeam.logo)} alt="" className="w-14 h-14 rounded-xl object-cover" /> : <div className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-lg" style={{ background: selTeam.primaryColor || '#f59e0b', color: '#000' }}>{(selTeam.shortName || selTeam.name).slice(0, 2)}</div>}
                      <div>
                        <div className="font-heading text-xl uppercase tracking-wider text-foreground">{selTeam.name}</div>
                        <div className="text-sm text-muted-foreground font-display">{selTeam.ownerName} · {fmt(selTeam.initialPurse - selTeam.purse)} spent</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {players.filter(p => {
                        if (!p.teamId) return false;
                        if (p.status !== 'sold') return false; // Only show sold players
                        const teamIdStr = p.teamId._id ? p.teamId._id.toString() : p.teamId.toString();
                        return teamIdStr === selTeam._id.toString();
                      }).map((p: any) => (
                        <div key={p._id} className="rounded-xl overflow-hidden border-gold-subtle text-center">
                          {p.imageUrl ? <img src={imgUrl(p.imageUrl)} alt={p.name} className="w-full h-20 object-contain object-center bg-[#0c1424]" /> : <div className="w-full h-20 flex items-center justify-center text-3xl bg-secondary/20"></div>}
                          <div className="p-2">
                            <div className="text-xs font-heading uppercase text-foreground truncate">{p.name}</div>
                            <div className="text-xs text-muted-foreground">{p.role}</div>
                            <div className="text-xs font-bold text-primary">{fmt(p.soldPrice || p.basePrice)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-20">
                    <div className="flex justify-center mb-3"><Palette size={48} className="text-muted-foreground/40" /></div>
                    <div className="text-muted-foreground font-display">Select a team to preview squad</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
