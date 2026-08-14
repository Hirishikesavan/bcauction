'use client';
import { Gavel, XCircle, IndianRupee, RefreshCw, Flag, Trophy, Play, PartyPopper, Lock, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { fmt } from '@/lib/utils';
import BackButton from '@/components/shared/BackButton';


const EventIcon = ({ type }: { type: string }) => {
  const cls = "inline-block";
  switch(type) {
    case 'sold': return <Gavel size={16} className={cls} />;
    case 'unsold': return <XCircle size={16} className={cls + ' text-red-400'} />;
    case 'bid': return <IndianRupee size={16} className={cls} />;
    case 'rtm': return <RefreshCw size={16} className={cls} />;
    case 'round_start': return <Flag size={16} className={cls} />;
    case 'round_end': return <Trophy size={16} className={cls} />;
    case 'auction_start': return <Play size={16} className={cls} />;
    case 'auction_end': return <PartyPopper size={16} className={cls} />;
    default: return <span>·</span>;
  }
};
export default function ReplayPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [events, setEvents]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [auction, setAuction] = useState<any>(null);
  const [orgPkg, setOrgPkg]   = useState<any>(null);
  const [filter, setFilter]   = useState<string>('all');
  const [search, setSearch]   = useState('');
  const [locked, setLocked]   = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    Promise.all([
      api.get(`/auctions/${id}`),
      api.get('/packages/my'),
    ]).then(([aRes, pRes]) => {
      setAuction(aRes.data.auction);
      setOrgPkg(pRes.data.package);
      const pkg = pRes.data.package;
      if (user?.role !== 'admin' && (!pkg || !['pro','elite'].includes(pkg.packageType))) {
        setLocked(true); setLoading(false); return;
      }
      return api.get(`/packages/replay/${id}`);
    }).then((r: any) => {
      if (r) setEvents(r.data.events || []);
    }).catch((err: any) => {
      if (err.response?.status === 403) setLocked(true);
    }).finally(() => setLoading(false));
  }, [user, id]);

  const filtered = events.filter(e => {
    if (filter !== 'all' && e.event !== filter) return false;
    if (search && !e.playerName?.toLowerCase().includes(search.toLowerCase()) && !e.teamName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const eventIcon = (ev: string) => {
    switch(ev) {
      case 'sold': return 'sold';
      case 'unsold': return 'unsold';
      case 'bid': return 'bid';
      case 'rtm': return 'rtm';
      case 'round_start': return 'round_start';
      case 'round_end': return 'round_end';
      case 'auction_start': return 'auction_start';
      case 'auction_end': return 'auction_end';
      default: return '•';
    }
  };
  const eventColor = (ev: string) => {
    switch(ev) {
      case 'sold': return 'text-green-400 border-green-500/30 bg-green-500/10';
      case 'unsold': return 'text-red-400 border-red-500/30 bg-red-500/10';
      case 'bid': return 'text-primary border-primary/30 bg-primary/10';
      case 'rtm': return 'text-purple-400 border-purple-500/30 bg-purple-500/10';
      default: return 'text-muted-foreground border-border bg-secondary/20';
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "url('/bg-organizer.png')", backgroundSize: 'cover', opacity: 0.12 }} />
        <div className="relative p-6 max-w-5xl mx-auto">
          <div className="mb-4"><BackButton href="/dashboard/organizer" label="Organizer Dashboard" /></div>

          <div className="mb-8">
            <h1 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground">Auction <span className="text-gradient-gold">Replay</span></h1>
            {auction && <p className="text-muted-foreground font-display text-sm mt-1">{auction.name} · Full bid timeline</p>}
          </div>

          {locked && (
            <div className="text-center py-24 bg-glass-navy rounded-xl border border-yellow-500/30">
              <div className="flex justify-center mb-4"><Lock size={56} className="text-primary" /></div>
              <h3 className="font-heading text-2xl uppercase tracking-wider text-foreground mb-3">Pro Feature</h3>
              <p className="text-muted-foreground font-display mb-6">Auction Replay requires Pro or Elite plan to access the full bid timeline.</p>
              <Link href="/dashboard/organizer" className="px-8 py-3 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm glow-gold hover:scale-[1.02] transition-all">Upgrade Plan →</Link>
            </div>
          )}

          {!locked && loading && (
            <div className="flex items-center justify-center py-24">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          )}

          {!locked && !loading && (
            <>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 mb-6">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search player or team..." className="input-beast flex-1 min-w-48 text-sm py-2" />
                <div className="flex gap-1 flex-wrap">
                  {['all','bid','sold','unsold','rtm'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                      className={`px-4 py-2 rounded-lg text-xs font-heading uppercase tracking-wider transition-all ${filter===f ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground hover:bg-secondary/40'}`}>
                      {eventIcon(f)} {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-muted-foreground font-display mb-4">{filtered.length} events found</div>

              {/* Timeline */}
              {events.length === 0 ? (
                <div className="text-center py-24 bg-glass-navy rounded-xl border-gold-subtle">
                  <div className="flex justify-center mb-4"><Video size={48} className="text-primary" /></div>
                  <h3 className="font-heading text-xl uppercase tracking-wider text-foreground mb-2">No Replay Data Yet</h3>
                  <p className="text-muted-foreground font-display">Replay data is recorded during live auctions. Run an auction to see the replay.</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border/30" />
                  <div className="space-y-3">
                    {filtered.map((ev: any, i: number) => (
                      <motion.div key={ev._id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                        className="flex items-start gap-4 ml-4">
                        <div className={`relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm flex-shrink-0 ${eventColor(ev.event)}`}>
                          {eventIcon(ev.event)}
                        </div>
                        <div className="flex-1 bg-glass-premium rounded-xl p-4 border-gold-subtle">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[9px] px-2 py-0.5 rounded border font-heading uppercase ${eventColor(ev.event)}`}>{ev.event}</span>
                                {ev.playerName && <span className="font-heading text-sm uppercase tracking-wider text-foreground">{ev.playerName}</span>}
                              </div>
                              {ev.teamName && <div className="text-sm font-display text-muted-foreground mt-1">Team: <span className="text-foreground">{ev.teamName}</span></div>}
                              {ev.bidAmount > 0 && <div className="font-heading text-lg text-primary mt-1">{fmt(ev.bidAmount)}</div>}
                              {ev.round && <div className="text-[10px] text-muted-foreground mt-1">Round {ev.round}</div>}
                            </div>
                            <div className="text-[10px] text-muted-foreground flex-shrink-0 font-display">
                              {new Date(ev.timestamp).toLocaleTimeString('en-IN')}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
  );
}
