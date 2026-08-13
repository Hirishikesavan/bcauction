'use client';
export const dynamic = 'force-dynamic';
import { AlertCircle, BarChart2, BarChart3, Bot, Building, CheckCircle2, ClipboardList, CreditCard, Download, Eye, Gavel, Gift, Home, Lightbulb, Loader2, Lock, Mic2, Phone, Radio, Scale, Search, Shield, Smartphone, TrendingUp, Users, Video, Wallet, Zap } from 'lucide-react';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/shared/AuthGuard';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import BackButton from '@/components/shared/BackButton';
import NextStepBanner from '@/components/guide/NextStepBanner';
import { useSearchParams } from 'next/navigation';

type AdminTab = 'overview' | 'users' | 'organizers' | 'payments' | 'bank' | 'subscriptions' | 'auctions' | 'grant-plan' | 'ai-control' | 'logs';

const fmtMoney = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtDate  = (d: string | Date) => d ? format(new Date(d), 'dd MMM yyyy') : '—';
const fmtTime  = (d: string | Date) => d ? format(new Date(d), 'dd MMM yy, hh:mm a') : '—';

const STATUS_COLORS: Record<string, string> = {
  success:   'border-green-500/40 bg-green-500/10 text-green-400',
  pending:   'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
  failed:    'border-red-500/40 bg-red-500/10 text-red-400',
  refunded:  'border-purple-500/40 bg-purple-500/10 text-purple-400',
  active:    'border-green-500/40 bg-green-500/10 text-green-400',
  completed: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
  draft:     'border-gray-500/40 bg-gray-500/10 text-gray-400',
  scheduled: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400',
};

const PLAN_COLORS: Record<string, string> = {
  starter: '#60a5fa',
  pro:     '#f59e0b',
  elite:   '#a78bfa',
};

const Stat = ({ label, value, sub, color }: any) => (
  <div className="bg-glass-premium rounded-xl p-5 border-gold-subtle">
    <div className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
    <div className="font-heading text-3xl text-foreground" style={color ? { color } : {}}>{value}</div>
    {sub && <div className="text-xs text-muted-foreground font-display mt-1">{sub}</div>}
  </div>
);

