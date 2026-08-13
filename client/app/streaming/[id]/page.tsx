'use client';
import {
  Copy, Check, Radio, Monitor, Users, MessageCircle,
  Gamepad2, Youtube, Video, Lightbulb, TriangleAlert
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/shared/AuthGuard';
import api from '@/lib/api';
import BackButton from '@/components/shared/BackButton';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function StreamingSettings() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [auction, setAuction] = useState<any>(null);
  const [orgPkg, setOrgPkg]   = useState<any>(null);
  const [copied, setCopied]   = useState('');
  const [activeTab, setTab]   = useState<'obs'|'youtube'|'zoom'>('obs');

  useEffect(() => {
    if (!id || !user) return;
    api.get(`/auctions/${id}`).then(r => setAuction(r.data.auction)).catch(() => {});
    // For admin, bypass package check - they have full access
    // For team owners, fetch the organizer's plan for this auction
    // For organizers, fetch their own package
    const ADMIN_EMAILS = ['hirishidraj07@gmail.com', 'hirishi2020@gmail.com'];
    const isAdmin = user.role === 'admin' || (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
    if (isAdmin) {
      setOrgPkg({ packageType: 'elite' }); // Admin gets full Elite access
    } else if (user.role === 'team_owner') {
      api.get(`/auctions/${id}/plan`).then(r => setOrgPkg(r.data)).catch(() => {});
    } else {
      api.get('/packages/my').then(r => setOrgPkg(r.data.package)).catch(() => {});
    }
  }, [id, user]);

  const ADMIN_EMAILS = ['hirishidraj07@gmail.com', 'hirishi2020@gmail.com'];
  const isAdmin = user?.role === 'admin' || (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
  const isElite = isAdmin || orgPkg?.packageType === 'elite';
  const broadcastUrl = typeof window !== 'undefined' ? `${window.location.origin}/broadcast/${id}` : `/broadcast/${id}`;
  const audienceUrl  = typeof window !== 'undefined' ? `${window.location.origin}/audience/${id}` : `/audience/${id}`;

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success('Copied!');
    setTimeout(() => setCopied(''), 2000);
  };

  const LBL = 'block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5';
  const CopyBtn = ({ text, k }: { text: string; k: string }) => (
    <button onClick={() => copy(text, k)}
      className={`px-3 py-1.5 rounded-lg text-xs font-heading uppercase tracking-wider transition-all ${copied === k ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}>
      {copied === k ? <><Check size={12} className="inline mr-1" />Copied</> : <><Copy size={12} className="inline mr-1" />Copy</>}
    </button>
  );

  return (
    <AuthGuard roles={['organizer','admin']}>
      <div className="min-h-screen bg-background relative">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage:"url('/bg-organizer.png')", backgroundSize:'cover', opacity: 0.1 }} />
        <div className="relative p-6 max-w-4xl mx-auto">
          <div className="mb-4"><BackButton href="/dashboard/organizer" label="Back" /></div>
          <div className="mb-8">
            <h1 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground">Live <span className="text-gradient-gold">Streaming</span></h1>
            <p className="text-muted-foreground font-display text-sm mt-1">{auction?.name} · OBS · YouTube Live · Zoom</p>
          </div>

          {!isElite ? (
            <div className="text-center py-24 bg-glass-navy rounded-xl border border-purple-500/30">
              <div className="flex justify-center mb-4"><Radio size={56} className="text-primary" /></div>
              <h3 className="font-heading text-2xl uppercase tracking-wider text-foreground mb-3">Elite Feature</h3>
              <p className="text-muted-foreground font-display mb-6">OBS, YouTube Live and Zoom integration require the Elite plan.</p>
              <Link href="/dashboard/organizer" className="px-8 py-3 rounded-lg bg-purple-600 text-white font-heading uppercase tracking-wider text-sm hover:bg-purple-700 transition-all">Upgrade to Elite →</Link>
            </div>
          ) : (
            <>
              {/* Quick Links */}
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                <div className="bg-glass-premium rounded-xl p-5 border-gold-subtle">
                  <div className="font-heading text-sm uppercase tracking-wider text-primary mb-3 flex items-center gap-1"><Monitor size={14} />Broadcast Screen URL</div>
                  <p className="text-muted-foreground text-xs font-display mb-3">Open this on your projector/TV during the auction</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-secondary/30 rounded-lg px-3 py-2 text-foreground truncate font-mono">{broadcastUrl}</code>
                    <CopyBtn text={broadcastUrl} k="broadcast" />
                  </div>
                  <a href={broadcastUrl} target="_blank" rel="noopener noreferrer" className="mt-3 block text-center py-2 rounded-lg border border-primary/30 text-primary text-xs font-heading uppercase tracking-wider hover:bg-primary/10 transition-all">Open →</a>
                </div>
                <div className="bg-glass-premium rounded-xl p-5 border-gold-subtle">
                  <div className="font-heading text-sm uppercase tracking-wider text-green-400 mb-3 flex items-center gap-1"><Users size={14} />Audience Screen URL</div>
                  <p className="text-muted-foreground text-xs font-display mb-3">Share with viewers — they watch live on any device</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-secondary/30 rounded-lg px-3 py-2 text-foreground truncate font-mono">{audienceUrl}</code>
                    <CopyBtn text={audienceUrl} k="audience" />
                  </div>
                  <a href={`https://wa.me/?text=${encodeURIComponent('Watch live: ' + audienceUrl)}`} target="_blank" rel="noopener noreferrer" className="mt-3 block text-center py-2 rounded-lg border border-green-500/30 text-green-400 text-xs font-heading uppercase tracking-wider hover:bg-green-500/10 transition-all"> Share on WhatsApp</a>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-6 border-b border-border/30">
                {(['obs','youtube','zoom'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-5 py-2.5 font-heading uppercase tracking-wider text-xs border-b-2 transition-all ${activeTab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                    {t === 'obs' ? <><Gamepad2 size={12} className="inline mr-1" />OBS Studio</> : t === 'youtube' ? <><Youtube size={12} className="inline mr-1" />YouTube Live</> : <><Video size={12} className="inline mr-1" />Zoom</>}
                  </button>
                ))}
              </div>

              {activeTab === 'obs' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-glass-premium rounded-xl p-6 border-gold-subtle">
                  <h3 className="font-heading text-lg uppercase tracking-wider text-foreground mb-5">OBS Studio Setup</h3>
                  <div className="space-y-5">
                    <div className="p-4 rounded-xl bg-secondary/10 border border-border/30">
                      <h4 className="font-heading text-sm uppercase tracking-wider text-foreground mb-3">Step 1 — Add Browser Source</h4>
                      <ol className="space-y-2 text-sm font-display text-muted-foreground list-decimal list-inside">
                        <li>Open OBS Studio → Click <strong className="text-foreground">+</strong> in Sources panel</li>
                        <li>Select <strong className="text-foreground">Browser</strong> as source type</li>
                        <li>Name it "Beast Broadcast" → click OK</li>
                        <li>Paste the Broadcast URL below into the URL field</li>
                        <li>Set Width: <strong className="text-foreground">1920</strong> · Height: <strong className="text-foreground">1080</strong></li>
                        <li>Check <strong className="text-foreground">"Shutdown source when not visible"</strong></li>
                        <li>Click OK — the auction will appear in OBS</li>
                      </ol>
                    </div>
                    <div>
                      <label className={LBL}>Broadcast URL (paste into OBS)</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-secondary/30 rounded-lg px-3 py-2.5 text-foreground font-mono">{broadcastUrl}</code>
                        <CopyBtn text={broadcastUrl} k="obs-url" />
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/10 border border-border/30">
                      <h4 className="font-heading text-sm uppercase tracking-wider text-foreground mb-2">Step 2 — Configure Stream</h4>
                      <ol className="space-y-2 text-sm font-display text-muted-foreground list-decimal list-inside">
                        <li>Settings → Stream → Service: Custom</li>
                        <li>Paste your YouTube / Facebook stream key</li>
                        <li>Click Start Streaming</li>
                      </ol>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-blue-400 text-xs font-display flex items-start gap-1"><Lightbulb size={11} className="flex-shrink-0 mt-0.5" />Recommended OBS settings: 1080p60, CBR 6000 kbps, x264 encoder, Keyframe Interval 2</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'youtube' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-glass-premium rounded-xl p-6 border-gold-subtle">
                  <h3 className="font-heading text-lg uppercase tracking-wider text-foreground mb-5">YouTube Live Setup</h3>
                  <div className="space-y-5">
                    <div className="p-4 rounded-xl bg-secondary/10 border border-border/30">
                      <h4 className="font-heading text-sm uppercase tracking-wider text-foreground mb-3">Option A — Screen Share via YouTube Studio</h4>
                      <ol className="space-y-2 text-sm font-display text-muted-foreground list-decimal list-inside">
                        <li>Go to <a href="https://studio.youtube.com" target="_blank" className="text-primary underline">YouTube Studio</a> → Go Live</li>
                        <li>Select <strong className="text-foreground">Share Screen</strong></li>
                        <li>Open Broadcast URL in a Chrome tab</li>
                        <li>Share that tab in YouTube Live</li>
                      </ol>
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/10 border border-border/30">
                      <h4 className="font-heading text-sm uppercase tracking-wider text-foreground mb-3">Option B — via OBS (Recommended)</h4>
                      <ol className="space-y-2 text-sm font-display text-muted-foreground list-decimal list-inside">
                        <li>In YouTube Studio → Create → Go Live → Streaming Software</li>
                        <li>Copy your <strong className="text-foreground">Stream Key</strong></li>
                        <li>In OBS: Settings → Stream → Service: YouTube → paste key</li>
                        <li>Add Broadcast URL as Browser Source (see OBS tab)</li>
                        <li>Click Start Streaming in OBS</li>
                      </ol>
                    </div>
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                      <p className="text-red-400 text-xs font-display flex items-start gap-1"><TriangleAlert size={11} className="flex-shrink-0 mt-0.5" />YouTube requires channel to be verified for live streaming. Low-latency mode recommended for auction use.</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'zoom' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-glass-premium rounded-xl p-6 border-gold-subtle">
                  <h3 className="font-heading text-lg uppercase tracking-wider text-foreground mb-5">Zoom Meeting Setup</h3>
                  <div className="space-y-5">
                    <div className="p-4 rounded-xl bg-secondary/10 border border-border/30">
                      <h4 className="font-heading text-sm uppercase tracking-wider text-foreground mb-3">Setup Steps</h4>
                      <ol className="space-y-2 text-sm font-display text-muted-foreground list-decimal list-inside">
                        <li>Start your Zoom meeting and admit all participants</li>
                        <li>Click <strong className="text-foreground">Share Screen</strong> → Select <strong className="text-foreground">Advanced</strong> tab</li>
                        <li>Choose <strong className="text-foreground">Content from 2nd Camera</strong> or <strong className="text-foreground">Website URL</strong></li>
                        <li>Open the Broadcast URL in Chrome (full screen)</li>
                        <li>Share that browser window in Zoom</li>
                        <li>Enable <strong className="text-foreground">"Share computer sound"</strong> for audio</li>
                      </ol>
                    </div>
                    <div>
                      <label className={LBL}>Share Audience URL with Participants</label>
                      <div className="flex items-center gap-2 mb-2">
                        <code className="flex-1 text-xs bg-secondary/30 rounded-lg px-3 py-2.5 text-foreground font-mono">{audienceUrl}</code>
                        <CopyBtn text={audienceUrl} k="zoom-audience" />
                      </div>
                      <p className="text-xs text-muted-foreground font-display">Participants can open this on their own device for a better viewing experience</p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-blue-400 text-xs font-display flex items-start gap-1"><Lightbulb size={11} className="flex-shrink-0 mt-0.5" />For large auctions, use Zoom Webinar instead of Meeting — allows up to 10,000 viewers</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
