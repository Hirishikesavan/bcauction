'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '@/lib/socket';
import { fmt } from '@/lib/utils';
import api, { imgUrl } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Lock, Gavel, ArrowRight, Bot, Star, UserCircle, Trophy,
} from 'lucide-react';

export default function BroadcastScreen() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [auction, setAuction]           = useState<any>(null);
  const [teams, setTeams]               = useState<any[]>([]);
  const [orgPkg, setOrgPkg]             = useState<any>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  // Use ref for teams so socket callbacks always see latest value without re-binding
  const teamsRef = useRef<any[]>([]);
  useEffect(() => { teamsRef.current = teams; }, [teams]);

  const [currentPlayer, setCurrentPlayer] = useState<any>(null);
  const [currentBid, setCurrentBid]     = useState(0);
  const [leadingTeam, setLeadingTeam]   = useState<any>(null);
  const [timer, setTimer]               = useState(0);
  const [status, setStatus]             = useState('draft');
  const [bidHistory, setBidHistory]     = useState<any[]>([]);
  const [soldFlash, setSoldFlash]       = useState<any>(null);
  const [soldPlayers, setSoldPlayers]   = useState<any[]>([]);
  const [aiComment, setAiComment]       = useState('');
  const [bidConfig, setBidConfig]       = useState({ bidTimer: 30, bidIncrement: 500000 });
  const [sponsors, setSponsors]         = useState<any[]>([]);
  const [sponsorIdx, setSponsorIdx]     = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);

  const timerPct = bidConfig.bidTimer > 0 ? (timer / bidConfig.bidTimer) * 100 : 0;
  const timerColor = timer <= 5 ? '#ef4444' : timer <= 10 ? '#f97316' : '#f59e0b';

  // Fetch auction metadata
  useEffect(() => {
    if (!id) return;
    api.get(`/auctions/${id}`).then(r => setAuction(r.data.auction)).catch(() => {});
    api.get(`/auctions/${id}/plan`).then(r => setOrgPkg(r.data)).catch(() => {});
    api.get(`/packages/sponsors/${id}`).then(r => setSponsors(r.data.sponsors || [])).catch(() => {});
  }, [id]);

  // Sponsor rotation
  useEffect(() => {
    if (sponsors.length < 2) return;
    const t = setInterval(() => setSponsorIdx(i => (i + 1) % sponsors.length), 8000);
    return () => clearInterval(t);
  }, [sponsors.length]);

  // ── SOCKET SETUP ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    const socket = getSocket();

    const joinRoom = () => {
      console.log('[Broadcast] Joining room:', id);
      socket.emit('joinAuction', { auctionId: id });
    };

    // ── Named handlers (MUST pass same reference to .off()) ──────────────
    const onConnect = () => {
      console.log('[Broadcast] Socket connected — (re)joining room');
      setSocketConnected(true);
      joinRoom();
    };

    const onDisconnect = () => {
      console.log('[Broadcast] Socket disconnected');
      setSocketConnected(false);
    };

    const onAuctionState = (s: any) => {
      console.log('[Broadcast] auctionState received:', s);
      setTeams(s.teams || []);
      setCurrentPlayer(s.currentPlayer || null);
      setCurrentBid(s.currentBid || 0);
      setTimer(s.timer || 0);
      setBidHistory(s.bidHistory || []);
      setStatus(s.status || 'draft');
      if (s.auctionConfig) setBidConfig(s.auctionConfig);
      if (s.leadingTeamId) {
        const lt = (s.teams || []).find((t: any) => t._id === s.leadingTeamId || String(t._id) === String(s.leadingTeamId));
        setLeadingTeam(lt || { _id: s.leadingTeamId, name: s.leadingTeamName, primaryColor: s.leadingTeamColor });
      } else {
        setLeadingTeam(null);
      }
    };

    const onAuctionStarted = () => {
      console.log('[Broadcast] auctionStarted');
      setStatus('active');
    };

    const onNextPlayer = (d: any) => {
      console.log('[Broadcast] nextPlayer:', d);
      setCurrentPlayer(d.player || null);
      setCurrentBid(d.basePrice || 0);
      setTimer(d.timer || 0);
      setBidHistory([]);
      setLeadingTeam(null);
      setSoldFlash(null);
      setStatus('active');
    };

    const onBidUpdate = (d: any) => {
      setCurrentBid(d.currentBid || 0);
      setTimer(d.timer || 0);
      setLeadingTeam(() => {
        const fromList = teamsRef.current.find(
          (t: any) => String(t._id) === String(d.leadingTeamId)
        );
        return fromList || { _id: d.leadingTeamId, name: d.leadingTeamName, primaryColor: d.leadingTeamColor };
      });
      if (d.bidEntry) setBidHistory(prev => [d.bidEntry, ...prev].slice(0, 10));
    };

    const onPlayerSold = (d: any) => {
      console.log('[Broadcast] playerSold:', d);
      setSoldFlash(d);
      if (d.teams) setTeams(d.teams);
      setSoldPlayers(prev => [
        { ...d.player, soldPrice: d.soldPrice, teamName: d.soldTo?.teamName },
        ...prev,
      ].slice(0, 20));
      if (d.commentary) setAiComment(d.commentary);
      setTimeout(() => setSoldFlash(null), 5000);
    };

    const onPlayerUnsold = (d: any) => {
      console.log('[Broadcast] playerUnsold:', d);
      setCurrentBid(0);
      setLeadingTeam(null);
      setSoldFlash(null);
      if (d.commentary) setAiComment(d.commentary);
    };

    const onTimerTick = (d: any) => {
      setTimer(d.timer ?? 0);
    };

    const onAuctionCompleted = () => {
      console.log('[Broadcast] auctionCompleted');
      setStatus('completed');
      setCurrentPlayer(null);
    };

    const onAuctionPaused = () => {
      console.log('[Broadcast] auctionPaused');
      setStatus('paused');
    };

    const onAuctionResumed = () => {
      console.log('[Broadcast] auctionResumed');
      setStatus('active');
    };

    const onAuctionStatusChanged = (d: any) => {
      if (d.status && (!d.auctionId || String(d.auctionId) === String(id))) {
        setStatus(d.status);
      }
    };

    // ── Register listeners ────────────────────────────────────────────────
    socket.on('connect',              onConnect);
    socket.on('disconnect',           onDisconnect);
    socket.on('auctionState',         onAuctionState);
    socket.on('auctionStarted',       onAuctionStarted);
    socket.on('nextPlayer',           onNextPlayer);
    socket.on('bidUpdate',            onBidUpdate);
    socket.on('playerSold',           onPlayerSold);
    socket.on('playerUnsold',         onPlayerUnsold);
    socket.on('timerTick',            onTimerTick);
    socket.on('auctionCompleted',     onAuctionCompleted);
    socket.on('auctionPaused',        onAuctionPaused);
    socket.on('auctionResumed',       onAuctionResumed);
    socket.on('auctionStatusChanged', onAuctionStatusChanged);

    // Set initial connection state and join if already connected
    setSocketConnected(socket.connected);
    if (socket.connected) {
      joinRoom();
    }

    // ── Cleanup: pass the SAME function reference to .off() ─────────────
    return () => {
      socket.off('connect',              onConnect);
      socket.off('disconnect',           onDisconnect);
      socket.off('auctionState',         onAuctionState);
      socket.off('auctionStarted',       onAuctionStarted);
      socket.off('nextPlayer',           onNextPlayer);
      socket.off('bidUpdate',            onBidUpdate);
      socket.off('playerSold',           onPlayerSold);
      socket.off('playerUnsold',         onPlayerUnsold);
      socket.off('timerTick',            onTimerTick);
      socket.off('auctionCompleted',     onAuctionCompleted);
      socket.off('auctionPaused',        onAuctionPaused);
      socket.off('auctionResumed',       onAuctionResumed);
      socket.off('auctionStatusChanged', onAuctionStatusChanged);
    };
  }, [id]);

  const topBuyers = [...teams].sort(
    (a, b) => (b.initialPurse - b.purse) - (a.initialPurse - a.purse)
  ).slice(0, 5);

  if (accessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0c1a2e' }}>
        <div className="text-center p-8 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Lock size={56} className="mx-auto mb-4 text-yellow-400" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-white mb-2">Feature Locked</h1>
          <p className="text-gray-400 mb-4">Broadcast Screen requires Elite plan</p>
          <button onClick={() => router.push('/dashboard/organizer')} className="px-6 py-2 rounded-lg text-white font-bold" style={{ background: '#f5b942' }}>
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-background flex flex-col" style={{ background: 'hsl(0 0% 0%)' }}>
      {/* SOLD FLASH */}
      <AnimatePresence>
        {soldFlash && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            style={{ background: 'rgba(0,0,0,0.85)' }}>
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 0.5 }} transition={{ type: 'spring', stiffness: 300 }}
              className="text-center">
              <Gavel size={88} className="mx-auto mb-4 text-yellow-400" aria-hidden="true" />
              <div className="font-heading text-6xl uppercase tracking-widest text-primary mb-2">SOLD!</div>
              <div className="font-heading text-3xl text-foreground mb-1">{soldFlash.player?.name}</div>
              <div className="font-heading text-5xl text-gradient-gold mb-2">{fmt(soldFlash.soldPrice)}</div>
              <div className="font-heading text-2xl text-muted-foreground flex items-center justify-center gap-2">
                <ArrowRight size={22} aria-hidden="true" /> {soldFlash.soldTo?.teamName || soldFlash.team?.name}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div className="flex items-center justify-between px-8 py-4 border-b" style={{ borderColor: 'hsla(45,100%,51%,0.2)', background: 'hsla(222,47%,8%,0.95)' }}>
        <div className="flex items-center gap-4">
          <img src="/beast-logo.png" alt="Beast" className="w-10 h-10 object-contain" style={{ filter: 'drop-shadow(0 0 8px hsla(45,100%,51%,0.5))' }} />
          <div>
            <div className="font-heading text-xl uppercase tracking-[0.15em] text-gradient-gold">{auction?.name || 'Beast Cricket Auction'}</div>
            <div className="text-xs text-muted-foreground font-display flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-green-400 animate-pulse' : status === 'paused' ? 'bg-yellow-400' : 'bg-gray-400'}`} />
              {status === 'active' ? 'LIVE' : status === 'paused' ? 'PAUSED' : status.toUpperCase()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {/* Socket Connection Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: socketConnected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: `1px solid ${socketConnected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` }}>
            <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-[10px] font-heading uppercase tracking-wider" style={{ color: socketConnected ? '#22c55e' : '#ef4444' }}>
              {socketConnected ? 'Connected' : 'Reconnecting…'}
            </span>
          </div>
          {/* Sponsor rotation */}
          {sponsors.length > 0 && sponsors[sponsorIdx]?.logoUrl && (
            <motion.div key={sponsorIdx} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="inline-block"
              style={{ padding: '8px' }}>
              <img 
                src={imgUrl(sponsors[sponsorIdx].logoUrl)} 
                alt={sponsors[sponsorIdx].name} 
                className="block max-h-28 max-w-[400px] object-contain transition-all duration-300 hover:scale-105 hover:brightness-110" 
                style={{ width: 'auto', height: 'auto' }}
              />
            </motion.div>
          )}
          <div className="text-right">
            <div className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground">Teams</div>
            <div className="font-heading text-2xl text-foreground">{teams.length}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground">Sold</div>
            <div className="font-heading text-2xl text-green-400">{soldPlayers.length}</div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Current Player */}
        <div className="w-2/5 flex flex-col border-r p-6" style={{ borderColor: 'hsla(45,100%,51%,0.15)' }}>
          {currentPlayer ? (
            <motion.div key={currentPlayer._id} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col h-full">
              <div className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground mb-3">Current Player</div>
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="relative w-64 h-64 mb-6 rounded-2xl overflow-hidden border-4" style={{ borderColor: 'hsla(45,100%,51%,0.5)' }}>
                  {currentPlayer.imageUrl ? (
                    <img src={imgUrl(currentPlayer.imageUrl)} alt={currentPlayer.name} className="w-full h-full object-cover object-top" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/30"><UserCircle size={88} className="text-muted-foreground" aria-hidden="true" /></div>
                  )}
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }} />
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="font-heading text-2xl text-white uppercase tracking-wider">{currentPlayer.name}</div>
                    <div className="flex gap-2 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-primary/30 text-primary border border-primary/40 font-heading uppercase">{currentPlayer.role}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-secondary/40 text-foreground border border-border font-heading uppercase">{currentPlayer.category}</span>
                    </div>
                  </div>
                </div>
                <div className="text-center mb-6">
                  <div className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground mb-1">Base Price</div>
                  <div className="font-heading text-3xl text-foreground">{fmt(currentPlayer.basePrice)}</div>
                </div>
                {/* Current Bid */}
                <div className="w-full rounded-xl p-5 text-center" style={{ background: 'hsla(45,100%,51%,0.1)', border: '2px solid hsla(45,100%,51%,0.4)' }}>
                  <div className="text-[10px] font-heading uppercase tracking-widest text-primary mb-1">Current Bid</div>
                  <div className="font-heading text-5xl text-gradient-gold">{fmt(currentBid || currentPlayer.basePrice)}</div>
                  {leadingTeam && (
                    <div className="mt-2 font-heading text-lg text-foreground flex items-center gap-2">
                      <ArrowRight size={16} aria-hidden="true" />
                      {leadingTeam.logo && <img src={imgUrl(leadingTeam.logo)} alt="" className="w-6 h-6 rounded-full object-cover" />}
                      {leadingTeam.name}
                    </div>
                  )}
                </div>
              </div>
              {/* Timer */}
              <div className="mt-4">
                <div className="flex justify-between text-xs font-heading mb-2">
                  <span className="text-muted-foreground uppercase tracking-wider">Time Remaining</span>
                  <span style={{ color: timerColor }} className="font-bold text-2xl">{timer}s</span>
                </div>
                <div className="w-full h-4 bg-secondary/30 rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ width: `${timerPct}%`, background: timerColor }} animate={{ width: `${timerPct}%` }} />
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <Gavel size={64} className="mx-auto mb-4 text-muted-foreground" aria-hidden="true" />
                <div className="font-heading text-2xl uppercase tracking-wider text-foreground mb-2">
                  {status === 'completed' ? 'Auction Completed' : status === 'active' ? 'Loading Player…' : status === 'paused' ? 'Auction Paused' : 'Waiting to Start'}
                </div>
                <div className="text-muted-foreground font-display">Beast Cricket Auction Platform</div>
                {!socketConnected && (
                  <div className="mt-3 text-xs text-yellow-400 animate-pulse">Reconnecting to live feed…</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CENTER: Bid History + Teams */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {/* Bid History */}
          <div className="mb-6">
            <div className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground mb-3">Live Bid Feed</div>
            <div className="space-y-2 max-h-48 overflow-hidden">
              <AnimatePresence>
                {bidHistory.slice(0, 6).map((b: any, i: number) => (
                  <motion.div key={`${b.teamName}-${b.bidAmount}-${i}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center justify-between rounded-lg px-4 py-2 ${i === 0 ? 'bg-primary/15 border border-primary/30' : 'bg-secondary/20'}`}>
                    <span className={`font-heading text-sm uppercase tracking-wider ${i === 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{b.teamName}</span>
                    <span className={`font-heading font-bold ${i === 0 ? 'text-primary text-lg' : 'text-muted-foreground'}`}>{fmt(b.bidAmount)}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {bidHistory.length === 0 && (
                <div className="text-center py-8 text-muted-foreground font-display text-sm">No bids yet — auction is live</div>
              )}
            </div>
          </div>

          {/* Top Buyers */}
          <div className="flex-1">
            <div className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground mb-3">Top Buyers</div>
            <div className="space-y-2">
              {topBuyers.map((t: any, i: number) => {
                const spent = t.initialPurse - t.purse;
                const pct = t.initialPurse > 0 ? (spent / t.initialPurse) * 100 : 0;
                return (
                  <div key={t._id} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: i === 0 ? 'hsla(45,100%,51%,0.1)' : 'hsla(222,30%,16%,0.5)', border: i === 0 ? '1px solid hsla(45,100%,51%,0.3)' : '1px solid transparent' }}>
                    <div className="font-heading text-lg text-muted-foreground w-6">#{i + 1}</div>
                    {t.logo ? <img src={imgUrl(t.logo)} alt="" className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black" style={{ background: t.primaryColor || '#f59e0b' }}>{t.shortName?.slice(0, 2)}</div>}
                    <div className="flex-1">
                      <div className="font-heading text-sm uppercase text-foreground">{t.name}</div>
                      <div className="w-full h-1.5 bg-secondary/30 rounded-full mt-1">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: t.primaryColor || '#f59e0b' }} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-heading text-sm text-primary">{fmt(spent)}</div>
                      <div className="text-[9px] text-muted-foreground">{fmt(t.purse)} left</div>
                    </div>
                  </div>
                );
              })}
              {teams.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm font-display">Waiting for teams to join…</div>
              )}
            </div>
          </div>

          {/* AI Commentary */}
          {aiComment && (
            <div className="mt-4 rounded-xl px-4 py-3 border border-purple-500/30" style={{ background: 'hsla(270,100%,60%,0.08)' }}>
              <div className="text-[10px] font-heading uppercase tracking-widest text-purple-400 mb-1 flex items-center gap-1"><Bot size={11} aria-hidden="true" /> AI Commentary</div>
              <div className="font-display text-sm text-foreground italic">"{aiComment}"</div>
            </div>
          )}

          {/* Auction completed banner */}
          {status === 'completed' && (
            <div className="mt-4 rounded-xl px-6 py-5 text-center border border-green-500/30" style={{ background: 'hsla(142,70%,45%,0.1)' }}>
              <div className="font-heading text-2xl uppercase tracking-widest text-green-400 mb-1 flex items-center justify-center gap-2"><Trophy size={22} />Auction Completed!</div>
              <div className="text-muted-foreground text-sm font-display">{soldPlayers.length} players sold</div>
            </div>
          )}
        </div>

        {/* RIGHT: Recent Sales */}
        <div className="w-56 border-l p-4 overflow-y-auto" style={{ borderColor: 'hsla(45,100%,51%,0.15)' }}>
          <div className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground mb-3">Recent Sales</div>
          <div className="space-y-2">
            {soldPlayers.map((p: any, i: number) => (
              <div key={`${p._id}-${i}`} className="rounded-lg overflow-hidden border-gold-subtle">
                {p.imageUrl
                  ? <img src={imgUrl(p.imageUrl)} alt={p.name} className="w-full h-20 object-contain object-center bg-[#0c1424]" />
                  : <div className="w-full h-20 bg-secondary/30 flex items-center justify-center"><UserCircle size={28} className="text-muted-foreground" aria-hidden="true" /></div>
                }
                <div className="p-2">
                  <div className="font-heading text-xs uppercase text-foreground truncate">{p.name}</div>
                  <div className="text-[9px] text-muted-foreground">{p.teamName}</div>
                  <div className="text-primary font-heading font-bold text-xs">{fmt(p.soldPrice)}</div>
                </div>
              </div>
            ))}
            {soldPlayers.length === 0 && <div className="text-center text-muted-foreground text-xs py-8 font-display">No sales yet</div>}
          </div>
        </div>
      </div>

      {/* SPONSOR STRIP */}
      {sponsors.length > 0 && (
        <div className="px-8 py-8 border-t flex flex-col items-center gap-6"
          style={{ borderColor: 'hsla(45,100%,51%,0.15)', background: 'linear-gradient(180deg, hsla(222,47%,7%,0.95) 0%, hsla(45,60%,15%,0.3) 50%, hsla(222,47%,7%,0.95) 100%)' }}>
          <span className="text-xs font-heading uppercase tracking-[0.3em] text-amber-400 font-bold inline-flex items-center gap-2"><Star size={12} aria-hidden="true" /> Sponsored By <Star size={12} aria-hidden="true" /></span>
          <div className="flex items-center justify-center gap-10 flex-wrap">
            {sponsors.map((s: any) => (
              <a key={s._id} href={s.websiteUrl || '#'} target="_blank" rel="noopener noreferrer"
                className="inline-block transition-all duration-300 hover:scale-105 hover:brightness-110"
                style={{ padding: '12px 16px' }}>
                {s.logoUrl ? (
                  <img 
                    src={imgUrl(s.logoUrl)} 
                    alt={s.name} 
                    className="max-h-20 max-w-[280px] object-contain" 
                    style={{ width: 'auto', height: 'auto', display: 'block' }} 
                  />
                ) : (
                  <span className="text-sm font-bold text-foreground px-3 py-1">{s.name}</span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="px-8 py-2 border-t flex items-center justify-between" style={{ borderColor: 'hsla(45,100%,51%,0.15)', background: 'hsla(222,47%,8%,0.95)' }}>
        <div className="font-heading text-xs uppercase tracking-widest text-muted-foreground">Powered by Beast Cricket Auction Platform</div>
        <div className="font-heading text-xs text-muted-foreground">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>
    </div>
  );
}
