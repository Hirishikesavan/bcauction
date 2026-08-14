'use client';
import {
  Palette, Trophy, Gavel, PenLine, Loader2, CheckCircle, Download, FileText,
  MessageSquare
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import api, { imgUrl } from '@/lib/api';
import { fmt } from '@/lib/utils';
import toast from 'react-hot-toast';
import BackButton from '@/components/shared/BackButton';

export default function PosterGeneratorPage() {
  const { user }      = useAuth();
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const [auctions, setAuctions]   = useState<any[]>([]);
  const [selAuction, setSelAuction] = useState<any>(null);
  const [teams, setTeams]         = useState<any[]>([]);
  const [selTeam, setSelTeam]     = useState<any>(null);
  const [players, setPlayers]     = useState<any[]>([]);
  const [orgPkg, setOrgPkg]       = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [posterReady, setPosterReady] = useState(false);
  const [posterType, setPosterType] = useState<'squad'|'champion'|'signing'>('squad');
  const [signingPlayerId, setSigningPlayerId] = useState<string>('');
  const [bgColor, setBgColor]     = useState('#1e3a5f');
  const [accentColor, setAccentColor] = useState('#f59e0b');
  const [sponsors, setSponsors]   = useState<any[]>([]);

  useEffect(() => {
    if (!selAuction) { setSponsors([]); return; }
    api.get(`/packages/sponsors/${selAuction._id}`).then(r => setSponsors(r.data.sponsors || [])).catch(() => {});
  }, [selAuction?._id]);

  useEffect(() => {
    if (!user) return;
    // For admin, bypass package check - they have full access
    // For organizers, fetch their own package
    // For team owners, will fetch organizer's plan when auction is selected
    const ADMIN_EMAILS = ['hirishidraj07@gmail.com', 'hirishi2020@gmail.com'];
    const isAdmin = user.role === 'admin' || (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
    if (isAdmin) {
      setOrgPkg({ packageType: 'elite' }); // Admin gets full Elite access
    } else if (user.role === 'organizer') {
      api.get('/packages/my').then(r => setOrgPkg(r.data.package)).catch(() => {});
    }
    api.get('/auctions/my').then(r => setAuctions(r.data.auctions || [])).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!selAuction) return;
    api.get(`/auctions/${selAuction._id}/teams`).then(r => {
      setTeams(r.data.teams || []);
      setSelTeam(null); setPlayers([]);
    }).catch(() => {});
    // For team owners, fetch the organizer's plan for this auction
    // For admin, already set to elite in the user effect
    // For organizers, already set in the user effect
    if (user?.role === 'team_owner' && !orgPkg) {
      api.get(`/auctions/${selAuction._id}/plan`).then(r => setOrgPkg(r.data)).catch(() => {});
    }
  }, [selAuction?._id, user?.role, orgPkg]);

  useEffect(() => {
    if (!selAuction || !selTeam) return;
    api.get(`/auctions/${selAuction._id}/players`).then(r => {
      const all = r.data.players || [];
      setPlayers(all.filter((p: any) => p.teamId?._id === selTeam._id || p.teamId === selTeam._id));
    }).catch(() => {});
  }, [selTeam?._id]);

  const loadImg = (src: string): Promise<HTMLImageElement> =>
    new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => { const blank = new Image(1,1); resolve(blank); };
      img.src = src;
    });

  const generatePoster = async () => {
    if (!selTeam) { toast.error('Select a team first'); return; }
    setGenerating(true); setPosterReady(false);
    try {
      const canvas = canvasRef.current!;
      const ctx    = canvas.getContext('2d')!;
      canvas.width  = 1080;
      canvas.height = 1350; // 4:5 ratio — perfect for Instagram

      // ── Background: deep radial-lit gradient + vignette + light rays ──
      const grad = ctx.createLinearGradient(0, 0, 1080, 1350);
      grad.addColorStop(0, adjustColor(bgColor, 10));
      grad.addColorStop(0.45, bgColor);
      grad.addColorStop(1, '#05070d');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1350);

      // soft glow behind header
      const glow = ctx.createRadialGradient(540, 130, 20, 540, 130, 620);
      glow.addColorStop(0, accentColor + '33');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 1080, 1350);

      // faint diagonal stadium light rays
      ctx.save();
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = '#ffffff';
      for (let i = -2; i < 8; i++) {
        ctx.save();
        ctx.translate(i * 220, 0);
        ctx.rotate(-0.35);
        ctx.fillRect(0, -200, 50, 1800);
        ctx.restore();
      }
      ctx.restore();

      // outer gold frame
      ctx.strokeStyle = accentColor + 'aa';
      ctx.lineWidth = 6;
      ctx.strokeRect(14, 14, 1080 - 28, 1350 - 28);
      ctx.fillStyle = accentColor;
      ctx.fillRect(0, 0, 1080, 6);

      const headline = posterType === 'squad' ? 'OFFICIAL SQUAD' : posterType === 'champion' ? 'CHAMPIONS' : 'NEW SIGNING';
      const logoSize  = posterType === 'champion' ? 170 : 130;
      const logoCx    = posterType === 'champion' ? 540 : 90;
      const logoCy    = 105;

      if (posterType === 'champion') {
        // Centered hero header for champion poster
        if (selTeam.logo) {
          try {
            const logoImg = await loadImg(imgUrl(selTeam.logo));
            const ring = ctx.createRadialGradient(logoCx, logoCy, logoSize/2 - 6, logoCx, logoCy, logoSize/2 + 14);
            ring.addColorStop(0, 'transparent'); ring.addColorStop(1, accentColor + '99');
            ctx.fillStyle = ring; ctx.beginPath(); ctx.arc(logoCx, logoCy, logoSize/2 + 14, 0, Math.PI*2); ctx.fill();
            ctx.save();
            ctx.beginPath(); ctx.arc(logoCx, logoCy, logoSize/2, 0, Math.PI*2); ctx.clip();
            ctx.drawImage(logoImg, logoCx - logoSize/2, logoCy - logoSize/2, logoSize, logoSize);
            ctx.restore();
            ctx.beginPath(); ctx.arc(logoCx, logoCy, logoSize/2, 0, Math.PI*2);
            ctx.strokeStyle = accentColor; ctx.lineWidth = 5; ctx.stroke();
          } catch(e) {}
        }
        ctx.textAlign = 'center';
        ctx.fillStyle = accentColor;
        ctx.font = 'bold 30px Rajdhani, Arial';
        ctx.fillText(headline, 540, 215);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 64px Oswald, Arial';
        ctx.fillText(selTeam.name.toUpperCase(), 540, 270);
        ctx.fillStyle = '#ffffff99';
        ctx.font = '22px Rajdhani, Arial';
        ctx.fillText((selAuction?.name || '').toUpperCase() + ' · ' + new Date().getFullYear(), 540, 302);
        ctx.textAlign = 'left';
      } else {
        // Left-aligned header (squad / signing)
        if (selTeam.logo) {
          try {
            const logoImg = await loadImg(imgUrl(selTeam.logo));
            ctx.save();
            ctx.beginPath(); ctx.arc(logoCx, logoCy, logoSize/2, 0, Math.PI*2); ctx.clip();
            ctx.drawImage(logoImg, logoCx - logoSize/2, logoCy - logoSize/2, logoSize, logoSize);
            ctx.restore();
            ctx.beginPath(); ctx.arc(logoCx, logoCy, logoSize/2, 0, Math.PI*2);
            ctx.strokeStyle = accentColor; ctx.lineWidth = 4; ctx.stroke();
          } catch(e) {}
        }
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 72px Oswald, Arial';
        ctx.fillText(selTeam.name.toUpperCase(), 180, 80);
        ctx.fillStyle = accentColor;
        ctx.font = '32px Rajdhani, Arial';
        ctx.fillText(headline, 180, 130);
        ctx.fillStyle = '#ffffff99';
        ctx.font = '24px Rajdhani, Arial';
        ctx.fillText((selAuction?.name || '').toUpperCase() + ' · ' + new Date().getFullYear(), 180, 170);
      }

      if (posterType === 'signing') {
        // ── SIGNING: spotlight a single player, big and centered ──
        const p = players.find((pl:any) => pl._id === signingPlayerId) || players[0];
        if (p) {
          const boxX = 140, boxY = 330, boxW = 800, boxH = 760;
          const ringGlow = ctx.createRadialGradient(540, boxY + boxH/2, 50, 540, boxY + boxH/2, 520);
          ringGlow.addColorStop(0, accentColor + '22'); ringGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = ringGlow; ctx.fillRect(0, 0, 1080, 1350);

          ctx.fillStyle = '#ffffff0d';
          roundRect(ctx, boxX, boxY, boxW, boxH, 28); ctx.fill();
          ctx.strokeStyle = accentColor; ctx.lineWidth = 4;
          roundRect(ctx, boxX, boxY, boxW, boxH, 28); ctx.stroke();

          if (p.imageUrl) {
            try {
              const pImg = await loadImg(imgUrl(p.imageUrl));
              ctx.save(); roundRect(ctx, boxX + 14, boxY + 14, boxW - 28, boxH - 220, 22); ctx.clip();
              ctx.drawImage(pImg, boxX + 14, boxY + 14, boxW - 28, boxH - 220);
              ctx.restore();
              const og = ctx.createLinearGradient(0, boxY + boxH - 420, 0, boxY + boxH - 206);
              og.addColorStop(0, 'transparent'); og.addColorStop(1, 'rgba(0,0,0,0.85)');
              ctx.fillStyle = og;
              ctx.save(); roundRect(ctx, boxX + 14, boxY + 14, boxW - 28, boxH - 220, 22); ctx.fill(); ctx.restore();
            } catch(e) {}
          }
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 56px Oswald, Arial';
          ctx.fillText(p.name.toUpperCase(), 540, boxY + boxH - 160);
          ctx.fillStyle = accentColor;
          ctx.font = 'bold 26px Rajdhani, Arial';
          ctx.fillText(`${p.role?.toUpperCase()} · ${p.category?.toUpperCase()}`, 540, boxY + boxH - 118);
          ctx.fillStyle = '#22c55e';
          ctx.font = 'bold 44px Oswald, Arial';
          ctx.fillText(fmt(p.soldPrice), 540, boxY + boxH - 60);
          ctx.textAlign = 'left';
        }
      } else {
        // ── SQUAD / CHAMPION: stats bar + photo grid ──
        const gridPlayers = posterType === 'champion'
          ? [...players].sort((a:any,b:any)=>(b.soldPrice||0)-(a.soldPrice||0)).slice(0, 8)
          : players;
        const statsTop = posterType === 'champion' ? 330 : 188;

        const totalSpent = players.reduce((s: number, p: any) => s + (p.soldPrice || 0), 0);
        ctx.fillStyle = accentColor + '33';
        ctx.fillRect(0, statsTop, 1080, 70);
        ctx.textAlign = 'left';
        ctx.fillStyle = accentColor;
        ctx.font = 'bold 28px Rajdhani, Arial';
        ctx.fillText(`${players.length} PLAYERS`, 40, statsTop + 44);
        ctx.fillStyle = '#ffffff99';
        ctx.fillText('|', 230, statsTop + 44);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`TOTAL: ${fmt(totalSpent)}`, 260, statsTop + 44);
        ctx.fillStyle = '#ffffff99';
        ctx.fillText('|', 520, statsTop + 44);
        ctx.fillStyle = '#22c55e';
        ctx.fillText(`PURSE: ${fmt(selTeam.purse)}`, 550, statsTop + 44);

        const cols   = posterType === 'champion' ? 4 : 3;
        const padX   = 40;
        const padY   = statsTop + 92;
        const gap    = 20;
        const cellW  = (1080 - padX * 2 - gap * (cols - 1)) / cols;
        const cellH  = posterType === 'champion' ? 260 : 220;
        const maxCount = posterType === 'champion' ? 8 : 12;

        for (let i = 0; i < Math.min(gridPlayers.length, maxCount); i++) {
          const p  = gridPlayers[i];
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x   = padX + col * (cellW + gap);
          const y   = padY + row * (cellH + gap);

          ctx.fillStyle = '#ffffff0d';
          roundRect(ctx, x, y, cellW, cellH, 16); ctx.fill();
          ctx.strokeStyle = accentColor + '66';
          ctx.lineWidth = 1.5;
          roundRect(ctx, x, y, cellW, cellH, 16); ctx.stroke();

          const photoW = cellW - 20;
          const photoH = cellH - 70;
          if (p.imageUrl) {
            try {
              const pImg = await loadImg(imgUrl(p.imageUrl));
              ctx.save();
              roundRect(ctx, x + 10, y + 10, photoW, photoH, 12);
              ctx.clip();
              ctx.drawImage(pImg, x + 10, y + 10, photoW, photoH);
              ctx.restore();
              const pGrad = ctx.createLinearGradient(x + 10, y + photoH - 70, x + 10, y + photoH + 10);
              pGrad.addColorStop(0, 'transparent');
              pGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
              ctx.fillStyle = pGrad;
              ctx.save();
              roundRect(ctx, x + 10, y + 10, photoW, photoH, 12);
              ctx.fill();
              ctx.restore();
            } catch(e) {
              ctx.fillStyle = '#ffffff11';
              ctx.fillRect(x + 10, y + 10, photoW, photoH);
              ctx.fillStyle = '#ffffff44';
              ctx.font = '48px Arial';
              ctx.textAlign = 'center';
              ctx.fillText('?', x + cellW/2, y + photoH/2 + 16);
              ctx.textAlign = 'left';
            }
          } else {
            ctx.fillStyle = '#ffffff11';
            ctx.fillRect(x + 10, y + 10, photoW, photoH);
            ctx.fillStyle = '#ffffff44';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('?', x + cellW/2, y + photoH/2 + 16);
            ctx.textAlign = 'left';
          }

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 22px Oswald, Arial';
          ctx.textAlign = 'center';
          const nameText = p.name.length > 14 ? p.name.slice(0,13) + '…' : p.name;
          ctx.fillText(nameText.toUpperCase(), x + cellW/2, y + photoH + 25);

          ctx.fillStyle = accentColor + 'cc';
          const roleW = 70; const roleH = 20;
          ctx.fillRect(x + cellW/2 - roleW/2, y + photoH + 29, roleW, roleH);
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 11px Arial';
          ctx.fillText(p.role.toUpperCase().slice(0,10), x + cellW/2 - roleW/2 + 5, y + photoH + 43);

          ctx.fillStyle = accentColor;
          ctx.font = 'bold 20px Oswald, Arial';
          ctx.fillText(fmt(p.soldPrice), x + cellW/2, y + photoH + 66);

          ctx.textAlign = 'left';
        }
      }

      // ── Footer: gold strip + sponsor logos (bigger, more visible) ──
      ctx.fillStyle = accentColor;
      ctx.fillRect(0, 1342, 1080, 8);
      if (sponsors.length) {
        ctx.fillStyle = '#ffffffcc';
        ctx.font = 'bold 16px Rajdhani, Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SPONSORED BY', 540, 1300);
        const sLogos = sponsors.slice(0, 4);
        const sW = 130, sGap = 24;
        const totalW = sLogos.length * sW + (sLogos.length - 1) * sGap;
        let sx = 540 - totalW / 2;
        for (const sp of sLogos) {
          if (sp.logoUrl) {
            try {
              const simg = await loadImg(imgUrl(sp.logoUrl));
              ctx.fillStyle = '#ffffff';
              roundRect(ctx, sx, 1308, sW, 48, 8); ctx.fill();
              const ratio = Math.min(sW / simg.width, 40 / simg.height);
              const dw = simg.width * ratio, dh = simg.height * ratio;
              ctx.drawImage(simg, sx + sW/2 - dw/2, 1308 + 4, dw, dh);
            } catch(e) {}
          }
          sx += sW + sGap;
        }
      } else {
        ctx.fillStyle = '#ffffff55';
        ctx.font = '22px Rajdhani, Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BEAST CRICKET AUCTION PLATFORM', 540, 1336);
      }
      ctx.textAlign = 'left';

      setPosterReady(true);
    } catch(e) {
      console.error(e);
      toast.error('Poster generation failed');
    } finally { setGenerating(false); }
  };

  const downloadPosterPdf = async () => {
    const canvas = canvasRef.current!;
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width, canvas.height] });
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, canvas.width, canvas.height);
    pdf.save(`${selTeam?.name?.replace(/\s+/g,'-')}-${posterType}-poster.pdf`);
    toast.success('Poster PDF downloaded!');
  };

  const downloadPoster = () => {
    const canvas = canvasRef.current!;
    const link = document.createElement('a');
    link.download = `${selTeam?.name?.replace(/\s+/g,'-')}-squad-poster.png`;
    link.href = canvas.toDataURL('image/png', 0.95);
    link.click();
    toast.success('Poster downloaded!');
  };

  const shareWhatsApp = () => {
    toast('Open WhatsApp and share the downloaded image');
  };

  const ADMIN_EMAILS = ['hirishidraj07@gmail.com', 'hirishi2020@gmail.com'];
  const isAdmin = user?.role === 'admin' || (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
  const isElite = isAdmin || orgPkg?.packageType === 'elite';
  const LBL = 'block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5';

  return (
    <div className="min-h-screen bg-background">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "url('/bg-organizer.png')", backgroundSize: 'cover', opacity: 0.1 }} />
        <div className="relative p-6 max-w-7xl mx-auto">
          <div className="mb-4"><BackButton href="/dashboard/organizer" label="Organizer Dashboard" /></div>

          <div className="mb-8">
            <h1 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground">Team <span className="text-gradient-gold">Poster</span> Generator</h1>
            <p className="text-muted-foreground font-display text-sm mt-1">Generate social-media-ready squad posters · Elite feature</p>
          </div>

          {!isElite ? (
            <div className="text-center py-24 bg-glass-navy rounded-2xl border border-purple-500/30">
              <div className="flex justify-center mb-4"><Palette size={56} className="text-primary" /></div>
              <h3 className="font-heading text-2xl uppercase tracking-wider text-foreground mb-3">Elite Only</h3>
              <p className="text-muted-foreground font-display mb-6">Team Poster Generator requires Elite plan</p>
              <a href="/dashboard/organizer" className="px-8 py-3 rounded-lg bg-purple-600 text-white font-heading uppercase tracking-wider text-sm hover:bg-purple-700 transition-all">Upgrade to Elite →</a>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Controls */}
              <div className="space-y-5">
                <div className="bg-glass-premium rounded-2xl p-6 border-gold-subtle">
                  <h3 className="font-heading text-lg uppercase tracking-wider text-foreground mb-5 flex items-center gap-2"><Palette size={18} />Poster Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className={LBL}>Select Auction</label>
                      <select value={selAuction?._id || ''} onChange={e => setSelAuction(auctions.find(a => a._id === e.target.value) || null)}
                        className="input-beast w-full" style={{ background: 'hsl(0 0% 8%)' }}>
                        <option value="">-- Select Auction --</option>
                        {auctions.map(a => <option key={a._id} value={a._id} style={{ background: 'hsl(0 0% 8%)' }}>{a.name}</option>)}
                      </select>
                    </div>
                    {selAuction && (
                      <div>
                        <label className={LBL}>Select Team</label>
                        <select value={selTeam?._id || ''} onChange={e => setSelTeam(teams.find(t => t._id === e.target.value) || null)}
                          className="input-beast w-full" style={{ background: 'hsl(0 0% 8%)' }}>
                          <option value="">-- Select Team --</option>
                          {teams.map(t => <option key={t._id} value={t._id} style={{ background: 'hsl(0 0% 8%)' }}>{t.name}</option>)}
                        </select>
                      </div>
                    )}
                    <div>
                      <label className={LBL}>Poster Type</label>
                      <div className="grid grid-cols-3 gap-2">
                        {([['squad','Squad'],['champion','Champion'],['signing','Signing']] as const).map(([type, label]) => (
                          <button key={type} onClick={() => setPosterType(type)}
                            className={`py-2 rounded-lg text-xs font-heading uppercase tracking-wider transition-all ${posterType === type ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-secondary/40'}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {posterType === 'signing' && players.length > 0 && (
                      <div>
                        <label className={LBL}>Spotlight Player</label>
                        <select value={signingPlayerId} onChange={e => setSigningPlayerId(e.target.value)}
                          className="input-beast w-full" style={{ background: 'hsl(0 0% 8%)' }}>
                          {players.map((p:any) => <option key={p._id} value={p._id} style={{ background: 'hsl(0 0% 8%)' }}>{p.name}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={LBL}>Background Color</label>
                        <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                          className="w-full h-10 rounded-lg border border-border cursor-pointer p-1 bg-transparent" />
                      </div>
                      <div>
                        <label className={LBL}>Accent Color</label>
                        <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)}
                          className="w-full h-10 rounded-lg border border-border cursor-pointer p-1 bg-transparent" />
                      </div>
                    </div>
                    {selTeam && players.length > 0 && (
                      <div className="text-xs font-display text-muted-foreground">
                        {players.length} players loaded · {Math.min(players.length, 12)} will appear on poster
                      </div>
                    )}
                    <button onClick={generatePoster} disabled={!selTeam || generating}
                      className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-heading uppercase tracking-widest text-sm glow-gold hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100">
                      {generating ? <><Loader2 size={14} className="inline mr-1.5 animate-spin" />Generating Poster…</> : <><Palette size={14} className="inline mr-1.5" />Generate Poster</>}
                    </button>
                  </div>
                </div>

                {/* Share options */}
                {posterReady && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-glass-premium rounded-2xl p-6 border border-green-500/30">
                    <h3 className="font-heading text-base uppercase tracking-wider text-green-400 mb-4 flex items-center gap-2"><CheckCircle size={16} className="text-green-400" />Poster Ready!</h3>
                    <div className="space-y-3">
                      <button onClick={downloadPoster} className="w-full py-3 rounded-xl border border-primary/40 text-primary font-heading uppercase tracking-wider text-xs hover:bg-primary/10 transition-all">
                        <Download size={13} className="inline mr-1.5" />Download PNG (1080×1350)
                      </button>
                      <button onClick={downloadPosterPdf} className="w-full py-3 rounded-xl border border-primary/40 text-primary font-heading uppercase tracking-wider text-xs hover:bg-primary/10 transition-all">
                        <FileText size={13} className="inline mr-1.5" />Download as PDF
                      </button>
                      <button onClick={shareWhatsApp} className="w-full py-3 rounded-xl border border-green-500/40 text-green-400 font-heading uppercase tracking-wider text-xs hover:bg-green-500/10 transition-all">
                        <MessageSquare size={13} className="inline mr-1.5" />Share via WhatsApp
                      </button>
                      <p className="text-[10px] text-muted-foreground font-display text-center">1080×1350px · Perfect for Instagram, Facebook & WhatsApp</p>
                    </div>
                  </motion.div>
                )}

                {/* Squad list preview */}
                {selTeam && players.length > 0 && (
                  <div className="bg-glass-premium rounded-2xl p-5 border-gold-subtle">
                    <h3 className="font-heading text-sm uppercase tracking-wider text-foreground mb-3">Squad Preview ({players.length} players)</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {players.map((p: any) => (
                        <div key={p._id} className="flex items-center justify-between text-xs font-display py-1.5 border-b border-border/20">
                          <span className="text-foreground">{p.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">{p.role}</span>
                            <span className="text-primary font-bold">{fmt(p.soldPrice)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Canvas preview */}
              <div>
                <div className="bg-glass-premium rounded-2xl p-5 border-gold-subtle">
                  <h3 className="font-heading text-sm uppercase tracking-wider text-foreground mb-4">Preview</h3>
                  <div className="rounded-xl overflow-hidden border border-border/30" style={{ aspectRatio: '4/5', background: 'hsl(0 0% 5%)' }}>
                    <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                    {!posterReady && (
                      <div className="absolute inset-0 flex items-center justify-center text-center p-8">
                        <div>
                          <div className="flex justify-center mb-3"><Palette size={48} className="text-muted-foreground/40" /></div>
                          <div className="font-heading text-sm uppercase tracking-wider text-muted-foreground">Select auction, team, and click Generate</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}

// helpers
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function adjustColor(hex: string, amt: number): string {
  const num = parseInt(hex.replace('#',''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amt));
  return `rgb(${r},${g},${b})`;
}
