'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '@/lib/socket';
import { fmt } from '@/lib/utils';
import api, { imgUrl } from '@/lib/api';
import { Gavel, ArrowRight, Eye, Bot, ClipboardList } from 'lucide-react';

export default function AudienceScreen() {
  const { id } = useParams<{ id: string }>();
  const [auction, setAuction]       = useState<any>(null);
  const [teams, setTeams]           = useState<any[]>([]);
  const teamsRef = useRef<any[]>([]);
  useEffect(() => { teamsRef.current = teams; }, [teams]);
  const [currentPlayer, setPlayer]  = useState<any>(null);
  const [currentBid, setBid]        = useState(0);
  const [leadingTeam, setLeading]   = useState<any>(null);
  const [timer, setTimer]           = useState(0);
  const [status, setStatus]         = useState('draft');
  const [soldFlash, setSoldFlash]   = useState<any>(null);
  const [soldList, setSoldList]     = useState<any[]>([]);
  const [commentary, setCommentary] = useState('');
  const [bidConfig, setBidConfig]   = useState({ bidTimer: 30 });
  const [sponsors, setSponsors]     = useState<any[]>([]);
  const [sponsorIdx, setSponsorIdx] = useState(0);

  const timerPct = bidConfig.bidTimer > 0 ? (timer / bidConfig.bidTimer) * 100 : 0;
  const timerCol = timer <= 5 ? '#ef4444' : timer <= 10 ? '#f97316' : '#22c55e';

  useEffect(() => {
    if (!id) return;
    api.get(`/auctions/${id}`).then(r => setAuction(r.data.auction)).catch(() => {});
    api.get(`/packages/sponsors/${id}`).then(r => setSponsors(r.data.sponsors || [])).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (sponsors.length < 2) return;
    const t = setInterval(() => setSponsorIdx(i => (i + 1) % sponsors.length), 8000);
    return () => clearInterval(t);
  }, [sponsors.length]);

  useEffect(() => {
    if (!id) return;
    const socket = getSocket();
    const joinRoom = () => socket.emit('joinAuction', { auctionId: id });
    // FIX: same reconnect bug as the broadcast screen — joining only on
    // mount means a dropped/restored connection never rejoins the room,
    // leaving the page looking fine but receiving nothing forever.
    socket.on('connect', joinRoom);
    if (socket.connected) joinRoom();
    socket.on('auctionState', (s: any) => {
      setTeams(s.teams || []); setPlayer(s.currentPlayer);
      setBid(s.currentBid || 0); setTimer(s.timer || 0);
      setStatus(s.status || 'draft');
      if (s.auctionConfig) setBidConfig(s.auctionConfig);
      if (s.leadingTeamId) setLeading((s.teams || []).find((t: any) => t._id === s.leadingTeamId) || null);
    });
    // FIX: audience screen had no "nextPlayer" handler — it never advanced
    // to the next player when the auction started or moved on.
    socket.on('nextPlayer', (d: any) => {
      setPlayer(d.player || null); setBid(d.basePrice || 0); setTimer(d.timer || 0);
      setLeading(null);
    });
    socket.on('auctionStarted', () => setStatus('active'));
    // FIX: real payload is { currentBid, leadingTeamId, leadingTeamName,
    // leadingTeamColor, bidEntry, timer } — not bidAmount/teams/teamName.
    socket.on('bidUpdate', (d: any) => {
      setBid(d.currentBid || 0); setTimer(d.timer || 0);
      setLeading(teamsRef.current.find((t: any) => t._id === d.leadingTeamId)
        || { _id: d.leadingTeamId, name: d.leadingTeamName, primaryColor: d.leadingTeamColor });
    });
    // FIX: server sends `soldTo`, not `team`.
    socket.on('playerSold', (d: any) => {
      setSoldFlash(d);
      if (d.teams) setTeams(d.teams);
      if (d.commentary) setCommentary(d.commentary);
      setSoldList(p => [{ ...d.player, soldPrice: d.soldPrice, teamName: d.soldTo?.teamName, teamColor: d.soldTo?.teamColor }, ...p].slice(0, 50));
      setTimeout(() => setSoldFlash(null), 4000);
    });
    socket.on('timerTick', (d: any) => setTimer(d.timer || 0));
    socket.on('auctionStatusChanged', (d: any) => { if (d.status && (!d.auctionId || String(d.auctionId) === String(id))) setStatus(d.status); });
    socket.on('playerUnsold', () => {});
    return () => {
      socket.off('connect', joinRoom);
      socket.off('auctionState');
      socket.off('nextPlayer');
      socket.off('auctionStarted');
      socket.off('bidUpdate');
      socket.off('playerSold');
      socket.off('timerTick');
      socket.off('auctionStatusChanged');
      socket.off('playerUnsold');
    };
  }, [id]);

  const totalSpent = soldList.reduce((s, p) => s + (p.soldPrice || 0), 0);

  return (
    <div className="w-screen min-h-screen" style={{ background: 'hsl(0 0% 0%)', fontFamily: 'var(--font-heading)' }}>
      {/* SOLD FLASH */}
      <AnimatePresence>
        {soldFlash && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            style={{ background: 'rgba(0,0,0,0.92)' }}>
            <motion.div initial={{ scale: 0.3, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.3 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="text-center px-10">
              <Gavel size={100} className="mx-auto mb-4 text-yellow-400" aria-hidden="true" />
              <div className="text-7xl font-black uppercase tracking-widest mb-3" style={{ color: '#f59e0b', textShadow: '0 0 40px rgba(245,158,11,0.8)' }}>SOLD!</div>
              <div className="text-4xl font-bold text-white mb-2 uppercase">{soldFlash.player?.name}</div>
              <div className="text-5xl font-black mb-3" style={{ color: '#f59e0b' }}>{fmt(soldFlash.soldPrice)}</div>
              <div className="text-2xl text-gray-300 flex items-center justify-center gap-2"><ArrowRight size={20} aria-hidden="true" /> {soldFlash.soldTo?.teamName || soldFlash.team?.name}</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-3 border-b sticky top-0 z-10" style={{ background: 'hsla(222,47%,7%,0.98)', borderColor: 'hsla(45,100%,51%,0.2)' }}>
        <div className="flex items-center gap-3">
          <img src="/beast-logo.png" alt="" className="w-9 h-9 object-contain" onError={e => ((e.target as any).style.display = 'none')} />
          <div>
            <div className="font-black text-sm uppercase tracking-widest" style={{ color: '#f59e0b' }}>{auction?.name || 'Beast Cricket Auction'}</div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className={`w-2 h-2 rounded-full ${status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
              {status === 'active' ? 'LIVE' : status.toUpperCase()} · {soldList.length} sold · {fmt(totalSpent)} total
            </div>
          </div>
        </div>
        {sponsors.length > 0 && sponsors[sponsorIdx]?.logoUrl && (
          <motion.img key={sponsorIdx} src={imgUrl(sponsors[sponsorIdx].logoUrl)} alt="" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-12 max-w-[160px] object-contain opacity-95" />
        )}
        <div className="text-xs text-gray-600 hidden sm:block uppercase tracking-wider flex items-center gap-1"><Eye size={12} aria-hidden="true" /> Audience View · {teams.length} teams</div>
      </div>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3" style={{ minHeight: 'calc(100vh - 56px)' }}>
        {/* LEFT - Current Player */}
        <div className="p-5 border-r" style={{ borderColor: 'hsla(45,100%,51%,0.1)' }}>
          <div className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">NOW UP FOR BID</div>
          {currentPlayer ? (
            <motion.div key={currentPlayer._id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="relative rounded-2xl overflow-hidden mb-4" style={{ border: '2px solid hsla(45,100%,51%,0.4)' }}>
                {currentPlayer.imageUrl
                  ? <img src={imgUrl(currentPlayer.imageUrl)} alt={currentPlayer.name} className="w-full object-contain object-center" style={{ height: 280, background: '#0c1424' }} />
                  : <div className="w-full flex items-center justify-center" style={{ height: 280, background: 'hsl(0 0% 5%)' }}><Gavel size={64} className="text-muted-foreground" aria-hidden="true" /></div>
                }
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 50%)' }} />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="text-white text-2xl font-black uppercase">{currentPlayer.name}</div>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded font-black uppercase" style={{ background: 'hsla(45,100%,51%,0.25)', color: '#f59e0b', border: '1px solid hsla(45,100%,51%,0.4)' }}>{currentPlayer.role}</span>
                    <span className="text-xs px-2 py-0.5 rounded font-black uppercase text-gray-300" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>{currentPlayer.category}</span>
                  </div>
                </div>
              </div>
              <div className="text-center mb-3">
                <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">Base Price</div>
                <div className="text-xl font-black text-gray-300">{fmt(currentPlayer.basePrice)}</div>
              </div>
              <div className="rounded-xl p-4 text-center mb-4" style={{ background: 'hsla(45,100%,51%,0.1)', border: '2px solid hsla(45,100%,51%,0.5)' }}>
                <div className="text-xs uppercase tracking-widest font-black mb-1" style={{ color: '#f59e0b' }}>CURRENT BID</div>
                <div className="text-5xl font-black" style={{ color: '#f59e0b' }}>{fmt(currentBid || currentPlayer.basePrice)}</div>
                {leadingTeam && <div className="text-gray-300 font-black text-lg mt-1 flex items-center gap-1.5"><ArrowRight size={16} aria-hidden="true" /> {leadingTeam.name}</div>}
              </div>
              <div>
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="text-gray-500 uppercase font-black tracking-wider">Timer</span>
                  <span className="font-black text-2xl" style={{ color: timerCol }}>{timer}s</span>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'hsl(0 0% 8%)' }}>
                  <motion.div className="h-full rounded-full" style={{ background: timerCol }} animate={{ width: `${timerPct}%` }} />
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Gavel size={56} className="mx-auto mb-4 text-muted-foreground" aria-hidden="true" />
              <div className="text-lg font-black uppercase text-gray-500 tracking-widest">
                {status === 'completed' ? 'Auction Complete!' : 'Waiting to start...'}
              </div>
            </div>
          )}
        </div>

        {/* CENTRE - Teams */}
        <div className="p-5 border-r" style={{ borderColor: 'hsla(45,100%,51%,0.1)' }}>
          <div className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">TEAM STANDINGS</div>
          <div className="space-y-2 mb-5">
            {[...teams].sort((a, b) => (b.initialPurse - b.purse) - (a.initialPurse - a.purse)).map((t, i) => {
              const spent = t.initialPurse - t.purse;
              const pct = t.initialPurse > 0 ? (spent / t.initialPurse) * 100 : 0;
              const isLeading = leadingTeam?._id === t._id;
              return (
                <div key={t._id} className="rounded-xl px-4 py-3 transition-all"
                  style={{ background: isLeading ? `${t.primaryColor || '#f59e0b'}15` : 'hsl(0 0% 5%)', border: `1px solid ${isLeading ? (t.primaryColor || '#f59e0b') + '60' : 'transparent'}` }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-gray-600 font-black text-xs w-4">#{i + 1}</span>
                    {t.logo ? <img src={imgUrl(t.logo)} alt="" className="w-6 h-6 rounded-full object-cover" /> : <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black" style={{ background: t.primaryColor || '#f59e0b', color: '#000' }}>{(t.shortName || '?').slice(0, 2)}</div>}
                    <span className="font-black text-sm text-white flex-1 truncate">{t.name}</span>
                    {isLeading && <span className="text-xs font-black px-1.5 py-0.5 rounded" style={{ background: t.primaryColor || '#f59e0b', color: '#000' }}>BIDDING</span>}
                    <span className="text-xs font-black" style={{ color: t.primaryColor || '#f59e0b' }}>{fmt(spent)}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: 'hsl(0 0% 10%)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: t.primaryColor || '#f59e0b' }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                    <span>{fmt(t.purse)} left</span>
                    <span>{Math.round(pct)}% spent</span>
                  </div>
                </div>
              );
            })}
          </div>
          {commentary && (
            <div className="rounded-xl p-4" style={{ background: 'hsla(270,100%,60%,0.08)', border: '1px solid hsla(270,100%,60%,0.25)' }}>
              <div className="text-xs font-black uppercase tracking-widest mb-1 flex items-center gap-1" style={{ color: '#c084fc' }}><Bot size={12} aria-hidden="true" /> COMMENTARY</div>
              <div className="text-sm text-gray-300 italic" style={{ fontFamily: 'var(--font-display)' }}>"{commentary}"</div>
            </div>
          )}
        </div>

        {/* RIGHT - Recent Sales */}
        <div className="p-5">
          <div className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">RECENT SALES · {soldList.length}</div>
          <div className="space-y-2" style={{ maxHeight: 'calc(100vh - 130px)', overflowY: 'auto' }}>
            {soldList.map((p, i) => (
              <motion.div key={`${p._id}-${i}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'hsl(0 0% 5%)', border: '1px solid hsl(0 0% 10%)' }}>
                {p.imageUrl ? <img src={imgUrl(p.imageUrl)} alt="" className="w-10 h-10 rounded-lg object-contain flex-shrink-0" style={{ background: 'hsl(0 0% 8%)' }} />
                  : <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(0 0% 8%)' }}><Gavel size={16} className="text-muted-foreground" aria-hidden="true" /></div>}
                <div className="flex-1 min-w-0">
                  <div className="text-white font-black text-sm truncate">{p.name}</div>
                  <div className="text-xs text-gray-500 truncate">{p.role} · {p.teamName}</div>
                </div>
                <div className="font-black text-sm flex-shrink-0" style={{ color: '#f59e0b' }}>{fmt(p.soldPrice)}</div>
              </motion.div>
            ))}
            {soldList.length === 0 && (
              <div className="text-center py-16 text-gray-600">
                <ClipboardList size={36} className="mx-auto mb-3 text-muted-foreground" aria-hidden="true" />
                <div className="text-sm uppercase tracking-wider font-black">No sales yet</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