const Badge = ({ text, variant }: { text: string; variant?: string }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-heading uppercase border ${STATUS_COLORS[variant || text] || 'border-border/40 bg-secondary/20 text-muted-foreground'}`}>
    {text}
  </span>
);

function AdminDashboard() {
  const { user } = useAuth();
  const [tab,      setTab]      = useState<AdminTab>('overview');
  const searchParams = useSearchParams();
  useEffect(() => {
    const t = searchParams?.get('tab') as AdminTab | null;
    if (t) setTab(t);
  }, [searchParams]);
  const [stats,    setStats]    = useState<any>(null);
  const [users,    setUsers]    = useState<any[]>([]);
  const [orgs,     setOrgs]     = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [bankData, setBankData] = useState<any[]>([]);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [logs,     setLogs]     = useState<any[]>([]);
  const [grantForm,    setGrantForm]    = useState({ email: '', plan: 'pro', days: '365' });
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantResult,  setGrantResult]  = useState('');
  const [aiAuctionId,  setAiAuctionId]  = useState('');
  const [aiAnalysis,   setAiAnalysis]   = useState<any>(null);
  const [aiLoading,    setAiLoading]    = useState(false);
  const [subAnal,  setSubAnal]  = useState<any>(null);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [totalRevenue, setTotalRevenue] = useState(0);

  // Real-time admin updates
  useEffect(() => {
    try {
      const s = getSocket();
      s.emit('join-admin');
      s.on('admin-update', (d: any) => {
        if (d.type === 'new-activity') fetchLogs();
        if (d.type === 'user-updated' || d.type === 'user-deleted') { fetchUsers(); fetchOrgs(); }
        if (d.type === 'auction-deleted') fetchAuctions();
      });
      s.on('activity-log', (entry: any) => {
        setLogs(prev => [entry, ...prev].slice(0, 200));
      });
      return () => { s.off('admin-update'); s.off('activity-log'); };
    } catch {}
  }, []);

  useEffect(() => { fetchStats(); }, []);

  useEffect(() => {
    if (tab === 'users')         fetchUsers();
    if (tab === 'organizers')    fetchOrgs();
    if (tab === 'payments')      fetchPayments();
    if (tab === 'bank')          fetchBank();
    if (tab === 'auctions')      fetchAuctions();
    if (tab === 'logs')          fetchLogs();
    if (tab === 'subscriptions') fetchSubAnalytics();
  }, [tab]);

  const fetchStats    = async () => { try { const r = await api.get('/admin/stats'); setStats(r.data.stats); } catch {} };
  const fetchUsers    = async () => { setLoading(true); try { const r = await api.get(`/admin/users?search=${search}&role=${roleFilter}&limit=100`); setUsers(r.data.users || []); } catch {} setLoading(false); };
  const fetchOrgs     = async () => { setLoading(true); try { const r = await api.get('/admin/organizers?limit=100'); setOrgs(r.data.organizers || []); } catch {} setLoading(false); };
  const fetchPayments = async () => { setLoading(true); try { const r = await api.get('/admin/payments?limit=100'); setPayments(r.data.payments || []); setTotalRevenue(r.data.totalRevenue || 0); } catch {} setLoading(false); };
  const fetchBank     = async () => { setLoading(true); try { const r = await api.get('/admin/bank-details'); setBankData(r.data.profiles || []); } catch {} setLoading(false); };
  const fetchAuctions = async () => { setLoading(true); try { const r = await api.get('/admin/auctions?limit=100'); setAuctions(r.data.auctions || []); } catch {} setLoading(false); };
  const fetchLogs     = async () => { setLoading(true); try { const r = await api.get('/admin/activity?limit=100'); setLogs(r.data.logs || []); } catch {} setLoading(false); };
  const fetchSubAnalytics = async () => { setLoading(true); try { const r = await api.get('/admin/subscription-analytics'); setSubAnal(r.data.analytics); } catch {} setLoading(false); };

  const blockUser = async (id: string, blocked: boolean) => {
    try { await api.put(`/admin/users/${id}/block`); toast.success(blocked ? 'User unblocked' : 'User blocked'); fetchUsers(); } catch { toast.error('Failed'); }
  };
  const changeRole = async (id: string, role: string) => {
    try { await api.put(`/admin/users/${id}/role`, { role }); toast.success('Role updated'); fetchUsers(); fetchOrgs(); } catch { toast.error('Failed'); }
  };
  const verifyUser = async (id: string) => {
    try { await api.put(`/admin/users/${id}/verify`); toast.success('User verified'); fetchUsers(); } catch { toast.error('Failed'); }
  };
  const deleteUser = async (id: string) => {
    if (!confirm('Delete this user permanently?')) return;
    try { await api.delete(`/admin/users/${id}`); toast.success('User deleted'); fetchUsers(); } catch { toast.error('Failed'); }
  };
  const changePlan = async (orgId: string, pkg: string) => {
    try { await api.put(`/admin/organizers/${orgId}/plan`, { packageType: pkg }); toast.success(`Plan changed to ${pkg}`); fetchOrgs(); } catch { toast.error('Failed'); }
  };
  const refundPayment = async (id: string) => {
    const reason = prompt('Refund reason:');
    if (reason === null) return;
    try { await api.put(`/admin/payments/${id}/refund`, { reason }); toast.success('Marked as refunded'); fetchPayments(); } catch { toast.error('Failed'); }
  };
  const deleteAuction = async (id: string) => {
    if (!confirm('Delete this auction and all its data?')) return;
    try { await api.delete(`/admin/auctions/${id}`); toast.success('Deleted'); fetchAuctions(); } catch { toast.error('Failed'); }
  };

  const exportCSV = (endpoint: string, filename: string) => {
    const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api');
    window.open(`${base}/admin/export/${endpoint}`, '_blank');
  };

  const NAV: { id: AdminTab; Icon: any; label: string }[] = [
    { id: 'overview',      Icon: BarChart3,     label: 'Overview'      },
    { id: 'users',         Icon: Users,         label: 'Users'          },
    { id: 'organizers',    Icon: Mic2,          label: 'Organizers'     },
    { id: 'payments',      Icon: CreditCard,    label: 'Payments'       },
    { id: 'bank',          Icon: Building,      label: 'Bank Details'   },
    { id: 'subscriptions', Icon: TrendingUp,    label: 'Subscriptions'  },
    { id: 'auctions',      Icon: Gavel,         label: 'Auctions'       },
    { id: 'grant-plan',    Icon: Gift,          label: 'Grant Plan'     },
    { id: 'ai-control',    Icon: Bot,           label: 'Beast AI'       },
    { id: 'logs',          Icon: ClipboardList, label: 'Audit Logs'     },
  ];

  const TH = ({ children }: any) => (
    <th className="px-4 py-3 text-left text-[10px] font-heading uppercase tracking-wider text-muted-foreground whitespace-nowrap">{children}</th>
  );
  const TD = ({ children, className = '' }: any) => (
    <td className={`px-4 py-3 text-sm font-display text-foreground ${className}`}>{children}</td>
  );

  return (
    <AuthGuard roles={['admin']}>
      <div className="flex h-screen overflow-hidden bg-background">

        {/* SIDEBAR */}
        <div className="w-56 flex-shrink-0 flex flex-col border-r" style={{ background: 'hsl(0 0% 5%)', borderColor: 'hsla(45,100%,51%,0.12)' }}>
          <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'hsla(45,100%,51%,0.1)' }}>
            <Link href="/"><img src="/beast-logo.png" alt="Beast" className="w-9 h-9 object-contain" style={{ filter: 'drop-shadow(0 0 8px hsla(45,100%,51%,0.5))' }} /></Link>
            <div>
              <div className="font-heading text-sm uppercase tracking-[0.15em] text-gradient-gold leading-none">Beast Cricket</div>
              <div className="text-[10px] font-heading uppercase tracking-widest text-red-400 mt-0.5 flex items-center gap-0.5"><Zap size={9} />Super Admin</div>
            </div>
          </div>

          {user && (
            <div className="mx-3 mt-3 p-3 rounded-lg bg-glass-navy border border-red-500/20">
              <div className="text-[9px] font-heading uppercase tracking-wider text-red-400 mb-0.5">Admin</div>
              <div className="font-display font-semibold text-foreground text-sm truncate">{user.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
            </div>
          )}

          <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
            {NAV.map(n => (
              <button key={n.id} onClick={() => setTab(n.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-display font-semibold transition-all text-left ${tab === n.id ? 'bg-primary/15 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'}`}>
                <span>{n.Icon && <n.Icon size={14} />}</span><span>{n.label}</span>
              </button>
            ))}
            <div className="border-t border-border/30 pt-2 mt-2 space-y-0.5">
              <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-display font-semibold text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition-all">
                <Home size={14} /><span>Main Site</span>
              </Link>
            </div>
          </nav>
        </div>

        {/* MAIN */}
        <div className="flex-1 overflow-auto relative">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top right, hsla(0,84%,60%,0.04) 0%, transparent 60%)' }} />
          <div className="relative p-7">
            <div className="mb-4"><BackButton href="/" label="Main Site" /></div>
            <NextStepBanner />

            {/* ── OVERVIEW ── */}
            {tab === 'overview' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground mb-7">
                  Admin <span className="text-gradient-gold">Overview</span>
                </h2>
                {!stats ? (
                  <div className="text-center py-20 text-muted-foreground">Loading...</div>
                ) : (
                  <>
                    {/* Platform Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <Stat label="Total Users"       value={stats.users.total}         sub={`+${stats.users.newToday} today`} />
                      <Stat label="Organizers"        value={stats.users.organizers}    sub={`${stats.subscriptions.active} with active plan`} />
                      <Stat label="Total Auctions"    value={stats.auctions.total}      sub={`${stats.auctions.active} live now`} />
                      <Stat label="Total Revenue"     value={stats.revenue.totalFormatted} color="#f59e0b" sub={`${stats.revenue.monthFormatted} this month`} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <Stat label="Active Plans"      value={stats.subscriptions.active}   sub={`${stats.subscriptions.expired} expired`} />
                      <Stat label="Starter Users"     value={stats.subscriptions.starter}  sub="₹2,999/yr" color={PLAN_COLORS.starter} />
                      <Stat label="Pro Users"         value={stats.subscriptions.pro}      sub="₹999/yr" color={PLAN_COLORS.pro} />
                      <Stat label="Elite Users"       value={stats.subscriptions.elite}    sub="₹1999/yr" color={PLAN_COLORS.elite} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <Stat label="Total Players"     value={stats.auctions.players}    sub={`across all auctions`} />
                      <Stat label="Total Teams"       value={stats.auctions.teams} />
                      <Stat label="Total Bids"        value={stats.auctions.bids} />
                      <Stat label="Logins Today"      value={stats.activity.loginsToday} sub={`${stats.activity.failedToday} failed`} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <Stat label="Blocked Users"     value={stats.users.blocked}  color="#ef4444" />
                      <Stat label="Unverified"        value={stats.users.unverified} color="#f59e0b" />
                      <Stat label="Team Owners"       value={stats.users.teamOwners} />
                      <Stat label="New This Month"    value={stats.users.newThisMonth} />
                    </div>

                    {/* Quick Export Buttons */}
                    <div className="bg-glass-premium rounded-xl p-6 border-gold-subtle">
                      <h3 className="font-heading text-lg uppercase tracking-wider text-foreground mb-4 flex items-center gap-2"><Download size={16} />Quick Exports</h3>
                      <div className="flex flex-wrap gap-3">
                        {[
                          { label: 'Users CSV',        path: 'users'       },
                          { label: 'Payments CSV',     path: 'payments'    },
                          { label: 'Auctions CSV',     path: 'auctions'    },
                          { label: 'Revenue Report',   path: 'revenue'     },
                        ].map(e => (
                          <button key={e.path} onClick={() => exportCSV(e.path, e.path)}
                            className="px-5 py-2.5 rounded-lg border border-primary/30 text-primary font-heading uppercase tracking-wider text-xs hover:bg-primary/10 transition-all">
                            <BarChart2 size={13} className="inline mr-1.5" />{e.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* ── USERS ── */}
            {tab === 'users' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground">User <span className="text-gradient-gold">Management</span></h2>
                  <button onClick={() => exportCSV('users', 'users')} className="px-4 py-2 rounded-lg border border-primary/30 text-primary font-heading uppercase tracking-wider text-xs hover:bg-primary/10 transition-all">Export CSV</button>
                </div>
                <div className="flex gap-3 mb-5 flex-wrap">
                  <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchUsers()}
                    placeholder="Search name or email..." className="input-beast flex-1 min-w-[200px]" />
                  <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); }} className="input-beast w-40" style={{ background: 'hsl(0 0% 8%)' }}>
                    <option value="">All Roles</option>
                    {['organizer','team_owner','viewer','admin'].map(r => <option key={r} value={r} style={{ background: 'hsl(0 0% 8%)' }}>{r}</option>)}
                  </select>
                  <button onClick={fetchUsers} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs">Search</button>
                </div>
                <div className="bg-glass-premium rounded-xl border-gold-subtle overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ background: 'hsla(0,0%,8%,0.8)', borderBottom: '1px solid hsla(45,100%,51%,0.1)' }}>
                        <tr><TH>Name</TH><TH>Email</TH><TH>Role</TH><TH>Status</TH><TH>Verified</TH><TH>Joined</TH><TH>Actions</TH></tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Loading...</td></tr>
                        ) : users.length === 0 ? (
                          <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No users found</td></tr>
                        ) : users.map((u: any) => (
                          <tr key={u._id} className="border-t border-border/20 hover:bg-secondary/10 transition-colors">
                            <TD><span className="font-semibold">{u.name}</span></TD>
                            <TD><span className="text-xs font-mono">{u.email}</span></TD>
                            <TD>
                              <select value={u.role || 'viewer'} onChange={e => changeRole(u._id, e.target.value)}
                                className="text-[10px] font-heading uppercase px-2 py-1 rounded-lg border border-border/40 bg-secondary/20 text-foreground" style={{ background: 'hsl(0 0% 8%)' }}>
                                {['organizer','team_owner','viewer'].map(r => <option key={r} value={r} style={{ background: 'hsl(0 0% 8%)' }}>{r}</option>)}
                              </select>
                            </TD>
                            <TD><Badge text={u.isBlocked ? 'blocked' : 'active'} variant={u.isBlocked ? 'failed' : 'active'} /></TD>
                            <TD>{u.isVerified ? <span className="text-green-400 text-xs flex items-center gap-0.5"><CheckCircle2 size={11} />Yes</span> : <button onClick={() => verifyUser(u._id)} className="text-yellow-400 text-xs underline hover:no-underline">Verify</button>}</TD>
                            <TD><span className="text-xs text-muted-foreground">{fmtDate(u.createdAt)}</span></TD>
                            <TD>
                              <div className="flex gap-1">
                                <button onClick={() => blockUser(u._id, u.isBlocked)}
                                  className={`px-2 py-1 rounded text-[10px] font-heading uppercase transition-all ${u.isBlocked ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                                  {u.isBlocked ? 'Unblock' : 'Block'}
                                </button>
                                <button onClick={() => deleteUser(u._id)}
                                  className="px-2 py-1 rounded text-[10px] font-heading uppercase bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all">
                                  Del
                                </button>
                              </div>
                            </TD>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── ORGANIZERS ── */}
            {tab === 'organizers' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground mb-6">Organizer <span className="text-gradient-gold">Management</span></h2>
                <div className="bg-glass-premium rounded-xl border-gold-subtle overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ background: 'hsla(0,0%,8%,0.8)', borderBottom: '1px solid hsla(45,100%,51%,0.1)' }}>
                        <tr><TH>Name</TH><TH>Email</TH><TH>Plan</TH><TH>Auctions</TH><TH>Sub Status</TH><TH>Expires</TH><TH>Change Plan</TH></tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Loading...</td></tr>
                        ) : orgs.map((o: any) => {
                          const pkg = o.package;
                          const isActive = pkg && new Date(pkg.expiresAt) > new Date();
                          return (
                            <tr key={o._id} className="border-t border-border/20 hover:bg-secondary/10 transition-colors">
                              <TD><span className="font-semibold">{o.name}</span></TD>
                              <TD><span className="text-xs font-mono">{o.email}</span></TD>
                              <TD>
                                {pkg ? <span className="font-heading text-sm uppercase" style={{ color: PLAN_COLORS[pkg.packageType] }}>{pkg.packageType}</span>
                                     : <span className="text-muted-foreground text-xs">No plan</span>}
                              </TD>
                              <TD>{pkg ? `${pkg.auctionsUsed} / ${pkg.auctionsAllowed === 999 ? '∞' : pkg.auctionsAllowed}` : '—'}</TD>
                              <TD><Badge text={isActive ? 'active' : 'expired'} variant={isActive ? 'active' : 'failed'} /></TD>
                              <TD><span className="text-xs text-muted-foreground">{pkg ? fmtDate(pkg.expiresAt) : '—'}</span></TD>
                              <TD>
                                <select onChange={e => e.target.value && changePlan(o._id, e.target.value)} defaultValue=""
                                  className="text-[10px] font-heading uppercase px-2 py-1 rounded-lg border border-border/40" style={{ background: 'hsl(0 0% 8%)' }}>
                                  <option value="" style={{ background: 'hsl(0 0% 8%)' }}>Change →</option>
                                  {['starter','pro','elite'].map(p => <option key={p} value={p} style={{ background: 'hsl(0 0% 8%)' }}>{p}</option>)}
                                </select>
                              </TD>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── PAYMENTS ── */}
            {tab === 'payments' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground">Payment <span className="text-gradient-gold">Management</span></h2>
                    {totalRevenue > 0 && <p className="text-primary font-heading mt-1">Total: {fmtMoney(totalRevenue)}</p>}
                  </div>
                  <button onClick={() => exportCSV('payments', 'payments')} className="px-4 py-2 rounded-lg border border-primary/30 text-primary font-heading uppercase tracking-wider text-xs hover:bg-primary/10 transition-all">Export CSV</button>
                </div>
                <div className="bg-glass-premium rounded-xl border-gold-subtle overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ background: 'hsla(0,0%,8%,0.8)', borderBottom: '1px solid hsla(45,100%,51%,0.1)' }}>
                        <tr><TH>Transaction ID</TH><TH>Date</TH><TH>Organizer</TH><TH>Type</TH><TH>Plan</TH><TH>Amount</TH><TH>Status</TH><TH>Actions</TH></tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">Loading...</td></tr>
                        ) : payments.length === 0 ? (
                          <tr><td colSpan={8} className="text-center py-10 text-muted-foreground">No payments yet</td></tr>
                        ) : payments.map((p: any) => (
                          <tr key={p._id} className="border-t border-border/20 hover:bg-secondary/10 transition-colors">
                            <TD><span className="text-xs font-mono text-muted-foreground">{p.razorpayPaymentId || p._id.slice(-8)}{p.isDevMode && <span className="ml-1 text-yellow-400">[dev]</span>}</span></TD>
                            <TD><span className="text-xs">{fmtTime(p.createdAt)}</span></TD>
                            <TD><div><div className="font-semibold text-sm">{p.organizerId?.name || '—'}</div><div className="text-xs text-muted-foreground">{p.organizerId?.email || '—'}</div></div></TD>
                            <TD><span className="text-xs capitalize">{p.type?.replace(/_/g, ' ')}</span></TD>
                            <TD>{p.packageType ? <span className="font-heading text-xs uppercase" style={{ color: PLAN_COLORS[p.packageType] }}>{p.packageType}</span> : <span className="text-muted-foreground text-xs">—</span>}</TD>
                            <TD><span className="font-heading text-primary">{fmtMoney(p.amount)}</span></TD>
                            <TD><Badge text={p.status} /></TD>
                            <TD>
                              {p.status === 'success' && (
                                <button onClick={() => refundPayment(p._id)}
                                  className="px-2 py-1 rounded text-[10px] font-heading uppercase bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 transition-all">
                                  Refund
                                </button>
                              )}
                            </TD>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── BANK DETAILS ── */}
            {tab === 'bank' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground mb-2">Bank <span className="text-gradient-gold">Details</span></h2>
                <p className="text-muted-foreground font-display text-sm mb-6 flex items-center gap-1"><Lock size={13} />Account numbers are masked. Only admin can view this data.</p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {loading ? <div className="col-span-full text-center py-10 text-muted-foreground">Loading...</div>
                  : bankData.length === 0 ? <div className="col-span-full text-center py-10 text-muted-foreground">No bank details submitted yet</div>
                  : bankData.map((b: any) => (
                    <div key={b._id} className="bg-glass-premium rounded-xl p-5 border-gold-subtle">
                      <div className="font-heading text-sm uppercase tracking-wider text-primary mb-1">{b.organizerId?.name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground mb-3">{b.organizerId?.email}</div>
                      <div className="space-y-1.5 text-xs font-display">
                        {b.upiId && <div className="flex items-center gap-1"><Smartphone size={12} />UPI: <span className="text-foreground font-mono">{b.upiId}</span></div>}
                        {b.bankName && <div className="flex items-center gap-1"><Building size={12} />{b.bankName}</div>}
                        {b.accountNumber && <div>Acc: <span className="text-foreground font-mono">{b.accountNumber}</span></div>}
                        {b.ifscCode && <div>IFSC: <span className="text-foreground font-mono">{b.ifscCode}</span></div>}
                        {b.accountHolderName && <div>Holder: <span className="text-foreground">{b.accountHolderName}</span></div>}
                        {b.whatsapp && <div className="flex items-center gap-1"><Phone size={12} />{b.whatsapp}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── SUBSCRIPTIONS ── */}
            {tab === 'subscriptions' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground mb-6">Subscription <span className="text-gradient-gold">Analytics</span></h2>
                {!subAnal ? <div className="text-center py-10 text-muted-foreground">Loading...</div> : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <Stat label="Active Subs"  value={subAnal.activeSubs}  color="#34d399" />
                      <Stat label="Expired Subs" value={subAnal.expiredSubs} color="#ef4444" />
                      {subAnal.planDistribution?.map((p: any) => (
                        <Stat key={p._id} label={`${p._id} plan`} value={p.count} color={PLAN_COLORS[p._id]} />
                      ))}
                    </div>
                    <div className="bg-glass-premium rounded-xl p-6 border-gold-subtle mb-6">
                      <h3 className="font-heading text-lg uppercase tracking-wider text-foreground mb-4">Monthly Revenue</h3>
                      <div className="flex items-end gap-3 h-40">
                        {subAnal.revenueByMonth?.map((m: any, i: number) => {
                          const max = Math.max(...(subAnal.revenueByMonth?.map((x: any) => x.revenue) || [1]));
                          const pct = max > 0 ? (m.revenue / max) * 100 : 0;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <div className="text-[9px] text-muted-foreground font-heading">{fmtMoney(m.revenue)}</div>
                              <div className="w-full rounded-t-lg" style={{ height: `${Math.max(pct, 2)}%`, background: 'linear-gradient(180deg,hsl(45 100% 51%),hsl(40 100% 38%))' }} />
                              <div className="text-[9px] text-muted-foreground font-heading">{m.label}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => exportCSV('revenue', 'revenue')} className="px-5 py-2.5 rounded-lg border border-primary/30 text-primary font-heading uppercase tracking-wider text-xs hover:bg-primary/10 transition-all">Revenue Report CSV</button>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* ── AUCTIONS ── */}
            {tab === 'auctions' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground">Auction <span className="text-gradient-gold">Management</span></h2>
                  <button onClick={() => exportCSV('auctions', 'auctions')} className="px-4 py-2 rounded-lg border border-primary/30 text-primary font-heading uppercase tracking-wider text-xs hover:bg-primary/10 transition-all">Export CSV</button>
                </div>
                <div className="bg-glass-premium rounded-xl border-gold-subtle overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ background: 'hsla(0,0%,8%,0.8)', borderBottom: '1px solid hsla(45,100%,51%,0.1)' }}>
                        <tr><TH>Name</TH><TH>Organizer</TH><TH>Status</TH><TH>Date</TH><TH>Players</TH><TH>Teams</TH><TH>Bids</TH><TH>Join Code</TH><TH>Actions</TH></tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan={9} className="text-center py-10 text-muted-foreground">Loading...</td></tr>
                        ) : auctions.map((a: any) => (
                          <tr key={a._id} className="border-t border-border/20 hover:bg-secondary/10 transition-colors">
                            <TD><span className="font-semibold">{a.name}</span></TD>
                            <TD><div><div className="text-xs">{a.organizerId?.name}</div><div className="text-xs text-muted-foreground">{a.organizerId?.email}</div></div></TD>
                            <TD><Badge text={a.status} /></TD>
                            <TD><span className="text-xs">{fmtDate(a.date)}</span></TD>
                            <TD>{a.playerCount}</TD>
                            <TD>{a.teamCount}</TD>
                            <TD>{a.bidCount}</TD>
                            <TD><span className="font-mono text-primary font-bold tracking-widest">{a.joinCode}</span></TD>
                            <TD>
                              <div className="flex gap-1">
                                <Link href={`/auctions/${a._id}`} target="_blank" className="px-2 py-1 rounded text-[10px] font-heading uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-all">View</Link>
                                <button onClick={() => deleteAuction(a._id)} className="px-2 py-1 rounded text-[10px] font-heading uppercase bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all">Del</button>
                              </div>
                            </TD>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── GRANT PLAN (Admin free access) ── */}
            {tab === 'grant-plan' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground mb-2">
                  Grant <span className="text-gradient-gold">Plan</span>
                </h2>
                <p className="text-muted-foreground font-display text-sm mb-8">
                  Manually activate any plan for any organizer — free of charge. Admin access bypasses all payment gates.
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Grant Form */}
                  <div className="bg-glass-premium rounded-xl p-6 border-gold-subtle">
                    <h3 className="font-heading text-lg uppercase tracking-wider text-foreground mb-5 flex items-center gap-2"><Gift size={16} />Activate Plan for Organizer</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5">Organizer Email *</label>
                        <input value={grantForm.email} onChange={e => setGrantForm(p => ({ ...p, email: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl bg-secondary/20 border border-border/40 text-foreground text-sm focus:border-primary/60 focus:outline-none transition-all"
                          placeholder="organizer@email.com" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5">Plan *</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[['starter','Starter ₹2999'],['pro','Pro ₹5999'],['elite','Elite ₹9999']].map(([v, l]) => (
                            <button key={v} onClick={() => setGrantForm(p => ({ ...p, plan: v }))}
                              className={`py-2.5 rounded-xl text-xs font-heading uppercase tracking-wider transition-all ${grantForm.plan === v ? 'bg-primary text-primary-foreground glow-gold' : 'border border-border text-muted-foreground hover:bg-secondary/40'}`}>
                              {l}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5">Validity (days)</label>
                        <div className="grid grid-cols-4 gap-2">
                          {['30','90','180','365'].map(d => (
                            <button key={d} onClick={() => setGrantForm(p => ({ ...p, days: d }))}
                              className={`py-2 rounded-xl text-xs font-heading uppercase transition-all ${grantForm.days === d ? 'bg-secondary/60 text-foreground border border-primary/40' : 'border border-border text-muted-foreground hover:bg-secondary/40'}`}>
                              {d}d
                            </button>
                          ))}
                        </div>
                        <input type="number" value={grantForm.days} onChange={e => setGrantForm(p => ({ ...p, days: e.target.value }))}
                          className="mt-2 w-full px-4 py-2 rounded-xl bg-secondary/20 border border-border/40 text-foreground text-sm focus:border-primary/60 focus:outline-none transition-all"
                          placeholder="Custom days" min="1" />
                      </div>
                      <button onClick={async () => {
                        if (!grantForm.email.trim()) { alert('Email required'); return; }
                        setGrantLoading(true); setGrantResult('');
                        try {
                          const r = await api.post('/admin/grant-plan', { email: grantForm.email.trim(), plan: grantForm.plan, days: parseInt(grantForm.days) || 365 });
                          setGrantResult(`Done: ${r.data.message || 'Plan activated!'}`);
                        } catch(e: any) {
                          setGrantResult(`Error: ${e.response?.data?.error || 'Failed'}`);
                        } finally { setGrantLoading(false); }
                      }} disabled={grantLoading}
                        className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-heading uppercase tracking-widest text-sm glow-gold hover:scale-[1.02] transition-all disabled:opacity-50">
                        {grantLoading ? <><Loader2 size={14} className="inline mr-1.5 animate-spin" />Activating…</> : <><Gift size={14} className="inline mr-1.5" />Grant Plan Free</>}
                      </button>
                      {grantResult && (
                        <div className={`p-3 rounded-xl text-sm font-display ${grantResult.startsWith('Done') ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                          {grantResult}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin Privileges Info */}
                  <div className="space-y-4">
                    <div className="bg-glass-premium rounded-xl p-5 border border-purple-500/30">
                      <h4 className="font-heading text-sm uppercase tracking-wider text-purple-400 mb-4 flex items-center gap-1"><Shield size={14} />Admin Free Access</h4>
                      <div className="space-y-2 text-sm font-display">
                        {[
                          ['All auction features', 'Elite level — no payment required'],
                          ['AI Beast Assistant', 'Full access — bid advisor, team analysis, fraud detection'],
                          ['Broadcast Screen', 'Access /broadcast/:id on any auction'],
                          ['Audience Screen', 'Access /audience/:id on any auction'],
                          ['Unlimited auctions', 'No plan limit applied to admin'],
                          ['All reports & exports', 'PDF, Excel, CSV — all available'],
                          ['Team Poster Generator', 'All 3 poster types available'],
                          ['Replay & Analytics', 'Full access without Pro/Elite check'],
                          ['Custom Branding', 'Set branding for any auction'],
                          ['Sponsor Ads', 'Manage sponsors on any auction'],
                        ].map(([feat, desc]) => (
                          <div key={feat} className="flex items-start gap-2 py-1.5 border-b border-border/20">
                            <CheckCircle2 size={14} className="text-green-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <div className="text-foreground font-semibold text-xs">{feat}</div>
                              <div className="text-muted-foreground text-xs">{desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-glass-premium rounded-xl p-5 border border-yellow-500/30">
                      <h4 className="font-heading text-sm uppercase tracking-wider text-yellow-400 mb-3 flex items-center gap-1"><ClipboardList size={13} />Recent Plan Grants</h4>
                      <p className="text-muted-foreground text-xs font-display">View in Subscriptions tab → all manually granted plans are marked with source: admin</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── BEAST AI CONTROL (Admin) ── */}
            {tab === 'ai-control' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground mb-2">
                  Beast <span className="text-gradient-gold">AI</span> Control
                </h2>
                <p className="text-muted-foreground font-display text-sm mb-8">
                  Admin has full AI access on any auction — no Elite plan required.
                </p>

                {/* Auction selector */}
                <div className="bg-glass-premium rounded-xl p-5 border-gold-subtle mb-6">
                  <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-2">Select Auction ID to Analyze</label>
                  <div className="flex gap-3">
                    <input value={aiAuctionId} onChange={e => setAiAuctionId(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-secondary/20 border border-border/40 text-foreground text-sm font-mono focus:border-primary/60 focus:outline-none"
                      placeholder="Paste auction _id here" />
                  </div>
                </div>

                {/* AI Analysis Buttons */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {[
                    { type: 'bid_advice',       Icon: Lightbulb, label: 'Bid Advice',        desc: 'Analyze current player bid range' },
                    { type: 'team_analysis',    Icon: Scale, label: 'Team Strength',     desc: 'Squad ratings for all teams' },
                    { type: 'auction_summary',  Icon: BarChart3, label: 'Auction Summary',   desc: 'Total stats, bargains, overpays' },
                    { type: 'unsold_suggestions',Icon: Search, label: 'Unsold Picks',      desc: 'Best unsold players per team need' },
                    { type: 'purse_advice',     Icon: Wallet, label: 'Purse Advice',      desc: 'Per-team budget warnings' },
                    { type: 'fraud_detection',  Icon: AlertCircle, label: 'Fraud Detection',   desc: 'Suspicious bidding patterns' },
                  ].map(item => (
                    <button key={item.type} onClick={async () => {
                      if (!aiAuctionId.trim()) { alert('Paste an auction ID first'); return; }
                      setAiLoading(true);
                      try {
                        const r = await api.post('/packages/ai/analyze', { auctionId: aiAuctionId.trim(), analysisType: item.type });
                        setAiAnalysis({ type: item.type, label: item.label, data: r.data.analysis });
                      } catch(e: any) {
                        alert(e.response?.data?.error || 'Analysis failed');
                      } finally { setAiLoading(false); }
                    }} disabled={aiLoading}
                      className="bg-glass-premium rounded-xl p-4 border border-purple-500/20 text-left hover:border-purple-500/50 transition-all disabled:opacity-50">
                      <div className="text-2xl mb-2">{item.Icon && <item.Icon size={20} />}</div>
                      <div className="font-heading text-sm uppercase tracking-wider text-foreground mb-1">{item.label}</div>
                      <div className="text-xs text-muted-foreground font-display">{item.desc}</div>
                      <div className="mt-3 text-[10px] font-heading uppercase tracking-wider text-purple-400">Run Analysis →</div>
                    </button>
                  ))}
                </div>

                {/* AI Result */}
                {aiLoading && (
                  <div className="flex items-center justify-center py-12 bg-glass-premium rounded-xl border border-purple-500/20">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mr-3" />
                    <span className="text-purple-400 font-heading uppercase tracking-wider text-sm">Beast AI Analyzing...</span>
                  </div>
                )}

                {aiAnalysis && !aiLoading && (
                  <div className="bg-glass-premium rounded-xl p-6 border border-purple-500/30">
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-heading text-lg uppercase tracking-wider text-purple-400 flex items-center gap-2"><Bot size={16} />{aiAnalysis.label} Results</div>
                      <button onClick={() => setAiAnalysis(null)} className="text-muted-foreground hover:text-foreground text-xl">×</button>
                    </div>
                    <pre className="text-xs font-mono text-muted-foreground overflow-auto bg-secondary/20 rounded-xl p-4 max-h-96 whitespace-pre-wrap">
                      {JSON.stringify(aiAnalysis.data, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Admin Quick Links */}
                <div className="mt-6 grid md:grid-cols-4 gap-4">
                  {[
                    { href: '/reports', label: 'Reports', IconC: BarChart2, color: 'border-primary/30 text-primary' },
                    { href: '/broadcast/' + (aiAuctionId || '[id]'), label: 'Broadcast', IconC: Radio, color: 'border-yellow-500/30 text-yellow-400' },
                    { href: '/audience/' + (aiAuctionId || '[id]'), label: 'Audience', IconC: Eye, color: 'border-green-500/30 text-green-400' },
                    { href: '/replay/' + (aiAuctionId || '[id]'), label: 'Replay', IconC: Video, color: 'border-blue-500/30 text-blue-400' },
                  ].map(l => (
                    <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer"
                      className={`block text-center py-3 rounded-xl border font-heading uppercase tracking-wider text-xs hover:bg-secondary/20 transition-all ${l.color}`}>
                      {l.label}
                    </a>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── AUDIT LOGS ── */}
            {tab === 'logs' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground mb-6">Audit <span className="text-gradient-gold">Logs</span></h2>
                <div className="bg-glass-premium rounded-xl border-gold-subtle overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead style={{ background: 'hsla(0,0%,8%,0.8)', borderBottom: '1px solid hsla(45,100%,51%,0.1)' }}>
                        <tr><TH>Time</TH><TH>Type</TH><TH>User</TH><TH>IP</TH><TH>Details</TH></tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">Loading...</td></tr>
                        ) : logs.length === 0 ? (
                          <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">No logs yet</td></tr>
                        ) : logs.map((l: any) => (
                          <tr key={l._id} className="border-t border-border/20 hover:bg-secondary/10 transition-colors">
                            <TD><span className="text-xs text-muted-foreground whitespace-nowrap">{fmtTime(l.createdAt)}</span></TD>
                            <TD>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-heading uppercase border ${
                                l.type?.includes('failed') || l.type?.includes('blocked') ? 'border-red-500/30 bg-red-500/10 text-red-400' :
                                l.type?.includes('admin') ? 'border-purple-500/30 bg-purple-500/10 text-purple-400' :
                                l.type?.includes('login') ? 'border-green-500/30 bg-green-500/10 text-green-400' :
                                'border-border/40 bg-secondary/20 text-muted-foreground'
                              }`}>{l.type?.replace(/_/g, ' ')}</span>
                            </TD>
                            <TD><div><div className="text-xs font-semibold">{l.userName}</div><div className="text-xs text-muted-foreground">{l.userEmail}</div></div></TD>
                            <TD><span className="text-xs font-mono text-muted-foreground">{l.ip}</span></TD>
                            <TD><span className="text-xs text-muted-foreground">{l.details}</span></TD>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

// Same useSearchParams() build-time requirement as the organizer dashboard —
// see the comment there.
export default function AdminDashboardPage() {
  return (
    <Suspense fallback={null}>
      <AdminDashboard />
    </Suspense>
  );
}
