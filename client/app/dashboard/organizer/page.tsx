'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/shared/AuthGuard';
import api, { imgUrl } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { fmt, roleColors, categoryColors, roleIcons } from '@/lib/utils';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import BackButton from '@/components/shared/BackButton';
import NextStepBanner from '@/components/guide/NextStepBanner';
import InfoTip from '@/components/guide/InfoTip';
import { PackageBanner, AuctionPackageNotice } from '@/components/shared/PackageBanner';
import {
  Gavel, PlusCircle, Pencil, Users, Shield, Package, CreditCard, FileBarChart,
  Palette, Building2, Bot, Radio, MonitorPlay, History, UserCircle, Zap,
  CheckCircle2, XCircle, Lock, AlertTriangle, Link2, Bell, Trophy, PartyPopper,
  Smartphone, Banknote, ChevronUp, Trash2, Download, Save, Lightbulb, Landmark,
  Medal, Calendar, Timer, Gift, Eye, Settings, FolderOpen, Send, MessageSquare,
  Loader2, ClipboardCopy, Wallet, ShieldCheck, TrendingUp,
  Scale, Search, Siren, FileEdit, Video, MonitorSmartphone, Cast,
  FileText, QrCode,
} from 'lucide-react';

type Tab = 'auctions' | 'create' | 'players' | 'teams' | 'package' | 'payment-settings' | 'reports' | 'branding' | 'sponsors' | 'ai';

const PACKAGES_INFO: any = {
  starter: { name: 'Starter', price: '₹2,999', color: '#60a5fa', auctions: 3    },
  pro:     { name: 'Pro',     price: '₹5,999', color: '#f59e0b', auctions: 15   },
  elite:   { name: 'Elite',   price: '₹9,999', color: '#a78bfa', auctions: '∞'  },
};

function OrganizerDashboard() {
  const { user, refetch } = useAuth();

  // Fetch package and check if user needs role upgrade
  useEffect(() => {
    if (user && user.role === 'viewer') {
      fetchPackage();
    }
  }, [user]);
  const [tab, setTab] = useState<Tab>('auctions');
  const searchParams = useSearchParams();
  useEffect(() => {
    const t = searchParams?.get('tab') as Tab | null;
    if (t) setTab(t);
  }, [searchParams]);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [origin, setOrigin] = useState('');
  const [showTF, setShowTF] = useState(false);
  const [editAuction, setEditAuction] = useState<any>(null);
  const [editTeam, setEditTeam] = useState<any>(null);
  // Player editing
  const [editPlayer, setEditPlayer] = useState<any>(null);
  const [showPlayerEditModal, setShowPlayerEditModal] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Package notification banner
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Package state
  const [orgPackage, setOrgPackage] = useState<any>(null);
  const [allPackages, setAllPackages] = useState<any[]>([]);
  const [pkgLoading, setPkgLoading] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<string>('');
  const [upiModal, setUpiModal] = useState<{open:boolean,pkg:any,utrNumber:string}>({open:false,pkg:null,utrNumber:''});
  const [gpayModal, setGpayModal] = useState<{open:boolean,pkg:any}>({open:false,pkg:null});

  // Organizer payment profile (bank/UPI)
  const [payProfile, setPayProfile] = useState<any>({});
  const [payProfileLoading, setPayProfileLoading] = useState(false);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState('');

  // Branding state
  const [branding, setBranding] = useState<any>({});
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [brandingLogoFile, setBrandingLogoFile] = useState<File | null>(null);

  // Sponsors state
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [sponsorForm, setSponsorForm] = useState({ name: '', websiteUrl: '', displayOn: 'broadcast,reports' });
  const [sponsorLogoFile, setSponsorLogoFile] = useState<File | null>(null);
  const [sponsorLoading, setSponsorLoading] = useState(false);

  const [aForm, setAForm] = useState({
    name: '', description: '', date: '', bidTimer: '30', bidIncrement: '500000',
    totalPursePerTeam: '100000000', maxTeams: '10', rtmPerTeam: '2',
    rtmEnabled: true,
    registrationFee: '199', registrationFeeEnabled: false,
    teamOwnerFee: '499', teamOwnerFeeEnabled: false,
  });
  const [pForm, setPForm] = useState({ name: '', role: 'Batsman', category: 'Gold', nationality: 'Indian', age: '24', basePrice: '1000000', matches: '0', runs: '0', wickets: '0', average: '0', strikeRate: '0', economy: '0' });
  const [tForm, setTForm] = useState({ name: '', shortName: '', ownerName: '', city: '', primaryColor: '#f59e0b', maxPlayers: '15' });
  const [pImg, setPImg] = useState<File | null>(null);
  const [pImgPreview, setPImgPreview] = useState('');
  const [tLogo, setTLogo] = useState<File | null>(null);
  const [tLogoPreview, setTLogoPreview] = useState('');
  const [auctionPayStep, setAuctionPayStep] = useState<'form' | 'paying' | 'done'>('form');

  useEffect(() => {
    setOrigin(window.location.origin);
    if (!document.querySelector('script[src*="razorpay"]')) {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  useEffect(() => {
    try {
      const s = getSocket();
      s.on('auctionCreated', (d: any) => {
        if (d?.auction) setAuctions(prev => prev.some(a => a._id === d.auction._id) ? prev : [d.auction, ...prev]);
      });
      s.on('auctionStatusChanged', (d: any) => {
        if (!d?.auctionId) return;
        setAuctions(prev => prev.map(a => a._id === d.auctionId ? { ...a, status: d.status } : a));
        if (sel?._id === d.auctionId) setSel((p: any) => p ? { ...p, status: d.status } : p);
      });
      // Listen for package-granted event from admin
      s.on('package-granted', (d: any) => {
        console.log(' [OrganizerDashboard] Package granted event:', d);
        toast.success(d.message || 'Package granted by admin');
        fetchPackage();
        refetch();
      });
      return () => { 
        s.off('auctionCreated'); 
        s.off('auctionStatusChanged'); 
        s.off('package-granted');
      };
    } catch { }
  }, [sel?._id]);

  useEffect(() => {
    if (user) { fetchAuctions(); fetchPackage(); fetchPayProfile(); fetchBranding(); }
  }, [user?.role]); // Trigger on role change to ensure admin gets Elite package

  useEffect(() => {
    if (sel) { fetchPlayers(); fetchTeams(); fetchSponsors(); subscribeSocket(); }
  }, [sel?._id]);

  const fetchAuctions = async () => {
    setFetchError('');
    try {
      const r = await api.get('/auctions/my');
      const list = r.data.auctions || [];
      setAuctions(list);
      if (list.length && !sel) setSel(list[0]);
    } catch (err: any) {
      console.error('Failed to fetch auctions:', err);
      setFetchError(err.response?.data?.error || err.message || 'Failed to load auctions');
    }
  };

  const fetchPackage = async () => {
    try {
      // For admin, bypass package check - they have full access to all features
      if (user?.role === 'admin') {
        setOrgPackage({ packageType: 'elite', auctionsAllowed: 999, auctionsUsed: 0 });
        const r = await api.get('/packages');
        setAllPackages(r.data.packages || []);
        console.log('Admin user - setting Elite package');
        return;
      }
      const r = await api.get('/packages/my');
      setOrgPackage(r.data.package);
      setAllPackages(r.data.packages || []);
      console.log('Package data:', r.data.package);
      console.log('User role:', user?.role);
    } catch (err: any) {
      console.error('Failed to fetch package:', err);
    }
  };

  const fetchPayProfile = async () => {
    try {
      const r = await api.get('/packages/profile');
      setPayProfile(r.data.profile || {});
    } catch (err: any) {
      console.error('Failed to fetch payment profile:', err);
    }
  };

  const fetchBranding = async () => {
    try {
      const r = await api.get('/packages/branding');
      setBranding(r.data.branding || {});
    } catch (err: any) {
      console.error('Failed to fetch branding:', err);
    }
  };

  const fetchSponsors = async () => {
    if (!sel) return;
    try {
      const r = await api.get(`/packages/sponsors/${sel._id}`);
      setSponsors(r.data.sponsors || []);
    } catch (err: any) {
      console.error('Failed to fetch sponsors:', err);
    }
  };

  const fetchPlayers = async () => {
    if (!sel) return;
    try {
      const r = await api.get(`/auctions/${sel._id}/players`);
      setPlayers(r.data.players || []);
    } catch (err: any) {
      console.error('Failed to fetch players:', err);
    }
  };
  const fetchTeams = async () => {
    if (!sel) return;
    try {
      const r = await api.get(`/auctions/${sel._id}/teams`);
      setTeams(r.data.teams || []);
    } catch (err: any) {
      console.error('Failed to fetch teams:', err);
    }
  };

  const subscribeSocket = useCallback(() => {
    if (!sel) return;
    try {
      const s = getSocket();
      s.emit('joinAuction', { auctionId: sel._id });
      s.on('bidUpdate', () => fetchTeams());
      s.on('playerSold', (d: any) => { if (d.teams) setTeams(d.teams); fetchPlayers(); });
      s.on('teamJoined', (d: any) => { if (d.teams) setTeams(d.teams); else fetchTeams(); toast.success('A team just joined!'); });
      s.on('playerRegistered', (d: any) => {
        if (!d?.player || d.auctionId !== sel._id) return;
        setPlayers(prev => prev.some(p => p._id === d.player._id) ? prev : [...prev, d.player]);
        toast.success(`${d.player.name} just registered!`);
      });
      return () => { s.off('bidUpdate'); s.off('playerSold'); s.off('teamJoined'); s.off('playerRegistered'); };
    } catch { }
  }, [sel?._id]);

  // ── BUY PACKAGE ──────────────────────────────────────────────
  const buyPackage = async (pkgKey: string) => {
    setPkgLoading(true);
    try {
      const r = await api.post('/packages/create-order', { packageKey: pkgKey });
      if (r.data.devMode) {
        // No Razorpay configured — show UPI payment modal
        const pkgData = r.data.package || allPackages.find((p:any) => p.key === pkgKey);
        setPkgLoading(false);
        setUpiModal({ open: true, pkg: pkgData, utrNumber: '' });
        return;
      }
      if (!(window as any).Razorpay) { toast.error('Payment SDK not loaded'); setPkgLoading(false); return; }
      const pkg = r.data.package;
      const rzp = new (window as any).Razorpay({
        key: r.data.keyId,
        amount: r.data.amount,
        currency: r.data.currency,
        name: 'Beast Cricket Auction',
        description: `${pkg.name} Package`,
        image: '/beast-logo.png',
        order_id: r.data.orderId,
        theme: { color: '#f59e0b' },
        modal: { ondismiss: () => { toast.error('Payment cancelled'); setPkgLoading(false); } },
        handler: async (resp: any) => {
          await activatePackage(resp.razorpay_order_id, resp.razorpay_payment_id, resp.razorpay_signature, pkgKey, false);
        },
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to start payment');
      setPkgLoading(false);
    }
  };

  const confirmUpiPayment = async () => {
    if (!upiModal.pkg) return;
    setPkgLoading(true);
    try {
      const r = await api.post('/packages/upi-payment', {
        packageKey: upiModal.pkg.key, utrNumber: upiModal.utrNumber,
      });
      setOrgPackage(r.data.package);
      // Force refresh package data to ensure state is updated
      await fetchPackage();
      // Refresh user session to get updated role
      await refetch();
      setUpiModal({ open: false, pkg: null, utrNumber: '' });
      toast.success(`${upiModal.pkg.name} Plan activated!`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Activation failed');
    } finally { setPkgLoading(false); }
  };

  const activatePackage = async (orderId: string, payId: string, sig: string, pkgKey: string, isDev: boolean) => {
    try {
      const r = await api.post('/packages/activate', {
        razorpay_order_id: orderId, razorpay_payment_id: payId,
        razorpay_signature: sig, packageKey: pkgKey, devMode: String(isDev),
      });
      setOrgPackage(r.data.package);
      // Force refresh package data to ensure state is updated
      await fetchPackage();
      // Refresh user session to get updated role - this will trigger re-auth
      await refetch();
      toast.success(`${PACKAGES_INFO[pkgKey]?.name} package activated!`);
      // If session was invalidated, redirect to login after a short delay
      if (r.data.message && r.data.message.includes('log out')) {
        setTimeout(() => window.location.href = '/login', 2000);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Package activation failed');
    } finally { setPkgLoading(false); }
  };

  // ── SAVE PAY PROFILE ─────────────────────────────────────────
  const savePayProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayProfileLoading(true);
    try {
      const fd = new FormData();
      Object.entries(payProfile).forEach(([k, v]) => { if (typeof v === 'string') fd.append(k, v); });
      if (qrFile) fd.append('qrCode', qrFile);
      const r = await api.put('/packages/profile', fd);
      setPayProfile(r.data.profile || {});
      toast.success('Payment details saved! Players will see your UPI/bank info.');
    } catch { toast.error('Failed to save payment details'); }
    finally { setPayProfileLoading(false); }
  };

  // ── SAVE BRANDING ─────────────────────────────────────────────
  const saveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setBrandingLoading(true);
    try {
      const fd = new FormData();
      Object.entries(branding).forEach(([k, v]) => { if (typeof v === 'string') fd.append(k, v); });
      if (brandingLogoFile) fd.append('logo', brandingLogoFile);
      const r = await api.put('/packages/branding', fd);
      setBranding(r.data.branding || {});
      toast.success('Branding saved!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save branding');
    } finally { setBrandingLoading(false); }
  };

  // ── SAVE SPONSOR ─────────────────────────────────────────────
  const saveSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sel) { toast.error('Please select an auction first'); return; }
    setSponsorLoading(true);
    try {
      const fd = new FormData();
      fd.append('auctionId', sel._id);
      fd.append('name', sponsorForm.name);
      fd.append('websiteUrl', sponsorForm.websiteUrl);
      fd.append('displayOn', sponsorForm.displayOn);
      if (sponsorLogoFile) fd.append('logo', sponsorLogoFile);
      const r = await api.post('/packages/sponsors', fd);
      setSponsors(prev => [...prev, r.data.sponsor]);
      setSponsorForm({ name: '', websiteUrl: '', displayOn: 'broadcast,reports' });
      setSponsorLogoFile(null);
      toast.success('Sponsor added!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add sponsor');
    } finally { setSponsorLoading(false); }
  };

  const deleteSponsor = async (id: string) => {
    try {
      await api.delete(`/packages/sponsors/${id}`);
      setSponsors(prev => prev.filter(s => s._id !== id));
      toast.success('Sponsor deleted');
    } catch { toast.error('Failed to delete sponsor'); }
  };

  // ── AUCTION CREATION ─────────────────────────────────────────
  const saveAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aForm.name.trim()) { toast.error('Auction name required'); return; }
    if (!aForm.date) { toast.error('Date required'); return; }

    if (editAuction) {
      setLoading(true);
      try {
        const r = await api.put(`/auctions/${editAuction._id}`, {
          ...aForm,
          registrationFeeEnabled: aForm.registrationFeeEnabled,
          registrationFee: aForm.registrationFeeEnabled ? parseInt(aForm.registrationFee) : 0,
          teamOwnerFeeEnabled: aForm.teamOwnerFeeEnabled,
          teamOwnerFee: aForm.teamOwnerFeeEnabled ? parseInt(aForm.teamOwnerFee) : 0,
        });
        setAuctions(p => p.map(a => a._id === editAuction._id ? r.data.auction : a));
        if (sel?._id === editAuction._id) setSel(r.data.auction);
        toast.success('Auction updated!');
        setEditAuction(null);
        setTab('players');
        resetAForm();
      } catch (err: any) { toast.error(err.response?.data?.error || 'Failed to update'); }
      finally { setLoading(false); }
      return;
    }

    // Check package first (admin bypass)
    if (user?.role !== 'admin') {
      if (!orgPackage) {
        toast.error('Please purchase a package first to create auctions');
        setTab('package');
        return;
      }
      if (orgPackage.auctionsUsed >= orgPackage.auctionsAllowed) {
        toast.error(`Auction limit reached (${orgPackage.auctionsAllowed}). Upgrade your plan.`);
        setTab('package');
        return;
      }
    }

    setLoading(true);
    try {
      // If user has active package, create auction directly without payment
      // Only require payment if user doesn't have a package or limit is reached (checked above)
      const r = await api.post('/auctions', {
        ...aForm,
        registrationFeeEnabled: aForm.registrationFeeEnabled,
        registrationFee: aForm.registrationFeeEnabled ? parseInt(aForm.registrationFee) : 0,
        teamOwnerFeeEnabled: aForm.teamOwnerFeeEnabled,
        teamOwnerFee: aForm.teamOwnerFeeEnabled ? parseInt(aForm.teamOwnerFee) : 0,
      });
      const newAuction = r.data.auction;
      setAuctions(p => [newAuction, ...p]);
      setSel(newAuction);
      // Refresh package to show updated count
      fetchPackage();
      toast.success('Auction created!');
      setTab('players');
      resetAForm();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create auction');
    } finally { setLoading(false); }
  };

  const finalizeAuction = async (orderId: string, payId: string, sig: string, isDev: boolean) => {
    try {
      const r = await api.post('/payment/verify-and-create-auction', {
        razorpay_order_id: orderId, razorpay_payment_id: payId, razorpay_signature: sig,
        devMode: String(isDev), ...aForm,
        registrationFeeEnabled: String(aForm.registrationFeeEnabled),
        registrationFee: aForm.registrationFeeEnabled ? aForm.registrationFee : '0',
        teamOwnerFeeEnabled: String(aForm.teamOwnerFeeEnabled),
        teamOwnerFee: aForm.teamOwnerFeeEnabled ? aForm.teamOwnerFee : '0',
      });
      const newAuction = r.data.auction;
      setAuctions(p => [newAuction, ...p]);
      setSel(newAuction);
      setAuctionPayStep('done');
      // Refresh package to show updated count
      fetchPackage();
      toast.success('Auction created!');
      setTimeout(() => { setAuctionPayStep('form'); setTab('players'); resetAForm(); }, 2500);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Auction creation failed');
      setAuctionPayStep('form');
    } finally { setLoading(false); }
  };

  const resetAForm = () => setAForm({ name: '', description: '', date: '', bidTimer: '30', bidIncrement: '500000', totalPursePerTeam: '100000000', maxTeams: '10', rtmPerTeam: '2', rtmEnabled: true, registrationFee: '199', registrationFeeEnabled: false, teamOwnerFee: '499', teamOwnerFeeEnabled: false });

  const deleteAuction = async (id: string) => {
    if (!confirm('Delete this auction and ALL its data?')) return;
    try { await api.delete(`/auctions/${id}`); setAuctions(p => p.filter(a => a._id !== id)); if (sel?._id === id) { setSel(null); setPlayers([]); setTeams([]); } toast.success('Deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  const startEdit = (a: any) => {
    setEditAuction(a);
    setAForm({ name: a.name, description: a.description || '', date: a.date ? new Date(a.date).toISOString().slice(0, 16) : '', bidTimer: String(a.bidTimer), bidIncrement: String(a.bidIncrement), totalPursePerTeam: String(a.totalPursePerTeam), maxTeams: String(a.maxTeams || 10), rtmPerTeam: String(a.rtmPerTeam || 2), rtmEnabled: a.rtmEnabled !== false, registrationFee: String(a.registrationFee || 199), registrationFeeEnabled: a.registrationFeeEnabled === true, teamOwnerFee: String(a.teamOwnerFee || 499), teamOwnerFeeEnabled: a.teamOwnerFeeEnabled === true });
    setAuctionPayStep('form');
    setTab('create');
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sel) return;
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(pForm).forEach(([k, v]) => fd.append(k, v));
      if (pImg) fd.append('image', pImg);
      const r = await api.post(`/auctions/${sel._id}/players`, fd);
      setPlayers(p => [...p, r.data.player]);
      toast.success('Player added!');
      setPForm({ name: '', role: 'Batsman', category: 'Gold', nationality: 'Indian', age: '24', basePrice: '1000000', matches: '0', runs: '0', wickets: '0', average: '0', strikeRate: '0', economy: '0' });
      setPImg(null); setPImgPreview('');
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to add player'); }
    finally { setLoading(false); }
  };

  const deletePlayer = async (pid: string) => {
    if (!sel || !confirm('Delete this player?')) return;
    try { await api.delete(`/auctions/${sel._id}/players/${pid}`); setPlayers(p => p.filter(x => x._id !== pid)); toast.success('Deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  const startEditPlayer = (p: any) => {
    setEditPlayer({ ...p });
    setPForm({
      name: p.name || '',
      role: p.role || 'Batsman',
      category: p.category || 'Gold',
      nationality: p.nationality || 'Indian',
      age: String(p.age || '24'),
      basePrice: String(p.basePrice || '1000000'),
      matches: String(p.stats?.matches || '0'),
      runs: String(p.stats?.runs || '0'),
      wickets: String(p.stats?.wickets || '0'),
      average: String(p.stats?.average || '0'),
      strikeRate: String(p.stats?.strikeRate || '0'),
      economy: String(p.stats?.economy || '0'),
    });
    setPImg(null);
    setPImgPreview(p.imageUrl ? `/api/img?url=${encodeURIComponent(p.imageUrl)}` : '');
    setShowPlayerEditModal(true);
  };

  const updatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sel || !editPlayer) return;
    setLoading(true);
    try {
      const fd = new FormData();
      const { matches, runs, wickets, average, strikeRate, economy, ...rest } = pForm;
      Object.entries(rest).forEach(([k, v]) => fd.append(k, v));
      fd.append('stats', JSON.stringify({ matches: +matches, runs: +runs, wickets: +wickets, average: +average, strikeRate: +strikeRate, economy: +economy }));
      if (pImg) fd.append('image', pImg);
      const r = await api.put(`/auctions/${sel._id}/players/${editPlayer._id}`, fd);
      setPlayers(p => p.map(x => x._id === editPlayer._id ? r.data.player : x));
      toast.success('Player updated!');
      setShowPlayerEditModal(false);
      setEditPlayer(null);
      setPImg(null); setPImgPreview('');
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to update player'); }
    finally { setLoading(false); }
  };

  const saveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sel) return;
    setLoading(true);
    try {
      if (editTeam) {
        const r = await api.put(`/auctions/${sel._id}/teams/${editTeam._id}`, tForm);
        setTeams(p => p.map(t => t._id === editTeam._id ? r.data.team : t));
        toast.success('Updated!'); setEditTeam(null);
      } else {
        const fd = new FormData();
        Object.entries(tForm).forEach(([k, v]) => fd.append(k, v));
        if (tLogo) fd.append('logo', tLogo);
        const r = await api.post(`/auctions/${sel._id}/teams`, fd);
        setTeams(p => [...p, r.data.team]); toast.success('Team created!');
      }
      setTForm({ name: '', shortName: '', ownerName: '', city: '', primaryColor: '#f59e0b', maxPlayers: '15' });
      setTLogo(null); setTLogoPreview(''); setShowTF(false);
    } catch (e: any) { toast.error(e.response?.data?.error || 'Failed to save team'); }
    finally { setLoading(false); }
  };

  const deleteTeam = async (tid: string) => {
    if (!sel || !confirm('Delete this team?')) return;
    try { await api.delete(`/auctions/${sel._id}/teams/${tid}`); setTeams(p => p.filter(t => t._id !== tid)); toast.success('Deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  const startEditTeam = (team: any) => {
    setEditTeam(team);
    setTForm({ name: team.name, shortName: team.shortName, ownerName: team.ownerName || '', city: team.city || '', primaryColor: team.primaryColor || '#f59e0b', maxPlayers: String(team.maxPlayers || 15) });
    setShowTF(true);
  };

  const INP = "input-beast";
  const LBL = "block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5";
  const registrationLink = sel ? `${origin || (typeof window !== 'undefined' ? window.location.origin : '')}/auctions/${sel._id}/register-player` : '';

  const PlayerFormFields = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
      <div className="col-span-2 md:col-span-1"><label className={LBL}>Name *</label><input value={pForm.name} onChange={e => setPForm(p => ({ ...p, name: e.target.value }))} className={INP} placeholder="Player name" required /></div>
      <div><label className={LBL}>Role *</label>
        <select value={pForm.role} onChange={e => setPForm(p => ({ ...p, role: e.target.value }))} className={INP} style={{ background: 'hsl(0 0% 8%)' }}>
          {['Batsman', 'Bowler', 'AllRounder', 'WicketKeeper', 'Other'].map(r => <option key={r} value={r} style={{ background: 'hsl(0 0% 8%)' }}>{r}</option>)}
        </select>
      </div>
      <div><label className={LBL}>Category *</label>
        <select value={pForm.category} onChange={e => setPForm(p => ({ ...p, category: e.target.value }))} className={INP} style={{ background: 'hsl(0 0% 8%)' }}>
          {['Elite', 'Gold', 'Silver', 'Emerging'].map(c => <option key={c} value={c} style={{ background: 'hsl(0 0% 8%)' }}>{c}</option>)}
        </select>
      </div>
      <div><label className={LBL}>Nationality</label><input value={pForm.nationality} onChange={e => setPForm(p => ({ ...p, nationality: e.target.value }))} className={INP} placeholder="Indian" /></div>
      <div><label className={LBL}>Age</label><input type="number" value={pForm.age} onChange={e => setPForm(p => ({ ...p, age: e.target.value }))} className={INP} placeholder="24" /></div>
      <div><label className={LBL}>Base Price (₹) *</label><input type="number" value={pForm.basePrice} onChange={e => setPForm(p => ({ ...p, basePrice: e.target.value }))} className={INP} required /></div>
      <div><label className={LBL}>Matches</label><input type="number" value={pForm.matches} onChange={e => setPForm(p => ({ ...p, matches: e.target.value }))} className={INP} /></div>
      <div><label className={LBL}>Runs</label><input type="number" value={pForm.runs} onChange={e => setPForm(p => ({ ...p, runs: e.target.value }))} className={INP} /></div>
      <div><label className={LBL}>Wickets</label><input type="number" value={pForm.wickets} onChange={e => setPForm(p => ({ ...p, wickets: e.target.value }))} className={INP} /></div>
      <div><label className={LBL}>Average</label><input type="number" step="0.01" value={pForm.average} onChange={e => setPForm(p => ({ ...p, average: e.target.value }))} className={INP} /></div>
      <div><label className={LBL}>Strike Rate</label><input type="number" step="0.01" value={pForm.strikeRate} onChange={e => setPForm(p => ({ ...p, strikeRate: e.target.value }))} className={INP} /></div>
      <div><label className={LBL}>Photo</label>
        <input type="file" accept="image/*" onChange={e => {
          const file = e.target.files?.[0] || null;
          setPImg(file);
          if (file) { const reader = new FileReader(); reader.onload = ev => setPImgPreview(ev.target?.result as string); reader.readAsDataURL(file); } else { setPImgPreview(''); }
        }} className="w-full text-muted-foreground text-xs file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-heading file:text-xs cursor-pointer hover:file:bg-primary/20" />
        {pImgPreview && (
          <div className="mt-2 rounded-lg overflow-hidden border border-primary/20" style={{ width: 80, height: 80 }}>
            <img src={pImgPreview} alt="Preview" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    </div>
  );

  // Package status bar (admin bypass)
  // Admin detection: check role OR email as fallback
  const ADMIN_EMAILS = ['hirishidraj07@gmail.com', 'hirishi2020@gmail.com'];
  const isAdmin = user?.role === 'admin' || (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
  const pkgInfo = orgPackage ? PACKAGES_INFO[orgPackage.packageType] : null;
  const pkgPercent = orgPackage ? Math.min(100, orgPackage.auctionsAllowed >= 999 ? Math.min(100, orgPackage.auctionsUsed * 10) : Math.round((orgPackage.auctionsUsed / Math.max(1, orgPackage.auctionsAllowed)) * 100)) : 0;
  // Admin always has Pro and Elite access regardless of package state
  const isPro    = isAdmin || ['pro','elite'].includes(orgPackage?.packageType);
  const isElite  = isAdmin || orgPackage?.packageType === 'elite';

  // Debug logging for admin package issue
  useEffect(() => {
    console.log('🔍 Admin Package Debug:', {
      userEmail: user?.email,
      userRole: user?.role,
      isAdmin,
      isAdminByEmail: user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()),
      orgPackage: orgPackage?.packageType,
      isPro,
      isElite
    });
  }, [user?.email, user?.role, orgPackage, isAdmin, isPro, isElite]);

  return (
    <AuthGuard roles={['organizer', 'admin']}>
      <div className="flex h-screen overflow-hidden bg-background">

        {/* SIDEBAR */}
        <div className="w-56 flex-shrink-0 flex flex-col h-full border-r" style={{ background: 'hsl(0 0% 5%)', borderColor: 'hsla(45,100%,51%,0.12)' }}>
          <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'hsla(45,100%,51%,0.1)' }}>
            <Link href="/"><img src="/beast-logo.png" alt="Beast" className="w-9 h-9 object-contain" style={{ filter: 'drop-shadow(0 0 8px hsla(45,100%,51%,0.5))' }} /></Link>
            <div>
              <div className="font-heading text-sm uppercase tracking-[0.15em] text-gradient-gold leading-none">Beast Cricket</div>
              <div className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground mt-0.5">Organizer</div>
            </div>
          </div>

          {user && (
            <div className="mx-3 mt-3 p-3 rounded-lg bg-glass-navy">
              <div className="text-[9px] font-heading uppercase tracking-wider text-muted-foreground mb-0.5">Organizer</div>
              <div className="font-display font-semibold text-foreground text-sm truncate">{user.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
            </div>
          )}

          {/* Package status in sidebar (admin bypass) */}
          {orgPackage && pkgInfo && !isAdmin && (
            <div className="mx-3 mt-2 p-2.5 rounded-lg border" style={{ background: pkgInfo.color + '12', borderColor: pkgInfo.color + '40' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-heading uppercase tracking-wider flex items-center gap-1" style={{ color: pkgInfo.color }}><Medal size={12} aria-hidden="true" /> {pkgInfo.name}</span>
                <span className="text-[9px] font-heading text-muted-foreground">{orgPackage.auctionsUsed}/{orgPackage.auctionsAllowed === 999 ? '∞' : orgPackage.auctionsAllowed}</span>
              </div>
              <div className="w-full h-1 bg-background/50 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pkgPercent}%`, background: pkgInfo.color }} />
              </div>
              <div className="text-[8px] text-muted-foreground mt-1">auctions used</div>
            </div>
          )}
          {!orgPackage && !isAdmin && (
            <button onClick={() => setTab('package')} className="mx-3 mt-2 p-2.5 rounded-lg text-[10px] font-heading uppercase tracking-wider text-center border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition-all flex items-center justify-center gap-1.5">
              <Zap size={14} aria-hidden="true" /> Buy Package
            </button>
          )}

          <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
            {([
              { id: 'auctions', icon: Gavel, label: 'My Auctions' },
              { id: 'create', icon: editAuction ? Pencil : PlusCircle, label: editAuction ? 'Edit Auction' : 'Create Auction' },
              { id: 'players', icon: Users, label: 'Players' },
              { id: 'teams', icon: Shield, label: 'Teams' },
              { id: 'package', icon: Package, label: 'My Package' },
              { id: 'payment-settings', icon: CreditCard, label: 'Payment Setup' },
              { id: 'reports', icon: FileBarChart, label: 'Reports' },
            ] as any[]).map(n => (
              <button key={n.id} onClick={() => { setTab(n.id); if (n.id !== 'create') setEditAuction(null); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-display font-semibold transition-all text-left ${tab === n.id ? 'bg-primary/15 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'}`}>
                <n.icon size={18} aria-hidden="true" /><span>{n.label}</span>
              </button>
            ))}
            {/* Elite-only nav items */}
            {isElite && (
              <div className="pt-2 border-t border-border/20 mt-2 space-y-0.5">
                <p className="text-[9px] font-heading uppercase tracking-widest text-purple-400 px-3 py-1">Elite Features</p>
                {([
                  { id: 'branding', icon: Palette, label: 'Custom Branding' },
                  { id: 'sponsors', icon: Building2, label: 'Sponsors' },
                  { id: 'ai', icon: Bot, label: 'Beast AI' },
                ] as any[]).map(n => (
                  <button key={n.id} onClick={() => setTab(n.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-display font-semibold transition-all text-left ${tab === n.id ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20' : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'}`}>
                    <n.icon size={18} aria-hidden="true" /><span>{n.label}</span>
                  </button>
                ))}
              </div>
            )}

            {auctions.length > 0 && (
              <div className="pt-3">
                <p className="text-[9px] font-heading uppercase tracking-widest text-muted-foreground px-3 mb-1.5">Active Auction</p>
                <select value={sel?._id || ''} onChange={e => setSel(auctions.find(a => a._id === e.target.value))}
                  className="input-beast text-xs py-2" style={{ background: 'hsl(0 0% 8%)' }}>
                  {auctions.map(a => <option key={a._id} value={a._id} style={{ background: 'hsl(0 0% 8%)' }}>{a.name}</option>)}
                </select>
              </div>
            )}

            <div className="pt-2 space-y-0.5 border-t border-border/30 mt-2">
              {sel && (
                <>
                  <Link href={`/auctions/${sel._id}`}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-heading uppercase tracking-wider transition-all"
                    style={{ background: 'hsla(45,100%,51%,0.12)', border: '1px solid hsla(45,100%,51%,0.25)', color: 'hsl(45 100% 51%)' }}>
                    <Radio size={16} aria-hidden="true" /> Start Auction
                  </Link>
                  {isElite && (
                    <Link href={`/broadcast/${sel._id}`} target="_blank"
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-heading uppercase tracking-wider transition-all"
                      style={{ background: 'hsla(270,100%,60%,0.12)', border: '1px solid hsla(270,100%,60%,0.25)', color: 'hsl(270 100% 75%)' }}>
                      <MonitorPlay size={16} aria-hidden="true" /> Broadcast
                    </Link>
                  )}
                  {isPro && (
                    <Link href={`/replay/${sel._id}`}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-heading uppercase tracking-wider transition-all"
                      style={{ background: 'hsla(210,100%,55%,0.12)', border: '1px solid hsla(210,100%,55%,0.25)', color: 'hsl(210 100% 70%)' }}>
                      <History size={16} aria-hidden="true" /> Replay
                    </Link>
                  )}
                </>
              )}
              <Link href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-display font-semibold text-muted-foreground hover:bg-secondary/40 hover:text-foreground transition-all">
                <UserCircle size={18} aria-hidden="true" /><span>Profile</span>
              </Link>
            </div>
          </nav>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 overflow-auto relative">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "url('/bg-organizer.png')", backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.3 }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg,hsl(0 0% 0% / 0.4) 0%,hsl(0 0% 0% / 0.6) 100%)' }} />
          <div className="relative p-7">
            <div className="mb-4"><BackButton href="/organizer-home" label="Organizer Home" /></div>
            <NextStepBanner />
            {/* ── PLAN FEATURE LOCK BANNER (admin bypass) ── */}
            {orgPackage && !bannerDismissed && !isAdmin && (
              <PackageBanner
                orgPackage={orgPackage}
                onUpgrade={() => setTab('package')}
                onDismiss={() => setBannerDismissed(true)}
              />
            )}
            {orgPackage && bannerDismissed && !isAdmin && (
              <div className="mb-4 flex items-center gap-3 px-4 py-2 rounded-xl border" style={{ background: PACKAGES_INFO[orgPackage.packageType]?.color + '08', borderColor: PACKAGES_INFO[orgPackage.packageType]?.color + '30' }}>
                <Medal size={16} style={{ color: PACKAGES_INFO[orgPackage.packageType]?.color }} aria-hidden="true" />
                <span className="font-heading text-xs uppercase tracking-wider flex-1" style={{ color: PACKAGES_INFO[orgPackage.packageType]?.color }}>{PACKAGES_INFO[orgPackage.packageType]?.name} Plan</span>
                <span className="text-muted-foreground text-xs font-display">{orgPackage.auctionsAllowed >= 999 ? '∞' : Math.max(0, orgPackage.auctionsAllowed - orgPackage.auctionsUsed)} auctions remaining</span>
                <button onClick={() => setTab('package')} className="text-xs font-heading uppercase tracking-wider px-2 py-1 rounded border border-border text-muted-foreground hover:text-foreground transition-all">
                  {orgPackage.packageType !== 'elite' ? <span className="inline-flex items-center gap-1">Upgrade <ChevronUp size={10} /></span> : 'Plan'}
                </button>
              </div>
            )}
            {!orgPackage && !isAdmin && (
              <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/08">
                <AlertTriangle size={20} className="text-yellow-400" aria-hidden="true" />
                <div className="flex-1">
                  <span className="font-heading text-sm uppercase tracking-wider text-yellow-400">No Plan</span>
                  <span className="text-muted-foreground text-xs font-display ml-2">Purchase a plan to create auctions</span>
                </div>
                <button onClick={() => setTab('package')} className="text-xs font-heading uppercase tracking-wider px-3 py-1.5 rounded-lg bg-primary text-primary-foreground glow-gold transition-all">Buy Plan →</button>
              </div>
            )}

            {tab === 'auctions' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between mb-7">
                  <div>
                    <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground">My <span className="text-gradient-gold">Auctions</span></h2>
                    <p className="font-display text-muted-foreground text-sm mt-0.5">{auctions.length} auction{auctions.length !== 1 ? 's' : ''}</p>
                  </div>
                  <button onClick={() => { setEditAuction(null); setTab('create'); }} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold hover:scale-[1.02] transition-all">+ Create Auction</button>
                </div>

                {!orgPackage && (
                  <div className="mb-6 p-5 rounded-xl border border-yellow-500/40 bg-yellow-500/10 flex items-start gap-4">
                    <Package size={32} className="text-yellow-400" aria-hidden="true" />
                    <div className="flex-1">
                      <div className="font-heading text-lg uppercase tracking-wider text-yellow-400 mb-1">No Active Package</div>
                      <p className="text-muted-foreground text-sm font-display">Purchase a package to start creating auctions. Plans start at ₹2,999/year.</p>
                    </div>
                    <button onClick={() => setTab('package')} className="px-5 py-2 rounded-lg bg-yellow-500 text-black font-heading uppercase tracking-wider text-xs hover:bg-yellow-400 transition-all flex-shrink-0">Buy Plan →</button>
                  </div>
                )}

                {auctions.length === 0 ? (
                  <div className="text-center py-24 bg-glass-navy rounded-xl border-gold-subtle">
                    <Gavel size={48} className="mx-auto mb-4 text-muted-foreground" aria-hidden="true" />
                    <h3 className="font-heading text-2xl uppercase tracking-wider text-foreground mb-2">No Auctions Yet</h3>
                    <p className="font-display text-muted-foreground text-sm mb-6">Create your first auction to get started</p>
                    <button onClick={() => setTab('create')} className="px-8 py-3 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold">Create First Auction</button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {auctions.map(a => (
                      <div key={a._id} className={`bg-glass-premium rounded-xl overflow-hidden group border-gold-subtle hover:border-gold transition-all ${sel?._id === a._id ? 'border-gold glow-gold' : ''}`}>
                        <div className="h-1" style={{ background: 'linear-gradient(90deg,hsl(45 100% 51%),hsl(40 100% 38%))' }} />
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-heading text-xl uppercase tracking-[0.1em] text-foreground">{a.name}</h3>
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-heading uppercase tracking-wider border ${a.status === 'active' ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-muted bg-muted/20 text-muted-foreground'}`}>
                              {a.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block mr-1" />}{a.status}
                            </span>
                          </div>
                          <div className="text-muted-foreground text-xs font-display mb-3">
                            <div className="flex items-center gap-1.5"><Calendar size={12} aria-hidden="true" /> {a.date ? format(new Date(a.date), 'dd MMM yyyy, hh:mm a') : 'No date set'}</div>
                            <div className="flex items-center gap-1.5"><Timer size={12} aria-hidden="true" /> {a.bidTimer}s · {fmt(a.bidIncrement)} · {fmt(a.totalPursePerTeam)}/team</div>
                            <div className="mt-1">
                              {a.registrationFeeEnabled
                                ? <span className="text-green-400 inline-flex items-center gap-1"><Banknote size={12} aria-hidden="true" /> Player fee: ₹{(a.registrationFee || 0).toLocaleString('en-IN')}</span>
                                : <span className="text-muted-foreground inline-flex items-center gap-1"><Gift size={12} aria-hidden="true" /> Free registration</span>}
                            </div>
                          </div>

                          {/* ── JOIN CODE + FULL SHARE SECTION ── */}
                          <div className="rounded-xl p-4 mb-3" style={{ background: 'hsla(45,100%,51%,0.06)', border: '1px solid hsla(45,100%,51%,0.25)' }}>
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <div className="text-primary text-[9px] font-heading uppercase tracking-widest mb-0.5">Team Owner Join Code</div>
                                <div className="text-foreground font-heading font-bold tracking-[4px] text-2xl">{a.joinCode}</div>
                              </div>
                              <div className="flex flex-col gap-1">
                                <button onClick={() => { navigator.clipboard.writeText(a.joinCode); toast.success('Code copied!'); }}
                                  className="px-3 py-1.5 rounded-lg text-[10px] font-heading uppercase tracking-wider text-primary hover:bg-primary/10 transition-all border border-primary/20 inline-flex items-center gap-1"><ClipboardCopy size={12} aria-hidden="true" /> Code</button>
                                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/join/${a.joinCode}`); toast.success('Join link copied!'); }}
                                  className="px-3 py-1.5 rounded-lg text-[10px] font-heading uppercase tracking-wider text-blue-400 hover:bg-blue-500/10 transition-all border border-blue-500/20 inline-flex items-center gap-1"><Link2 size={12} aria-hidden="true" /> Link</button>
                              </div>
                            </div>
                            {/* Join Link display */}
                            <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-secondary/20">
                              <span className="text-[9px] text-muted-foreground font-mono flex-1 truncate">{typeof window !== 'undefined' ? window.location.origin : ''}/join/{a.joinCode}</span>
                            </div>
                            {/* Share buttons row */}
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              <button onClick={() => {
                                const link = `${window.location.origin}/join/${a.joinCode}`;
                                const msg = `*${a.name}* — Join as Team Owner!\n\nJoin Code: *${a.joinCode}*\nLink: ${link}\n\nRegister your team and start bidding!`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                              }} className="py-1.5 rounded-lg text-[10px] font-heading uppercase tracking-wider text-green-400 border border-green-500/30 hover:bg-green-500/10 transition-all inline-flex items-center justify-center gap-1"><MessageSquare size={12} aria-hidden="true" /> WhatsApp</button>
                              <button onClick={() => {
                                const link = `${window.location.origin}/audience/${a._id}`;
                                navigator.clipboard.writeText(link);
                                toast.success('Audience link copied!');
                              }} className="py-1.5 rounded-lg text-[10px] font-heading uppercase tracking-wider text-purple-400 border border-purple-500/30 hover:bg-purple-500/10 transition-all inline-flex items-center justify-center gap-1"><Eye size={12} aria-hidden="true" /> Audience</button>
                              {isElite && (
                                <a href={`/broadcast/${a._id}`} target="_blank" className="py-1.5 rounded-lg text-[10px] font-heading uppercase tracking-wider text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/10 transition-all text-center inline-flex items-center justify-center gap-1"><MonitorPlay size={12} aria-hidden="true" /> Broadcast</a>
                              )}
                              {!isElite && (
                                <button disabled className="py-1.5 rounded-lg text-[10px] font-heading uppercase tracking-wider text-muted-foreground border border-border/30 opacity-40 cursor-not-allowed inline-flex items-center justify-center gap-1"><MonitorPlay size={12} aria-hidden="true" /> Broadcast <Lock size={10} aria-hidden="true" /></button>
                              )}
                            </div>
                          </div>

                          {/* ── PLAYER REGISTRATION LINK (Pro/Elite) ── */}
                          {isPro ? (
                            <div className="rounded-xl p-3 mb-3" style={{ background: 'hsla(142,70%,45%,0.08)', border: '1px solid hsla(142,70%,45%,0.3)' }}>
                              <div className="text-green-400 text-[9px] font-heading uppercase tracking-widest mb-2 flex items-center gap-1"><Users size={11} aria-hidden="true" /> Player Registration Link</div>
                              <div className="flex gap-2">
                                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/auctions/${a._id}/register-player`); toast.success('Player reg link copied!'); }}
                                  className="flex-1 py-1.5 rounded-lg text-[10px] font-heading uppercase bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-all inline-flex items-center justify-center gap-1"><ClipboardCopy size={12} aria-hidden="true" /> Copy Link</button>
                                <button onClick={() => {
                                  const link = `${window.location.origin}/auctions/${a._id}/register-player`;
                                  const msg = `*${a.name}* — Player Registration\n\nRegister here: ${link}${a.registrationFeeEnabled ? `\nFee: ₹${a.registrationFee}` : '\nFree registration'}`;
                                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                                }} className="flex-1 py-1.5 rounded-lg text-[10px] font-heading uppercase bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-all inline-flex items-center justify-center gap-1"><MessageSquare size={12} aria-hidden="true" /> WhatsApp</button>
                                <button onClick={() => window.open(`${window.location.origin}/auctions/${a._id}/register-player`, '_blank')}
                                  className="px-3 py-1.5 rounded-lg text-[10px] font-heading uppercase border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-all" aria-label="Preview registration form"><Eye size={14} aria-hidden="true" /></button>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-xl p-3 mb-3 opacity-50 border border-border/20">
                              <div className="text-muted-foreground text-[9px] font-heading uppercase tracking-widest flex items-center gap-1"><Lock size={10} aria-hidden="true" /> Player Registration Form — Pro/Elite only</div>
                            </div>
                          )}

                          {/* ── STREAMING LINKS (Elite) ── */}
                          {isElite && (
                            <div className="rounded-xl p-3 mb-3" style={{ background: 'hsla(270,100%,60%,0.06)', border: '1px solid hsla(270,100%,60%,0.2)' }}>
                              <div className="text-purple-400 text-[9px] font-heading uppercase tracking-widest mb-2 flex items-center gap-1"><Cast size={11} aria-hidden="true" /> Elite Streaming</div>
                              <div className="grid grid-cols-3 gap-1.5">
                                <a href={`/streaming/${a._id}`} className="py-1.5 rounded-lg text-center text-[9px] font-heading uppercase text-purple-400 border border-purple-500/30 hover:bg-purple-500/10 transition-all">OBS</a>
                                <a href={`/streaming/${a._id}`} className="py-1.5 rounded-lg text-center text-[9px] font-heading uppercase text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all">YouTube</a>
                                <a href={`/streaming/${a._id}`} className="py-1.5 rounded-lg text-center text-[9px] font-heading uppercase text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 transition-all">Zoom</a>
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <button onClick={() => { setSel(a); setTab('players'); }} className="flex-1 py-2 rounded-lg text-[10px] font-heading uppercase tracking-wider transition-all" style={{ background: 'hsla(45,100%,51%,0.1)', border: '1px solid hsla(45,100%,51%,0.25)', color: 'hsl(45 100% 51%)' }} aria-label="Manage auction"><Settings size={14} className="inline mr-1" aria-hidden="true" />Manage</button>
                            <Link href={`/auctions/${a._id}`} className="flex-1 py-2 rounded-lg text-[10px] font-heading uppercase tracking-wider text-center transition-all" style={{ background: 'hsla(142,70%,45%,0.1)', border: '1px solid hsla(142,70%,45%,0.25)', color: 'hsl(142 70% 55%)' }}><Radio size={14} className="inline mr-1" aria-hidden="true" />Start Auction</Link>
                            <button onClick={() => startEdit(a)} className="px-3 py-2 rounded-lg text-[10px] font-heading uppercase transition-all" style={{ background: 'hsla(210,100%,55%,0.1)', border: '1px solid hsla(210,100%,55%,0.25)', color: 'hsl(210 100% 65%)' }} aria-label="Edit auction"><Pencil size={14} aria-hidden="true" /></button>
                            <button onClick={() => deleteAuction(a._id)} className="px-3 py-2 rounded-lg text-[10px] font-heading uppercase transition-all opacity-0 group-hover:opacity-100" style={{ background: 'hsla(0,84%,60%,0.1)', border: '1px solid hsla(0,84%,60%,0.25)', color: 'hsl(0 84% 65%)' }} aria-label="Delete auction"><Trash2 size={14} aria-hidden="true" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── CREATE / EDIT AUCTION ── */}
            {tab === 'create' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground mb-7">
                  {editAuction ? <span className="inline-flex items-center gap-2"><Pencil size={28} aria-hidden="true" /> Edit</span> : 'Create'} <span className="text-gradient-gold">Auction</span>
                </h2>

                {auctionPayStep === 'done' && (
                  <div className="max-w-2xl bg-glass-premium rounded-xl p-10 gold-edge border-gold-subtle text-center">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }} className="mb-4 flex justify-center"><PartyPopper size={64} className="text-primary" aria-hidden="true" /></motion.div>
                    <h3 className="font-heading text-2xl uppercase tracking-wider text-foreground mb-2">Auction Created!</h3>
                    <p className="text-green-400 text-sm font-display">Payment confirmed · Redirecting to players…</p>
                  </div>
                )}
                {auctionPayStep === 'paying' && (
                  <div className="max-w-2xl bg-glass-premium rounded-xl p-10 gold-edge border-gold-subtle text-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-6" />
                    <h3 className="font-heading text-xl uppercase tracking-wider text-foreground mb-2">Processing Payment…</h3>
                    <p className="text-muted-foreground text-sm font-display">Please complete the Razorpay checkout</p>
                  </div>
                )}

                {auctionPayStep === 'form' && (
                  <div className="max-w-2xl">
                    {/* Package quota warning (admin bypass) */}
                    {!editAuction && orgPackage && !isAdmin && (
                      <AuctionPackageNotice
                        pkgType={orgPackage.packageType}
                        onUpgrade={() => setTab('package')}
                      />
                    )}
                    {!editAuction && !orgPackage && !isAdmin && (
                      <div className="mb-5 p-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10 flex items-center gap-3">
                        <AlertTriangle size={24} className="text-yellow-400" aria-hidden="true" />
                        <div className="flex-1">
                          <div className="font-heading text-sm uppercase tracking-wider text-yellow-400">Package Required</div>
                          <div className="text-muted-foreground text-xs font-display">You need an active package to create auctions.</div>
                        </div>
                        <button onClick={() => setTab('package')} className="px-4 py-2 rounded-lg bg-yellow-500 text-black font-heading text-xs uppercase tracking-wider">Buy Plan</button>
                      </div>
                    )}
                    {!editAuction && !orgPackage && !isAdmin && (
                      <div className="flex items-start gap-3 bg-primary/10 border border-primary/25 rounded-xl px-4 py-3 mb-6">
                        <CreditCard size={24} className="mt-0.5 text-primary" aria-hidden="true" />
                        <div>
                          <p className="text-foreground font-heading text-sm uppercase tracking-wider">Platform Fee: ₹499</p>
                          <p className="text-muted-foreground text-xs font-display mt-0.5">One-time per auction · Razorpay secured · UPI / Cards / Net Banking</p>
                        </div>
                      </div>
                    )}

                    <div className="bg-glass-premium rounded-xl p-7 gold-edge border-gold-subtle">
                      <form onSubmit={saveAuction} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2"><label className={LBL}>Auction Name *</label><input value={aForm.name} onChange={e => setAForm(p => ({ ...p, name: e.target.value }))} className={INP} placeholder="IPL 2026 Season" required /></div>
                          <div className="col-span-2"><label className={LBL}>Description</label><textarea value={aForm.description} onChange={e => setAForm(p => ({ ...p, description: e.target.value }))} className={INP + ' resize-none'} rows={2} /></div>
                          <div><label className={LBL}>Date & Time *</label><input type="datetime-local" value={aForm.date} onChange={e => setAForm(p => ({ ...p, date: e.target.value }))} className={INP} required /></div>
                          <div><label className={LBL}>Bid Timer (seconds)</label><input type="number" value={aForm.bidTimer} onChange={e => setAForm(p => ({ ...p, bidTimer: e.target.value }))} className={INP} min="10" max="120" /></div>
                          <div><label className={LBL}>Bid Increment (₹)<InfoTip text="Can't be changed once teams join — pick a value that fits your purse size before sharing the join code." /></label><input type="number" value={aForm.bidIncrement} onChange={e => setAForm(p => ({ ...p, bidIncrement: e.target.value }))} className={INP} /></div>
                          <div><label className={LBL}>Purse Per Team (₹)<InfoTip text="Can't be changed once teams join — every team starts with this amount, so double check it matches your player base prices." /></label><input type="number" value={aForm.totalPursePerTeam} onChange={e => setAForm(p => ({ ...p, totalPursePerTeam: e.target.value }))} className={INP} /></div>
                          <div><label className={LBL}>Max Teams</label><input type="number" value={aForm.maxTeams} onChange={e => setAForm(p => ({ ...p, maxTeams: e.target.value }))} className={INP} /></div>
                          <div><label className={LBL}>RTM Cards / Team</label><input type="number" value={aForm.rtmPerTeam} onChange={e => setAForm(p => ({ ...p, rtmPerTeam: e.target.value }))} className={INP} min="0" max="5" /></div>
                        </div>

                        {/* ── FEE SETTINGS (Pro/Elite only) ── */}
                        {isPro ? (
                          <div className="space-y-3">
                            {/* Player Registration Fee */}
                            <div className="p-4 rounded-xl border" style={{ background: 'hsla(142,70%,45%,0.07)', borderColor: 'hsla(142,70%,45%,0.3)' }}>
                              <div className="flex items-center justify-between mb-3">
                                <div className="font-heading text-sm uppercase tracking-wider text-green-400 flex items-center gap-1.5"><Users size={14} aria-hidden="true" /> Player Registration Fee</div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input type="checkbox" checked={aForm.registrationFeeEnabled}
                                    onChange={e => setAForm(p => ({ ...p, registrationFeeEnabled: e.target.checked }))}
                                    className="sr-only peer" />
                                  <div className="w-10 h-6 bg-secondary/50 peer-focus:ring-0 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500" />
                                </label>
                              </div>
                              <p className="text-xs text-muted-foreground font-display mb-3">Players pay this fee when submitting registration. Money goes directly to your UPI/Bank — Beast Cricket takes 0%.</p>
                              {aForm.registrationFeeEnabled && (
                                <div>
                                  <label className={LBL}>Fee Amount (₹)</label>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground font-bold">₹</span>
                                    <input type="number" value={aForm.registrationFee}
                                      onChange={e => setAForm(p => ({ ...p, registrationFee: e.target.value }))}
                                      className={INP} placeholder="199" min="1" />
                                  </div>
                                  <p className="text-[10px] text-green-400 mt-1">
                                    ₹{parseInt(aForm.registrationFee||'0').toLocaleString('en-IN')} per player → your bank · <button type="button" className="text-primary underline" onClick={() => setTab('payment-settings')}>Setup UPI/Bank →</button>
                                  </p>
                                </div>
                              )}
                            </div>
                            {/* Team Owner Registration Fee */}
                            <div className="p-4 rounded-xl border" style={{ background: 'hsla(45,100%,51%,0.06)', borderColor: 'hsla(45,100%,51%,0.25)' }}>
                              <div className="flex items-center justify-between mb-3">
                                <div className="font-heading text-sm uppercase tracking-wider text-primary flex items-center gap-1.5"><Trophy size={14} aria-hidden="true" /> Team Owner Fee</div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input type="checkbox" checked={aForm.teamOwnerFeeEnabled}
                                    onChange={e => setAForm(p => ({ ...p, teamOwnerFeeEnabled: e.target.checked }))}
                                    className="sr-only peer" />
                                  <div className="w-10 h-6 bg-secondary/50 peer-focus:ring-0 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                                </label>
                              </div>
                              <p className="text-xs text-muted-foreground font-display mb-3">Team owners pay this fee to join your auction. Money goes directly to your UPI/Bank — Beast Cricket takes 0%.</p>
                              {aForm.teamOwnerFeeEnabled && (
                                <div>
                                  <label className={LBL}>Fee Amount (₹)</label>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground font-bold">₹</span>
                                    <input type="number" value={aForm.teamOwnerFee}
                                      onChange={e => setAForm(p => ({ ...p, teamOwnerFee: e.target.value }))}
                                      className={INP} placeholder="499" min="1" />
                                  </div>
                                  <p className="text-[10px] text-primary mt-1">
                                    ₹{parseInt(aForm.teamOwnerFee||'0').toLocaleString('en-IN')} per team owner → your bank · <button type="button" className="text-primary underline" onClick={() => setTab('payment-settings')}>Setup UPI/Bank →</button>
                                  </p>
                                  {!payProfile?.upiId && <p className="text-[10px] text-yellow-400 mt-1 flex items-center gap-1"><AlertTriangle size={11} aria-hidden="true" /> Please set your UPI ID in Payment Settings first</p>}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl border border-border/30 bg-secondary/10 opacity-75">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-heading text-sm uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5"><Lock size={13} aria-hidden="true" /> Fee Collection</div>
                                <p className="text-xs text-muted-foreground font-display">Player & Team Owner fee collection requires Pro or Elite plan.</p>
                              </div>
                              <button type="button" onClick={() => setTab('package')} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-heading uppercase tracking-wider border border-primary/30 hover:bg-primary/20 transition-all">Upgrade →</button>
                            </div>
                          </div>
                        )}

                        {/* RTM — Pro/Elite only (admin bypass) */}
                        {isPro ? (
                          <label className="flex items-center gap-3 cursor-pointer p-3.5 rounded-lg" style={{ background: 'hsla(0,0%,8%,0.5)', border: '1px solid hsl(0 0% 15%)' }}>
                            <input type="checkbox" checked={aForm.rtmEnabled} onChange={e => setAForm(p => ({ ...p, rtmEnabled: e.target.checked }))} className="w-4 h-4 accent-primary" />
                            <div>
                              <div className="font-heading text-sm uppercase tracking-wider text-foreground">Enable RTM (Right to Match)</div>
                              <div className="text-xs text-muted-foreground font-display mt-0.5">Teams can match winning bid to retain a player</div>
                            </div>
                          </label>
                        ) : (
                          <div className="flex items-center gap-3 p-3.5 rounded-lg opacity-50 cursor-not-allowed" style={{ background: 'hsla(0,0%,8%,0.5)', border: '1px solid hsl(0 0% 15%)' }}>
                            <div className="w-4 h-4 rounded border border-border bg-secondary/30" />
                            <div>
                              <div className="font-heading text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">RTM (Right to Match) <Lock size={12} aria-hidden="true" /></div>
                              <div className="text-xs text-muted-foreground font-display mt-0.5">Requires Pro or Elite plan · <button type="button" onClick={() => setTab('package')} className="text-primary underline">Upgrade →</button></div>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-3 pt-2">
                          <button type="submit" disabled={loading} className="flex-1 px-8 py-3.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm glow-gold hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading
                              ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />Processing…</>
                              : editAuction ? <span className="inline-flex items-center gap-2"><Pencil size={16} aria-hidden="true" /> Update Auction</span> : (orgPackage ? <span className="inline-flex items-center gap-2"><PartyPopper size={16} aria-hidden="true" /> Create Auction</span> : <span className="inline-flex items-center gap-2"><CreditCard size={16} aria-hidden="true" /> Pay ₹499 & Create</span>)
                            }
                          </button>
                          {editAuction && (
                            <button type="button" onClick={() => { setEditAuction(null); setAuctionPayStep('form'); setTab('auctions'); }} className="px-6 py-3 rounded-lg border border-primary/30 text-primary font-heading uppercase tracking-wider text-sm hover:bg-primary/10 transition-all">Cancel</button>
                          )}
                        </div>
                        {!editAuction && <p className="text-center text-xs text-muted-foreground pt-1 flex items-center justify-center gap-1"><ShieldCheck size={12} aria-hidden="true" /> Razorpay secured · 256-bit SSL · Instant activation</p>}
                      </form>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── PLAYERS ── */}
            {tab === 'players' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground">Manage <span className="text-gradient-gold">Players</span></h2>
                    {sel && <p className="font-display text-muted-foreground text-sm mt-0.5">{sel.name} · {players.length} players</p>}
                  </div>
                </div>

                {!sel ? (
                  <div className="text-center py-20 bg-glass-navy rounded-xl border-gold-subtle">
                    <Gavel size={40} className="mx-auto mb-3 text-muted-foreground" aria-hidden="true" />
                    <p className="font-display text-muted-foreground mb-4">Create or select an auction first</p>
                    <button onClick={() => setTab('auctions')} className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold">Go to My Auctions</button>
                  </div>
                ) : (
                  <>
                    {/* Shareable link */}
                    <div className="rounded-xl p-6 mb-6" style={{ background: 'linear-gradient(135deg,hsla(142,70%,45%,0.2),hsla(142,70%,45%,0.08))', border: '2px solid hsla(142,70%,45%,0.5)' }}>
                      <div className="flex items-center gap-3 mb-3">
                        <Users size={28} className="text-green-400" aria-hidden="true" />
                        <div>
                          <h3 className="font-heading text-xl uppercase tracking-wider text-green-400 font-bold">Player Registration Form</h3>
                          <p className="text-foreground text-sm font-display">
                            {sel.registrationFeeEnabled && sel.registrationFee > 0
                              ? `Players pay ₹${(sel.registrationFee || 0).toLocaleString('en-IN')} → goes directly to your account`
                              : 'Free registration — no payment needed'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-background/60 rounded-lg px-4 py-3 border-2 border-green-500/40 mb-3">
                        <input type="text" readOnly value={registrationLink} className="flex-1 bg-transparent text-foreground text-sm font-mono outline-none" onClick={e => (e.target as HTMLInputElement).select()} />
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        <button onClick={() => { navigator.clipboard.writeText(registrationLink); toast.success('Link copied! Share with players.'); }}
                          className="flex-1 min-w-[180px] px-6 py-3 rounded-lg bg-green-500 text-white font-heading uppercase tracking-wider text-sm hover:bg-green-600 transition-all inline-flex items-center justify-center gap-2"><ClipboardCopy size={16} aria-hidden="true" /> Copy Link</button>
                        <button onClick={() => registrationLink && window.open(registrationLink, '_blank')}
                          className="flex-1 min-w-[180px] px-6 py-3 rounded-lg border-2 border-green-500 text-green-400 font-heading uppercase tracking-wider text-sm hover:bg-green-500/10 transition-all inline-flex items-center justify-center gap-2"><Eye size={16} aria-hidden="true" /> Open Form</button>
                      </div>
                      {sel.registrationFeeEnabled && !payProfile.upiId && (
                        <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-400 font-display">
                          <AlertTriangle size={13} className="inline mr-1" aria-hidden="true" />You haven't set up your UPI/Bank details yet. Players won't know where to send money. <button className="underline font-semibold" onClick={() => setTab('payment-settings')}>Set up now</button>
                        </div>
                      )}
                    </div>

                    {/* Add player manually */}
                    <div className="bg-glass-premium rounded-xl p-6 gold-edge border-gold-subtle mb-6">
                      <h3 className="font-heading text-xl uppercase tracking-wider text-foreground mb-1">Add Player Manually</h3>
                      <p className="text-muted-foreground text-xs font-display mb-5">Add a player directly without the registration form</p>
                      <form onSubmit={addPlayer}>
                        <PlayerFormFields />
                        <button type="submit" disabled={loading} className="px-7 py-2.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold hover:scale-[1.02] transition-all disabled:opacity-50">
                          {loading ? 'Adding...' : '+ Add Player'}
                        </button>
                      </form>
                    </div>

                    {/* ── BULK IMPORT (Pro/Elite) ── */}
                    {isPro ? (
                      <div className="bg-glass-premium rounded-xl p-5 border border-blue-500/30 mb-6">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-heading text-base uppercase tracking-wider text-blue-400 flex items-center gap-1.5"><Download size={15} aria-hidden="true" /> Bulk Import Players</h3>
                            <p className="text-muted-foreground text-xs font-display">Import multiple players via CSV</p>
                          </div>
                          <a href="/sample-players.csv" download className="text-xs font-heading uppercase tracking-wider text-muted-foreground border border-border px-3 py-1.5 rounded-lg hover:bg-secondary/30 transition-all inline-flex items-center gap-1"><Download size={12} aria-hidden="true" /> Sample CSV</a>
                        </div>
                        <div className="flex gap-3 items-center">
                          <input type="file" accept=".csv,.txt" id="bulkImportFile"
                            onChange={async(e) => {
                              const file = e.target.files?.[0]; if (!file || !sel) return;
                              const fd = new FormData(); fd.append('file', file);
                              toast.loading('Importing players...');
                              try {
                                const r = await api.post(`/auctions/${sel._id}/players/bulk-import`, fd);
                                toast.dismiss();
                                toast.success(`Imported ${r.data.imported} players${r.data.failed > 0 ? ` · ${r.data.failed} failed` : ''}`);
                                fetchPlayers();
                                if (r.data.errors?.length) console.log('Import errors:', r.data.errors);
                              } catch(err: any) {
                                toast.dismiss();
                                toast.error(err.response?.data?.error || 'Import failed');
                              }
                              e.target.value = '';
                            }}
                            className="hidden" />
                          <label htmlFor="bulkImportFile" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer font-heading uppercase tracking-wider text-sm transition-all border-2 border-dashed border-blue-500/40 text-blue-400 hover:bg-blue-500/10">
                            <FolderOpen size={16} aria-hidden="true" /> Choose CSV File
                          </label>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2 font-display">CSV columns: Name, Role, Category, BasePrice, Age, Nationality, Matches, Runs, Wickets</p>
                      </div>
                    ) : (
                      <div className="bg-glass-premium rounded-xl p-4 border border-border/30 opacity-60 mb-6 flex items-center justify-between">
                        <div>
                          <span className="font-heading text-sm uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5"><Download size={14} aria-hidden="true" /> Bulk Import <Lock size={12} aria-hidden="true" /></span>
                          <p className="text-xs text-muted-foreground font-display mt-0.5">Requires Pro or Elite plan</p>
                        </div>
                        <button onClick={() => setTab('package')} className="text-xs font-heading uppercase tracking-wider px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/30">Upgrade →</button>
                      </div>
                    )}

                    {/* ── WHATSAPP SHARE (Pro/Elite) ── */}
                    {isPro && (
                      <div className="bg-glass-premium rounded-xl p-5 border border-green-500/30 mb-6">
                        <h3 className="font-heading text-base uppercase tracking-wider text-green-400 mb-3 flex items-center gap-1.5"><MessageSquare size={15} aria-hidden="true" /> WhatsApp Share</h3>
                        <div className="flex gap-2 flex-wrap">
                          {['invite','reminder','result'].map(type => (
                            <button key={type} onClick={async() => {
                              if (!sel) return;
                              try {
                                const r = await api.get(`/auctions/${sel._id}/whatsapp-share?type=${type}`);
                                window.open(r.data.waLink, '_blank');
                              } catch(e: any) { toast.error(e.response?.data?.error || 'Failed'); }
                            }} className="px-4 py-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/30 font-heading uppercase tracking-wider text-xs hover:bg-green-500/20 transition-all">
                              {type === 'invite' ? <span className="inline-flex items-center gap-1"><Link2 size={13} aria-hidden="true" /> Invite Teams</span> : type === 'reminder' ? <span className="inline-flex items-center gap-1"><Bell size={13} aria-hidden="true" /> Send Reminder</span> : <span className="inline-flex items-center gap-1"><Trophy size={13} aria-hidden="true" /> Share Results</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Player grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {players.map(p => (
                        <div key={p._id} className="bg-glass-premium rounded-xl overflow-hidden group border-gold-subtle hover:border-gold transition-all">
                          <div className="relative overflow-hidden" style={{ height: 144, background: 'hsl(0 0% 5%)' }}>
                            {p.imageUrl
                              ? <img src={imgUrl(p.imageUrl)} alt={p.name} className="w-full h-full object-contain object-center bg-[#0c1424]"
                                onError={e => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement)?.style.setProperty('display', 'flex'); }} />
                              : null}
                            <div className="w-full h-full flex items-center justify-center" style={{ display: p.imageUrl ? 'none' : 'flex' }}><UserCircle size={40} className="text-muted-foreground" aria-hidden="true" /></div>
                            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.85),transparent 50%)' }} />
                            <div className="absolute top-2 right-2">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-heading uppercase border ${p.status === 'sold' ? 'border-green-500/40 bg-green-500/20 text-green-400' : 'border-yellow-500/40 bg-yellow-500/20 text-yellow-400'}`}>{p.status}</span>
                            </div>
                            <button onClick={() => deletePlayer(p._id)} aria-label="Delete player" className="absolute top-2 left-2 w-6 h-6 bg-destructive/80 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><XCircle size={14} aria-hidden="true" /></button>
                            <button onClick={() => startEditPlayer(p)} aria-label="Edit player" className="absolute bottom-2 right-2 w-6 h-6 bg-blue-600/90 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Pencil size={12} aria-hidden="true" /></button>
                          </div>
                          <div className="p-2.5">
                            <div className="text-foreground text-xs font-display font-bold truncate mb-1.5">{p.name}</div>
                            <div className="flex gap-1 flex-wrap mb-1">
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-heading uppercase ${(roleColors as any)?.[p.role] || 'border-muted text-muted-foreground'}`}>{p.role}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-heading uppercase ${(categoryColors as any)?.[p.category] || 'border-muted text-muted-foreground'}`}>{p.category}</span>
                            </div>
                            <div className="text-gradient-gold font-heading font-bold text-sm">{fmt(p.basePrice)}</div>
                          </div>
                        </div>
                      ))}
                      {players.length === 0 && <div className="col-span-full text-center py-16 text-muted-foreground font-display">No players yet. Share the link above or add manually.</div>}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* ── TEAMS ── */}
            {tab === 'teams' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground">Manage <span className="text-gradient-gold">Teams</span></h2>
                    {sel && <p className="font-display text-muted-foreground text-sm mt-0.5">{sel.name} · {teams.length} teams</p>}
                  </div>
                  {sel && <button onClick={() => { setEditTeam(null); setTForm({ name: '', shortName: '', ownerName: '', city: '', primaryColor: '#f59e0b', maxPlayers: '15' }); setShowTF(v => !v); }} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold hover:scale-[1.02] transition-all inline-flex items-center gap-1.5">{showTF && !editTeam ? <><XCircle size={14} aria-hidden="true" /> Cancel</> : <><PlusCircle size={14} aria-hidden="true" /> Add Team</>}</button>}
                </div>

                <AnimatePresence>
                  {showTF && sel && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
                      <div className="bg-glass-premium rounded-xl p-6 gold-edge border-gold-subtle">
                        <h3 className="font-heading text-xl uppercase tracking-wider text-foreground mb-5 flex items-center gap-2">{editTeam ? <><Pencil size={18} aria-hidden="true" /> Edit Team</> : 'Create Team'}</h3>
                        <form onSubmit={saveTeam}>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                            <div className="col-span-2 md:col-span-1"><label className={LBL}>Team Name *</label><input value={tForm.name} onChange={e => setTForm(p => ({ ...p, name: e.target.value }))} className={INP} placeholder="Mumbai Indians" required /></div>
                            <div><label className={LBL}>Short Code *</label><input value={tForm.shortName} onChange={e => setTForm(p => ({ ...p, shortName: e.target.value.toUpperCase().slice(0, 4) }))} className={INP} placeholder="MI" maxLength={4} required /></div>
                            <div><label className={LBL}>Owner Name</label><input value={tForm.ownerName} onChange={e => setTForm(p => ({ ...p, ownerName: e.target.value }))} className={INP} /></div>
                            <div><label className={LBL}>City</label><input value={tForm.city} onChange={e => setTForm(p => ({ ...p, city: e.target.value }))} className={INP} /></div>
                            <div><label className={LBL}>Max Players</label><input type="number" value={tForm.maxPlayers} onChange={e => setTForm(p => ({ ...p, maxPlayers: e.target.value }))} className={INP} /></div>
                            <div><label className={LBL}>Color</label>
                              <div className="flex gap-2">
                                <input type="color" value={tForm.primaryColor} onChange={e => setTForm(p => ({ ...p, primaryColor: e.target.value }))} className="w-10 h-10 rounded-lg cursor-pointer p-1 border border-border bg-transparent flex-shrink-0" />
                                <input value={tForm.primaryColor} onChange={e => setTForm(p => ({ ...p, primaryColor: e.target.value }))} className={INP} />
                              </div>
                            </div>
                            {!editTeam && <div><label className={LBL}>Logo</label>
                              <input type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0] || null; setTLogo(file); if (file) { const r = new FileReader(); r.onload = ev => setTLogoPreview(ev.target?.result as string); r.readAsDataURL(file); } else setTLogoPreview(''); }}
                                className="w-full text-muted-foreground text-xs file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-heading file:text-xs cursor-pointer" />
                              {tLogoPreview && <div className="mt-2 rounded-lg overflow-hidden border border-primary/20" style={{ width: 64, height: 64 }}><img src={tLogoPreview} alt="Logo" className="w-full h-full object-cover" /></div>}
                            </div>}
                          </div>
                          <div className="flex gap-3">
                            <button type="submit" disabled={loading} className="px-7 py-2.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold hover:scale-[1.02] transition-all">
                              {loading ? 'Saving...' : editTeam ? <span className="inline-flex items-center gap-1.5"><Pencil size={14} aria-hidden="true" /> Update</span> : <span className="inline-flex items-center gap-1.5"><PlusCircle size={14} aria-hidden="true" /> Create Team</span>}
                            </button>
                            {editTeam && <button type="button" onClick={() => { setEditTeam(null); setShowTF(false); }} className="px-5 py-2.5 rounded-lg border border-primary/30 text-primary font-heading uppercase tracking-wider text-xs hover:bg-primary/10 transition-all">Cancel</button>}
                          </div>
                        </form>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {sel && (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {teams.map(team => (
                      <div key={team._id} className="bg-glass-premium rounded-xl overflow-hidden group border-gold-subtle hover:border-gold transition-all">
                        <div className="h-1" style={{ background: `linear-gradient(90deg,${team.primaryColor},${team.primaryColor}80)` }} />
                        <div className="p-5">
                          <div className="flex items-center gap-3 mb-4">
                            {team.logo
                              ? <img src={imgUrl(team.logo)} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" onError={e => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement)?.style.setProperty('display', 'flex'); }} />
                              : null}
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-black font-bold font-heading flex-shrink-0" style={{ background: `linear-gradient(135deg,${team.primaryColor},${team.primaryColor}88)`, fontSize: 18, display: team.logo ? 'none' : 'flex' }}>{team.shortName?.slice(0, 2)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-foreground font-heading text-lg uppercase tracking-wider truncate">{team.name}</div>
                              <div className="text-muted-foreground text-xs font-display">{team.ownerName || 'No owner set'}</div>
                              {team.ownerId && <div className="text-green-400 text-xs font-display mt-0.5 flex items-center gap-1"><CheckCircle2 size={11} aria-hidden="true" /> Owner joined</div>}
                            </div>
                          </div>
                          <div className="flex justify-between text-sm font-display mb-2">
                            <span className="text-muted-foreground">Purse</span>
                            <span className="text-gradient-gold font-bold">{fmt(team.purse)}</span>
                          </div>
                          <div className="w-full bg-secondary/30 rounded-full h-1.5 mb-4 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (team.purse / team.initialPurse) * 100)}%`, background: team.primaryColor }} />
                          </div>
                          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
                            <button onClick={() => startEditTeam(team)} className="flex-1 py-1.5 rounded-lg text-[10px] font-heading uppercase transition-all" style={{ background: 'hsla(210,100%,55%,0.1)', border: '1px solid hsla(210,100%,55%,0.25)', color: 'hsl(210 100% 65%)' }}><Pencil size={12} className="inline mr-1" aria-hidden="true" />Edit</button>
                            {isPro && (
                              <button onClick={() => {
                                const amt = prompt(`Team Wallet: ${team.name}\nBalance: ₹${(team.walletBalance||0).toLocaleString('en-IN')}\n\nEnter amount (+credit / -debit):`);
                                if (!amt) return;
                                const parsed = parseInt(amt);
                                if (isNaN(parsed)) { toast.error('Invalid amount'); return; }
                                const type = parsed >= 0 ? 'credit' : 'debit';
                                api.post(`/auctions/${sel!._id}/teams/${team._id}/wallet`, { type, amount: Math.abs(parsed), note: 'Manual' })
                                  .then(() => { toast.success(`Wallet ${type}ed ₹${Math.abs(parsed).toLocaleString('en-IN')}`); fetchTeams(); })
                                  .catch((e: any) => toast.error(e.response?.data?.error || 'Failed'));
                              }} className="flex-1 py-1.5 rounded-lg text-[10px] font-heading uppercase transition-all" style={{ background: 'hsla(220,100%,55%,0.1)', border: '1px solid hsla(220,100%,55%,0.25)', color: 'hsl(220 100% 65%)' }}><Wallet size={12} className="inline mr-1" aria-hidden="true" />Wallet</button>
                            )}
                            <button onClick={() => deleteTeam(team._id)} className="flex-1 py-1.5 rounded-lg text-[10px] font-heading uppercase transition-all" style={{ background: 'hsla(0,84%,60%,0.1)', border: '1px solid hsla(0,84%,60%,0.25)', color: 'hsl(0 84% 65%)' }}><Trash2 size={12} className="inline mr-1" aria-hidden="true" />Delete</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {teams.length === 0 && <div className="col-span-full text-center py-16 text-muted-foreground font-display">No teams yet. Share the join code with team owners.</div>}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── PACKAGE ── */}
            {tab === 'package' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground mb-2">My <span className="text-gradient-gold">Package</span></h2>
                <p className="text-muted-foreground font-display text-sm mb-8">Purchase a plan to unlock features. All fees go directly to your bank — Beast Cricket takes 0% commission.</p>

                {/* ── ACTIVE PLAN CARD ── */}
                {orgPackage && pkgInfo && (
                  <div className="mb-10 p-6 rounded-2xl border-2 relative overflow-hidden" style={{ borderColor: pkgInfo.color + '60', background: pkgInfo.color + '08' }}>
                    <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-10" style={{ background: pkgInfo.color }} />
                    <div className="relative flex items-start gap-5 flex-wrap">
                      <Medal size={56} style={{ color: pkgInfo.color }} aria-hidden="true" />
                      <div className="flex-1">
                        <div className="font-heading text-3xl uppercase tracking-wider mb-1" style={{ color: pkgInfo.color }}>{pkgInfo.name} Plan</div>
                        <div className="flex items-center gap-3 flex-wrap mb-4">
                          <span className="px-3 py-1 rounded-full text-xs font-heading uppercase tracking-wider bg-green-500/15 text-green-400 border border-green-500/30 inline-flex items-center gap-1"><CheckCircle2 size={12} aria-hidden="true" /> Active</span>
                          <span className="text-muted-foreground text-sm font-display">Valid until {format(new Date(orgPackage.expiresAt), 'dd MMM yyyy')}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                          {[
                            { label: 'Auctions Used', value: `${orgPackage.auctionsUsed} / ${orgPackage.auctionsAllowed >= 999 ? '∞' : orgPackage.auctionsAllowed}` },
                            { label: 'Remaining', value: orgPackage.auctionsAllowed >= 999 ? '∞' : Math.max(0, orgPackage.auctionsAllowed - orgPackage.auctionsUsed) },
                            { label: 'Plan Price', value: pkgInfo.price },
                            { label: 'Purchased', value: format(new Date(orgPackage.createdAt || orgPackage.purchasedAt || new Date()), 'dd MMM yyyy') },
                          ].map(s => (
                            <div key={s.label} className="bg-background/40 rounded-xl p-3 text-center">
                              <div className="font-heading text-lg font-bold text-foreground">{s.value}</div>
                              <div className="text-[10px] font-heading uppercase tracking-wider text-muted-foreground mt-0.5">{s.label}</div>
                            </div>
                          ))}
                        </div>
                        <div className="w-full h-2 bg-background/40 rounded-full overflow-hidden mb-1">
                          <div className="h-full rounded-full" style={{ width: `${pkgPercent}%`, background: pkgInfo.color }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground font-display">Upgrade anytime — new limits apply immediately</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── PLAN COMPARISON + BUY ── */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  {allPackages.map((pkg: any, i: number) => {
                    const isCurrent = orgPackage?.packageType === pkg.key;
                    const isUpgrade = orgPackage && !isCurrent && (['starter','pro','elite'].indexOf(pkg.key) > ['starter','pro','elite'].indexOf(orgPackage.packageType));
                    const isDowngrade = orgPackage && !isCurrent && !isUpgrade;
                    return (
                      <motion.div key={pkg.key} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                        className={`relative rounded-2xl overflow-hidden border-2 flex flex-col transition-all ${pkg.highlight && !isCurrent ? 'shadow-lg' : ''}`}
                        style={{ borderColor: isCurrent ? pkg.color : pkg.color + '40', background: `linear-gradient(160deg, ${pkg.color}08 0%, transparent 60%)` }}>
                        {/* Ribbon */}
                        {pkg.highlight && !isCurrent && (
                          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-heading uppercase tracking-widest text-black" style={{ background: pkg.color }}>Popular</div>
                        )}
                        {isCurrent && (
                          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-heading uppercase tracking-widest border" style={{ borderColor: pkg.color, color: pkg.color, background: pkg.color + '20' }}>Current</div>
                        )}
                        {/* Header */}
                        <div className="p-6 border-b" style={{ borderColor: pkg.color + '30' }}>
                          <Medal size={36} className="mb-2" style={{ color: pkg.color }} aria-hidden="true" />
                          <div className="font-heading text-2xl uppercase tracking-wider" style={{ color: pkg.color }}>{pkg.name}</div>
                          <div className="flex items-baseline gap-1 mt-2">
                            <span className="font-heading text-4xl text-foreground">₹{(pkg.price / 100).toLocaleString('en-IN')}</span>
                            <span className="text-muted-foreground text-sm font-display">/ year</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 font-display">{pkg.auctionsAllowed >= 999 ? 'Unlimited auctions' : `${pkg.auctionsAllowed} auctions per year`}</div>
                        </div>
                        {/* Features */}
                        <div className="p-5 flex-1">
                          <ul className="space-y-2">
                            {pkg.features.map((f: string) => (
                              <li key={f} className="flex items-start gap-2 text-xs font-display">
                                <CheckCircle2 size={14} className="text-green-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                                <span className="text-muted-foreground">{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        {/* Buy Button */}
                        <div className="p-5 pt-0">
                          {isCurrent ? (
                            <div className="w-full py-3 rounded-xl text-center text-sm font-heading uppercase tracking-wider border flex items-center justify-center gap-1.5" style={{ borderColor: pkg.color + '50', color: pkg.color, background: pkg.color + '15' }}><CheckCircle2 size={14} aria-hidden="true" /> Your Current Plan</div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <button onClick={() => buyPackage(pkg.key)} disabled={pkgLoading}
                                className="w-full py-3 rounded-xl text-sm font-heading uppercase tracking-widest font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                style={{ background: pkg.color, color: pkg.color === '#f59e0b' ? '#000' : '#fff', boxShadow: `0 4px 20px ${pkg.color}40` }}>
                                <CreditCard size={14} aria-hidden="true" />
                                {pkgLoading ? 'Processing…' : isUpgrade ? `Upgrade to ${pkg.name}` : `Pay with Razorpay`}
                              </button>
                              <button onClick={() => setGpayModal({ open: true, pkg })} disabled={pkgLoading}
                                className="w-full py-3 rounded-xl text-sm font-heading uppercase tracking-widest font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 border"
                                style={{ borderColor: '#34d39960', background: '#34d39910', color: '#34d399' }}>
                                <QrCode size={14} aria-hidden="true" />
                                Pay with Google Pay QR
                              </button>
                            </div>
                          )}
                          {isUpgrade && <p className="text-center text-[10px] text-muted-foreground mt-2 font-display">Upgrade anytime · Pro-rated</p>}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* ── FEATURE MATRIX ── */}
                <div className="bg-glass-premium rounded-2xl overflow-hidden border-gold-subtle mb-6">
                  <div className="p-5 border-b border-border/30">
                    <h3 className="font-heading text-lg uppercase tracking-wider text-foreground">Full Feature Comparison</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: 'hsl(0 0% 5%)' }}>
                          <th className="text-left px-5 py-3 font-heading uppercase tracking-wider text-muted-foreground w-1/2">Feature</th>
                          {['Starter ₹2,999','Pro ₹5,999','Elite ₹9,999'].map(p => (
                            <th key={p} className="px-4 py-3 font-heading uppercase tracking-wider text-muted-foreground text-center">{p}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['Auctions / Year','3','15','Unlimited'],
                          ['Teams Per Auction','20','Unlimited','Unlimited'],
                          ['Players Per Auction','300','Unlimited','Unlimited'],
                          ['Live Bidding','yes','yes','yes'],
                          ['Unsold Player Round','yes','yes','yes'],
                          ['Basic Reports','yes','yes','yes'],
                          ['RTM (Right to Match)','no','yes','yes'],
                          ['Player Registration Form','no','yes','yes'],
                          ['Player Fee Collection','no','yes','yes'],
                          ['Team Owner Fee Collection','no','yes','yes'],
                          ['Team Wallet','no','yes','yes'],
                          ['PDF Export','no','yes','yes'],
                          ['Excel Export','no','yes','yes'],
                          ['Bulk Import','no','yes','yes'],
                          ['Advanced Analytics','no','yes','yes'],
                          ['Auction Replay','no','yes','yes'],
                          ['WhatsApp Notifications','no','yes','yes'],
                          ['Organizer Squad PDF','no','yes','yes'],
                          ['Team Owner Squad PDF','no','yes','yes'],
                          ['Broadcast Screen','no','no','yes'],
                          ['Audience Screen','no','no','yes'],
                          ['Custom Branding','no','no','yes'],
                          ['Sponsor Ads','no','no','yes'],
                          ['AI Bid Advisor','no','no','yes'],
                          ['AI Team Analysis','no','no','yes'],
                          ['AI Commentary','no','no','yes'],
                          ['OBS / YouTube / Zoom','no','no','yes'],
                          ['Team Poster Generator','no','no','yes'],
                          ['Social Media Posters','no','no','yes'],
                          ['Premium Squad PDF','no','no','yes'],
                          ['Priority Support','no','no','yes'],
                        ].map(([feat, s, p, e], idx) => (
                          <tr key={feat} className={`border-t border-border/20 ${idx % 2 === 0 ? 'bg-secondary/5' : ''}`}>
                            <td className="px-5 py-2.5 font-display text-foreground">{feat}</td>
                            {[s, p, e].map((v, vi) => (
                              <td key={vi} className="px-4 py-2.5 text-center">
                                {v === 'yes' ? <CheckCircle2 size={16} className="inline text-green-400" aria-label="Included" />
                                  : v === 'no' ? <XCircle size={16} className="inline text-red-400/50" aria-label="Not included" />
                                  : <span className="font-heading text-foreground text-xs">{v}</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground font-display flex items-center justify-center gap-1"><Lock size={12} aria-hidden="true" /> Razorpay secured · UPI / Cards / Net Banking · No commission on auction fees</p>
              </motion.div>
            )}

            {/* ── REPORTS SHORTCUT ── */}
            {tab === 'reports' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground mb-7">Reports <span className="text-gradient-gold">&amp; Tools</span></h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Squad Reports */}
                  <Link href="/reports" className="bg-glass-premium rounded-xl p-5 border-gold-subtle hover:scale-[1.02] transition-all group block">
                    <FileBarChart size={28} className="mb-3 text-primary" aria-hidden="true" />
                    <div className="font-heading text-base uppercase tracking-wider text-foreground mb-1">Squad Book PDF</div>
                    <p className="text-muted-foreground text-xs font-display mb-3">Full team squad PDFs with player photos & sold prices</p>
                    <span className={`text-[9px] px-2 py-0.5 rounded border font-heading uppercase ${isPro ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}`}>{isPro ? <span className="inline-flex items-center gap-1"><CheckCircle2 size={11} aria-hidden="true" /> Enabled</span> : <span className="inline-flex items-center gap-1"><Lock size={11} aria-hidden="true" /> Pro+</span>}</span>
                  </Link>

                  {/* Advanced Analytics */}
                  { sel ? (
                    <Link href={`/analytics/${sel._id}`} className={`bg-glass-premium rounded-xl p-5 hover:scale-[1.02] transition-all group block ${isPro ? 'border border-blue-500/25' : 'border-gold-subtle opacity-60 pointer-events-none'}`}>
                      <TrendingUp size={28} className="mb-3 text-blue-400" aria-hidden="true" />
                      <div className="font-heading text-base uppercase tracking-wider text-foreground mb-1">Advanced Analytics</div>
                      <p className="text-muted-foreground text-xs font-display mb-3">Team spending charts, role analysis, top sales, unsold breakdown</p>
                      <span className={`text-[9px] px-2 py-0.5 rounded border font-heading uppercase ${isPro ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}`}>{isPro ? <span className="inline-flex items-center gap-1"><CheckCircle2 size={11} aria-hidden="true" /> Enabled</span> : <span className="inline-flex items-center gap-1"><Lock size={11} aria-hidden="true" /> Pro+</span>}</span>
                    </Link>
                  ) : (
                    <div className="bg-glass-premium rounded-xl p-5 border-gold-subtle opacity-60">
                      <TrendingUp size={28} className="mb-3 text-blue-400" aria-hidden="true" />
                      <div className="font-heading text-base uppercase tracking-wider text-foreground mb-1">Advanced Analytics</div>
                      <p className="text-xs text-muted-foreground font-display">Select an auction first</p>
                    </div>
                  ) }

                  {/* Auction Replay */}
                  {sel ? (
                    <Link href={`/replay/${sel._id}`} className={`bg-glass-premium rounded-xl p-5 hover:scale-[1.02] transition-all group block ${isPro ? 'border border-blue-500/25' : 'border-gold-subtle opacity-60 pointer-events-none'}`}>
                      <History size={28} className="mb-3 text-blue-400" aria-hidden="true" />
                      <div className="font-heading text-base uppercase tracking-wider text-foreground mb-1">Auction Replay</div>
                      <p className="text-muted-foreground text-xs font-display mb-3">Full bid-by-bid timeline for dispute resolution</p>
                      <span className={`text-[9px] px-2 py-0.5 rounded border font-heading uppercase ${isPro ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}`}>{isPro ? <span className="inline-flex items-center gap-1"><CheckCircle2 size={11} aria-hidden="true" /> Enabled</span> : <span className="inline-flex items-center gap-1"><Lock size={11} aria-hidden="true" /> Pro+</span>}</span>
                    </Link>
                  ) : (
                    <div className="bg-glass-premium rounded-xl p-5 border-gold-subtle opacity-60 block">
                      <History size={28} className="mb-3 text-blue-400" aria-hidden="true" />
                      <div className="font-heading text-base uppercase tracking-wider text-foreground mb-1">Auction Replay</div>
                      <p className="text-xs text-muted-foreground font-display">Select an auction from My Auctions first</p>
                    </div>
                  )}

                  {/* Broadcast Screen */}
                  {sel && isElite ? (
                    <Link href={`/broadcast/${sel._id}`} target="_blank" className="bg-glass-premium rounded-xl p-5 border border-purple-500/30 hover:scale-[1.02] transition-all group block">
                      <MonitorPlay size={28} className="mb-3 text-purple-400" aria-hidden="true" />
                      <div className="font-heading text-base uppercase tracking-wider text-foreground mb-1">Broadcast Screen</div>
                      <p className="text-muted-foreground text-xs font-display mb-3">TV/Projector-ready display for live events</p>
                      <span className="text-[9px] px-2 py-0.5 rounded border border-green-500/30 text-green-400 font-heading uppercase inline-flex items-center gap-1"><CheckCircle2 size={11} aria-hidden="true" /> Elite Active</span>
                    </Link>
                  ) : (
                    <div className="bg-glass-premium rounded-xl p-5 border-gold-subtle opacity-60 block">
                      <MonitorPlay size={28} className="mb-3 text-purple-400" aria-hidden="true" />
                      <div className="font-heading text-base uppercase tracking-wider text-foreground mb-1">Broadcast Screen</div>
                      <p className="text-xs text-muted-foreground font-display mb-3">{!sel ? 'Select an auction first' : 'TV/Projector display for live events'}</p>
                      <span className="text-[9px] px-2 py-0.5 rounded border border-red-500/30 text-red-400 font-heading uppercase inline-flex items-center gap-1"><Lock size={11} aria-hidden="true" /> Elite Only</span>
                    </div>
                  )}

                  {/* Audience Screen */}
                  {sel && isElite ? (
                    <Link href={`/audience/${sel._id}`} target="_blank" className="bg-glass-premium rounded-xl p-5 border border-purple-500/30 hover:scale-[1.02] transition-all group block">
                      <Users size={28} className="mb-3 text-purple-400" aria-hidden="true" />
                      <div className="font-heading text-base uppercase tracking-wider text-foreground mb-1">Audience Screen</div>
                      <p className="text-muted-foreground text-xs font-display mb-3">Public viewer screen — share link with audience</p>
                      <span className="text-[9px] px-2 py-0.5 rounded border border-green-500/30 text-green-400 font-heading uppercase inline-flex items-center gap-1"><CheckCircle2 size={11} aria-hidden="true" /> Elite Active</span>
                    </Link>
                  ) : (
                    <div className="bg-glass-premium rounded-xl p-5 border-gold-subtle opacity-60 block">
                      <Users size={28} className="mb-3 text-purple-400" aria-hidden="true" />
                      <div className="font-heading text-base uppercase tracking-wider text-foreground mb-1">Audience Screen</div>
                      <p className="text-xs text-muted-foreground font-display mb-3">{!sel ? 'Select an auction first' : 'Public view for audience members'}</p>
                      <span className="text-[9px] px-2 py-0.5 rounded border border-red-500/30 text-red-400 font-heading uppercase inline-flex items-center gap-1"><Lock size={11} aria-hidden="true" /> Elite Only</span>
                    </div>
                  )}

                  {/* Team Poster */}
                  { sel && isElite ? (
                    <Link href={`/poster/${sel._id}`} className="bg-glass-premium rounded-xl p-5 border border-purple-500/25 hover:scale-[1.02] transition-all group block">
                      <Palette size={28} className="mb-3 text-purple-400" aria-hidden="true" />
                      <div className="font-heading text-base uppercase tracking-wider text-foreground mb-1">Team Poster Generator</div>
                      <p className="text-muted-foreground text-xs font-display mb-3">Social media–ready squad & champion posters</p>
                      <span className="text-[9px] px-2 py-0.5 rounded border border-green-500/30 text-green-400 font-heading uppercase inline-flex items-center gap-1"><CheckCircle2 size={11} aria-hidden="true" /> Elite Active</span>
                    </Link>
                  ) : (
                    <div className={`bg-glass-premium rounded-xl p-5 border-gold-subtle block ${!sel ? 'opacity-60' : ''}`}>
                      <Palette size={28} className="mb-3 text-purple-400" aria-hidden="true" />
                      <div className="font-heading text-base uppercase tracking-wider text-foreground mb-1">Team Poster Generator</div>
                      <p className="text-xs text-muted-foreground font-display mb-3">{!sel ? 'Select an auction first' : 'Social media–ready posters'}</p>
                      <span className="text-[9px] px-2 py-0.5 rounded border border-red-500/30 text-red-400 font-heading uppercase inline-flex items-center gap-1"><Lock size={11} aria-hidden="true" /> Elite Only</span>
                    </div>
                  ) }
                  {/* Streaming */}
                  { sel && isElite ? (
                    <Link href={`/streaming/${sel._id}`} className="bg-glass-premium rounded-xl p-5 border border-red-500/25 hover:scale-[1.02] transition-all group block">
                      <Cast size={28} className="mb-3 text-red-400" aria-hidden="true" />
                      <div className="font-heading text-base uppercase tracking-wider text-foreground mb-1">Live Streaming</div>
                      <p className="text-muted-foreground text-xs font-display mb-3">OBS Studio, YouTube Live & Zoom setup guides</p>
                      <span className="text-[9px] px-2 py-0.5 rounded border border-green-500/30 text-green-400 font-heading uppercase inline-flex items-center gap-1"><CheckCircle2 size={11} aria-hidden="true" /> Elite Active</span>
                    </Link>
                  ) : (
                    <div className="bg-glass-premium rounded-xl p-5 border-gold-subtle opacity-60 block">
                      <Cast size={28} className="mb-3 text-red-400" aria-hidden="true" />
                      <div className="font-heading text-base uppercase tracking-wider text-foreground mb-1">Live Streaming</div>
                      <p className="text-xs text-muted-foreground font-display mb-3">{!sel ? 'Select an auction first' : 'OBS, YouTube Live, Zoom'}</p>
                      <span className="text-[9px] px-2 py-0.5 rounded border border-red-500/30 text-red-400 font-heading uppercase inline-flex items-center gap-1"><Lock size={11} aria-hidden="true" /> Elite Only</span>
                    </div>
                  ) }

                  {/* WhatsApp Notifications */}
                  {sel && isPro && (
                    <div className="bg-glass-premium rounded-xl p-5 border border-green-500/25">
                      <MessageSquare size={28} className="mb-3 text-green-400" aria-hidden="true" />
                      <div className="font-heading text-base uppercase tracking-wider text-foreground mb-3">WhatsApp Notifications</div>
                      <div className="space-y-2">
                        {[['invite','Send Invite'],['reminder','Send Reminder'],['result','Send Results']].map(([type,label]) => (
                          <button key={type} onClick={async () => {
                            try {
                              const r = await api.get(`/auctions/${sel._id}/whatsapp-share?type=${type}`);
                              window.open(r.data.waLink, '_blank');
                            } catch(e: any) { toast.error(e.response?.data?.error || 'Failed'); }
                          }} className="w-full py-2 rounded-lg border border-green-500/25 text-green-400 font-heading uppercase tracking-wider text-xs hover:bg-green-500/10 transition-all text-left px-3 flex items-center gap-2">{type === 'invite' ? <Send size={13} aria-hidden="true" /> : type === 'reminder' ? <Bell size={13} aria-hidden="true" /> : <Trophy size={13} aria-hidden="true" />}{label}</button>
                        ))}
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-3 font-display">Opens WhatsApp with pre-filled message</p>
                    </div>
                  )}

                  {/* Bulk Import */}
                  {sel && isPro && (
                    <div className="bg-glass-premium rounded-xl p-5 border border-blue-500/25">
                      <Download size={28} className="mb-3 text-blue-400" aria-hidden="true" />
                      <div className="font-heading text-base uppercase tracking-wider text-foreground mb-3">Bulk Import Players</div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5">Upload CSV File</label>
                          <input type="file" accept=".csv" id="bulkCSV" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const fd = new FormData();
                            fd.append('file', file);
                            try {
                              const r = await api.post(`/auctions/${sel._id}/players/bulk-import`, fd, { headers: { 'Content-Type': 'multipart/form-data' }});
                              toast.success(`Imported ${r.data.imported} players${r.data.failed > 0 ? `, ${r.data.failed} failed` : ''}`);
                            } catch(err: any) { toast.error(err.response?.data?.error || 'Import failed'); }
                            e.target.value = '';
                          }} />
                          <label htmlFor="bulkCSV" className="w-full py-2.5 rounded-lg border border-blue-500/30 text-blue-400 font-heading uppercase tracking-wider text-xs cursor-pointer hover:bg-blue-500/10 transition-all flex items-center justify-center gap-2"><FolderOpen size={14} aria-hidden="true" /> Choose CSV File</label>
                        </div>
                        <a href={`data:text/csv;charset=utf-8,${encodeURIComponent('name,role,category,nationality,age,basePrice,matches,runs,wickets\nVirat Kohli,Batsman,Elite,Indian,35,2000000,250,12000,10\nJasprit Bumrah,Bowler,Elite,Indian,30,1500000,150,500,300')}`}
                          download="bulk-import-template.csv"
                          className="w-full py-2 rounded-lg border border-border text-muted-foreground font-heading uppercase tracking-wider text-xs hover:bg-secondary/30 transition-all flex items-center justify-center gap-2">
                          <FileText size={14} aria-hidden="true" /> Download Template
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── CUSTOM BRANDING (Elite) ── */}
            {tab === 'branding' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground mb-2">Custom <span className="text-gradient-gold">Branding</span></h2>
                <p className="text-muted-foreground font-display text-sm mb-8">Customize your league identity — Elite feature</p>
                {!isElite ? (
                  <div className="text-center py-20 bg-glass-navy rounded-xl border border-purple-500/30">
                    <Palette size={56} className="mx-auto mb-4 text-purple-400" aria-hidden="true" />
                    <h3 className="font-heading text-2xl uppercase tracking-wider text-foreground mb-3">Elite Only</h3>
                    <p className="text-muted-foreground font-display mb-6">Custom Branding requires the Elite plan</p>
                    <button onClick={() => setTab('package')} className="px-8 py-3 rounded-lg bg-purple-600 text-white font-heading uppercase tracking-wider text-sm hover:bg-purple-700 transition-all">Upgrade to Elite →</button>
                  </div>
                ) : (
                  <div className="max-w-2xl bg-glass-premium rounded-xl p-7 border border-purple-500/30">
                    <p className="text-muted-foreground text-sm font-display mb-6">Set your league name, colors and logo. These appear on broadcasts and reports.</p>
                    <form onSubmit={saveBranding} className="space-y-4">
                      <div><label className={LBL}>League Name</label><input value={branding.leagueName || ''} onChange={e => setBranding(b => ({ ...b, leagueName: e.target.value }))} className={INP} placeholder="My Cricket League" /></div>
                      <div><label className={LBL}>Tagline</label><input value={branding.tagline || ''} onChange={e => setBranding(b => ({ ...b, tagline: e.target.value }))} className={INP} placeholder="Where legends are made" /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={LBL}>Primary Color</label><input type="color" value={branding.primaryColor || '#f59e0b'} onChange={e => setBranding(b => ({ ...b, primaryColor: e.target.value }))} className="w-full h-10 rounded-lg cursor-pointer p-1 border border-border bg-transparent" /></div>
                        <div><label className={LBL}>Secondary Color</label><input type="color" value={branding.secondaryColor || '#1e3a5f'} onChange={e => setBranding(b => ({ ...b, secondaryColor: e.target.value }))} className="w-full h-10 rounded-lg cursor-pointer p-1 border border-border bg-transparent" /></div>
                      </div>
                      <div><label className={LBL}>League Logo</label><input type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0] || null; setBrandingLogoFile(file); }} className="w-full text-muted-foreground text-xs file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-500/10 file:text-purple-400 file:font-heading file:text-xs cursor-pointer" /></div>
                      <button type="submit" disabled={brandingLoading} className="w-full py-3 rounded-xl bg-purple-600 text-white font-heading uppercase tracking-wider text-sm hover:bg-purple-700 transition-all disabled:opacity-50">{brandingLoading ? 'Saving...' : <span className="inline-flex items-center justify-center gap-1.5"><Save size={15} aria-hidden="true" /> Save Branding</span>}</button>
                    </form>
                  </div>
                )}

                {/* OBS / YouTube / Zoom Streaming info */}
                {isElite && sel && (
                  <div className="mt-6 bg-glass-premium rounded-xl p-6 border border-purple-500/20">
                    <h3 className="font-heading text-base uppercase tracking-wider text-purple-400 mb-4 flex items-center gap-1.5"><Cast size={15} aria-hidden="true" /> Live Streaming Integration</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                      {[
                        { icon: Video, name: 'OBS Studio', desc: 'Add browser source, paste Broadcast URL below to overlay your stream.' },
                        { icon: MonitorPlay, name: 'YouTube Live', desc: 'Open Broadcast Screen in Chrome, share screen to YouTube Studio.' },
                        { icon: MonitorSmartphone, name: 'Zoom Webinar', desc: 'Share Audience Screen tab in Zoom for remote audiences.' },
                      ].map(s => (
                        <div key={s.name} className="rounded-xl p-4 border border-purple-500/20 bg-purple-500/05">
                          <s.icon size={22} className="mb-2 text-purple-400" aria-hidden="true" />
                          <div className="font-heading text-sm uppercase tracking-wider text-foreground mb-2">{s.name}</div>
                          <p className="text-xs text-muted-foreground font-display">{s.desc}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-3 rounded-lg bg-secondary/20 border border-border/30">
                      <div className="text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1">Broadcast Screen URL</div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs text-primary font-mono flex-1 truncate">{typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/broadcast/{sel._id}</code>
                        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/broadcast/${sel._id}`); toast.success('URL copied!'); }}
                          className="px-3 py-1.5 rounded-lg border border-primary/30 text-primary text-xs font-heading uppercase hover:bg-primary/10 transition-all">Copy</button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── SPONSORS (Elite) ── */}
            {tab === 'sponsors' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground mb-2">Sponsor <span className="text-gradient-gold">Ads</span></h2>
                <p className="text-muted-foreground font-display text-sm mb-8">Add sponsor logos — shown on broadcast screen and reports</p>
                {!isElite ? (
                  <div className="text-center py-20 bg-glass-navy rounded-xl border border-purple-500/30">
                    <Building2 size={56} className="mx-auto mb-4 text-purple-400" aria-hidden="true" />
                    <h3 className="font-heading text-2xl uppercase tracking-wider text-foreground mb-3">Elite Only</h3>
                    <p className="text-muted-foreground font-display mb-6">Sponsor Ads require the Elite plan</p>
                    <button onClick={() => setTab('package')} className="px-8 py-3 rounded-lg bg-purple-600 text-white font-heading uppercase tracking-wider text-sm hover:bg-purple-700 transition-all">Upgrade to Elite →</button>
                  </div>
                ) : (
                  <div className="max-w-2xl">
                    <div className="bg-glass-premium rounded-xl p-7 border border-purple-500/30 mb-6">
                      <h3 className="font-heading text-lg uppercase tracking-wider text-purple-400 mb-5">Add Sponsor</h3>
                      <form onSubmit={saveSponsor} className="space-y-4">
                        <div><label className={LBL}>Sponsor Name *</label><input value={sponsorForm.name} onChange={e => setSponsorForm(s => ({ ...s, name: e.target.value }))} className={INP} placeholder="Sponsor Company Name" required /></div>
                        <div><label className={LBL}>Website URL</label><input value={sponsorForm.websiteUrl} onChange={e => setSponsorForm(s => ({ ...s, websiteUrl: e.target.value }))} className={INP} placeholder="https://sponsor.com" /></div>
                        <div><label className={LBL}>Logo</label><input type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0] || null; setSponsorLogoFile(file); }} className="w-full text-muted-foreground text-xs file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-500/10 file:text-purple-400 file:font-heading file:text-xs cursor-pointer" /></div>
                        <button type="submit" disabled={sponsorLoading} className="w-full py-3 rounded-xl bg-purple-600 text-white font-heading uppercase tracking-wider text-sm hover:bg-purple-700 transition-all disabled:opacity-50">{sponsorLoading ? 'Adding...' : '+ Add Sponsor'}</button>
                      </form>
                    </div>
                    {sponsors.length > 0 ? (
                      <div className="space-y-3">
                        {sponsors.map((s: any) => (
                          <div key={s._id} className="bg-glass-premium rounded-xl p-4 border border-purple-500/20 flex items-center gap-4">
                            {s.logoUrl && <img src={imgUrl(s.logoUrl)} alt={s.name} className="w-12 h-12 object-contain rounded-lg" />}
                            <div className="flex-1">
                              <div className="font-heading text-sm uppercase tracking-wider text-foreground">{s.name}</div>
                              {s.websiteUrl && <a href={s.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline">{s.websiteUrl}</a>}
                            </div>
                            <button onClick={() => deleteSponsor(s._id)} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 text-xs font-heading uppercase tracking-wider hover:bg-red-500/20 transition-all">Delete</button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground font-display bg-glass-navy rounded-xl border-gold-subtle">No sponsors yet. Add your first sponsor above.</div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── BEAST AI (Elite) ── */}
            {tab === 'ai' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground mb-2">Beast <span className="text-gradient-gold">AI</span> Assistant</h2>
                <p className="text-muted-foreground font-display text-sm mb-8">Real-time auction intelligence — Elite feature</p>
                {!isElite ? (
                  <div className="text-center py-20 bg-glass-navy rounded-xl border border-purple-500/30">
                    <Bot size={56} className="mx-auto mb-4 text-purple-400" aria-hidden="true" />
                    <h3 className="font-heading text-2xl uppercase tracking-wider text-foreground mb-3">Elite Only</h3>
                    <p className="text-muted-foreground font-display mb-6">AI Features require the Elite plan</p>
                    <button onClick={() => setTab('package')} className="px-8 py-3 rounded-lg bg-purple-600 text-white font-heading uppercase tracking-wider text-sm hover:bg-purple-700 transition-all">Upgrade to Elite →</button>
                  </div>
                ) : sel ? (
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {[
                        { icon: Lightbulb, title: 'Bid Advisor', desc: 'Live bid range suggestions based on player category and historical auction data', action: 'View Advisor →', color: 'border-blue-500/30', onClick: () => window.open(`/auctions/${sel._id}`, '_blank') },
                        { icon: Scale, title: 'Team Analysis', desc: 'Squad strength ratings, role gaps, and spending recommendations for all teams', action: 'View Analysis →', color: 'border-green-500/30', onClick: () => window.open(`/analytics?auctionId=${sel._id}`, '_blank') },
                        { icon: Wallet, title: 'Purse Advisor', desc: 'Per-team budget warnings and recommended max bid limits', action: 'View Advice →', color: 'border-yellow-500/30', onClick: () => window.open(`/analytics?auctionId=${sel._id}`, '_blank') },
                        { icon: Search, title: 'Value Detection', desc: 'Identify bargain purchases and overpayments during the auction', action: 'View Report →', color: 'border-primary/30', onClick: () => window.open(`/analytics?auctionId=${sel._id}`, '_blank') },
                        { icon: Siren, title: 'Fraud Detection', desc: 'Monitor suspicious bidding patterns and collusion indicators', action: 'View Report →', color: 'border-red-500/30', onClick: () => window.open(`/analytics?auctionId=${sel._id}`, '_blank') },
                        { icon: FileEdit, title: 'Auto Commentary', desc: 'AI-generated commentary for every player sold or unsold', action: 'Active during auction', color: 'border-purple-500/30', onClick: () => window.open(`/broadcast/${sel._id}`, '_blank') },
                      ].map(item => (
                        <button key={item.title} onClick={item.onClick} className={`bg-glass-premium rounded-xl p-5 border ${item.color} text-left hover:scale-[1.02] transition-all cursor-pointer`}>
                          <item.icon size={26} className="mb-3 text-foreground/80" aria-hidden="true" />
                          <h3 className="font-heading text-base uppercase tracking-wider text-foreground mb-2">{item.title}</h3>
                          <p className="text-muted-foreground text-xs font-display mb-4">{item.desc}</p>
                          <div className="text-[10px] font-heading uppercase tracking-wider text-purple-400">{item.action}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 bg-glass-navy rounded-xl border-gold-subtle">
                    <Gavel size={48} className="mx-auto mb-4 text-muted-foreground" aria-hidden="true" />
                    <p className="text-muted-foreground font-display mb-4">Select an auction to use Beast AI</p>
                    <button onClick={() => setTab('auctions')} className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold">Go to Auctions</button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── PAYMENT SETTINGS ── */}
            {tab === 'payment-settings' && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <h2 className="font-heading text-4xl uppercase tracking-[0.12em] text-foreground mb-2">Payment <span className="text-gradient-gold">Settings</span></h2>
                <p className="text-muted-foreground font-display text-sm mb-8">
                  Add your UPI ID or bank details. When players register with a fee, they'll see your payment info and send money directly to you.
                </p>

                <div className="max-w-2xl">
                  <div className="bg-primary/10 border border-primary/25 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <Lightbulb size={22} className="text-primary flex-shrink-0" aria-hidden="true" />
                    <div className="text-sm font-display text-muted-foreground">
                      Player registration fees bypass our platform and go <strong className="text-foreground">directly to you</strong>. We don't charge any commission on player fees. Just add your UPI ID (GPay, PhonePe, Paytm) or bank account below.
                    </div>
                  </div>

                  <form onSubmit={savePayProfile} className="bg-glass-premium rounded-xl p-7 gold-edge border-gold-subtle space-y-5">
                    <div>
                      <div className="font-heading text-base uppercase tracking-wider text-primary mb-4 flex items-center gap-1.5"><Smartphone size={15} aria-hidden="true" /> UPI / GPay Details (Recommended)</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                          <label className={LBL}>UPI ID *</label>
                          <input value={payProfile.upiId || ''} onChange={e => setPayProfile((p: any) => ({ ...p, upiId: e.target.value }))} className={INP} placeholder="9876543210@gpay or name@upi" />
                          <p className="text-[10px] text-muted-foreground mt-1">Works with GPay, PhonePe, Paytm, BHIM</p>
                        </div>
                        <div>
                          <label className={LBL}>Display Name</label>
                          <input value={payProfile.upiName || ''} onChange={e => setPayProfile((p: any) => ({ ...p, upiName: e.target.value }))} className={INP} placeholder="Your name on UPI" />
                        </div>
                        <div>
                          <label className={LBL}>WhatsApp (for payment queries)</label>
                          <input value={payProfile.whatsapp || ''} onChange={e => setPayProfile((p: any) => ({ ...p, whatsapp: e.target.value }))} className={INP} placeholder="+91 98765 43210" />
                        </div>
                        <div>
                          <label className={LBL}>QR Code Image (optional)</label>
                          <input type="file" accept="image/*" onChange={e => {
                            const file = e.target.files?.[0] || null;
                            setQrFile(file);
                            if (file) { const r = new FileReader(); r.onload = ev => setQrPreview(ev.target?.result as string); r.readAsDataURL(file); }
                          }} className="w-full text-muted-foreground text-xs file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-heading file:text-xs cursor-pointer" />
                          {(qrPreview || payProfile.qrCodeUrl) && (
                            <div className="mt-2 rounded-lg overflow-hidden border border-primary/20" style={{ width: 120, height: 120 }}>
                              <img src={qrPreview || imgUrl(payProfile.qrCodeUrl)} alt="QR Code" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-border/30 pt-5">
                      <div className="font-heading text-base uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5"><Zap size={15} aria-hidden="true" /> Razorpay Account (Optional — enables online checkout)</div>
                      <p className="text-[11px] text-muted-foreground mb-4">Connect your own Razorpay account so team owners and players can pay by card/UPI/netbanking instantly online, with funds settling directly to your bank — no manual UTR entry needed.</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={LBL}>Razorpay Key ID</label><input value={payProfile.razorpayKeyId || ''} onChange={e => setPayProfile((p: any) => ({ ...p, razorpayKeyId: e.target.value }))} className={INP} placeholder="rzp_live_xxxxxxxxxxxx" /></div>
                        <div><label className={LBL}>Razorpay Key Secret</label><input type="password" value={payProfile.razorpayKeySecret || ''} onChange={e => setPayProfile((p: any) => ({ ...p, razorpayKeySecret: e.target.value }))} className={INP} placeholder="Hidden for security" /></div>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2">Get these from your <a href="https://dashboard.razorpay.com/app/keys" target="_blank" className="text-primary underline">Razorpay Dashboard → Settings → API Keys</a>.</p>
                    </div>

                    <div className="border-t border-border/30 pt-5">
                      <div className="font-heading text-base uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5"><Landmark size={15} aria-hidden="true" /> Bank Account (Alternative)</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={LBL}>Account Holder Name</label><input value={payProfile.accountHolderName || ''} onChange={e => setPayProfile((p: any) => ({ ...p, accountHolderName: e.target.value }))} className={INP} /></div>
                        <div><label className={LBL}>Bank Name</label><input value={payProfile.bankName || ''} onChange={e => setPayProfile((p: any) => ({ ...p, bankName: e.target.value }))} className={INP} placeholder="SBI, HDFC, etc." /></div>
                        <div><label className={LBL}>Account Number</label><input type="password" value={payProfile.accountNumber || ''} onChange={e => setPayProfile((p: any) => ({ ...p, accountNumber: e.target.value }))} className={INP} placeholder="Hidden for security" /></div>
                        <div><label className={LBL}>IFSC Code</label><input value={payProfile.ifscCode || ''} onChange={e => setPayProfile((p: any) => ({ ...p, ifscCode: e.target.value.toUpperCase() }))} className={INP} placeholder="SBIN0001234" /></div>
                      </div>
                    </div>

                    <button type="submit" disabled={payProfileLoading} className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-heading uppercase tracking-wider text-sm glow-gold hover:scale-[1.01] transition-all disabled:opacity-50">
                      {payProfileLoading ? 'Saving...' : <span className="inline-flex items-center gap-1.5"><Save size={15} aria-hidden="true" /> Save Payment Details</span>}
                    </button>
                    <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1"><Lock size={11} aria-hidden="true" /> Your bank account number is stored encrypted and shown only to you</p>
                  </form>

                  {/* Preview */}
                  {(payProfile.upiId || payProfile.bankName) && (
                    <div className="mt-6 bg-glass-navy rounded-xl p-5 border border-border/30">
                      <div className="font-heading text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Eye size={14} aria-hidden="true" /> Preview — What Players Will See</div>
                      <div className="flex items-start gap-4">
                        {(qrPreview || payProfile.qrCodeUrl) && (
                          <div className="w-20 h-20 rounded-lg overflow-hidden border border-primary/20 flex-shrink-0">
                            <img src={qrPreview || imgUrl(payProfile.qrCodeUrl)} alt="QR" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="space-y-1 text-sm font-display">
                          {payProfile.upiId && <div className="flex items-center gap-1.5"><Smartphone size={13} aria-hidden="true" /> <span className="text-foreground font-mono">{payProfile.upiId}</span>{payProfile.upiName ? ` (${payProfile.upiName})` : ''}</div>}
                          {payProfile.whatsapp && <div className="flex items-center gap-1.5"><MessageSquare size={13} aria-hidden="true" /> WhatsApp: <span className="text-foreground">{payProfile.whatsapp}</span></div>}
                          {payProfile.bankName && <div className="flex items-center gap-1.5"><Landmark size={13} aria-hidden="true" /> {payProfile.bankName} · {payProfile.ifscCode}</div>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    {/* ─────────────────── UPI PAYMENT MODAL ─────────────────── */}
    <AnimatePresence>
      {/* ── PLAYER EDIT MODAL ── */}
      {showPlayerEditModal && editPlayer && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowPlayerEditModal(false); setEditPlayer(null); } }}>
          <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }}
            className="bg-glass-premium rounded-2xl p-6 gold-edge w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading text-xl uppercase tracking-wider text-foreground flex items-center gap-2">
                <Pencil size={18} aria-hidden="true" /> Edit Player
              </h3>
              <button onClick={() => { setShowPlayerEditModal(false); setEditPlayer(null); }}
                aria-label="Close modal" className="text-muted-foreground hover:text-foreground transition-colors">
                <XCircle size={20} aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={updatePlayer} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-heading uppercase tracking-wider text-muted-foreground mb-1 block">Player Name *</label>
                  <input value={pForm.name} onChange={e => setPForm(f => ({ ...f, name: e.target.value }))}
                    required placeholder="Full name" className="w-full px-3 py-2 rounded-lg bg-secondary/30 border border-border text-foreground text-sm outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="text-xs font-heading uppercase tracking-wider text-muted-foreground mb-1 block">Role</label>
                  <select value={pForm.role} onChange={e => setPForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/30 border border-border text-foreground text-sm outline-none focus:border-primary/50">
                    {['Batsman','Bowler','AllRounder','WicketKeeper','Other'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-heading uppercase tracking-wider text-muted-foreground mb-1 block">Category</label>
                  <select value={pForm.category} onChange={e => setPForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/30 border border-border text-foreground text-sm outline-none focus:border-primary/50">
                    {['Elite','Gold','Silver','Emerging'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-heading uppercase tracking-wider text-muted-foreground mb-1 block">Base Price (₹)</label>
                  <input type="number" value={pForm.basePrice} onChange={e => setPForm(f => ({ ...f, basePrice: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/30 border border-border text-foreground text-sm outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="text-xs font-heading uppercase tracking-wider text-muted-foreground mb-1 block">Nationality</label>
                  <input value={pForm.nationality} onChange={e => setPForm(f => ({ ...f, nationality: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/30 border border-border text-foreground text-sm outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="text-xs font-heading uppercase tracking-wider text-muted-foreground mb-1 block">Age</label>
                  <input type="number" value={pForm.age} onChange={e => setPForm(f => ({ ...f, age: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-secondary/30 border border-border text-foreground text-sm outline-none focus:border-primary/50" />
                </div>
              </div>
              <div>
                <label className="text-xs font-heading uppercase tracking-wider text-muted-foreground mb-1 block">Player Photo</label>
                <div className="flex items-center gap-3">
                  {(pImgPreview || editPlayer.imageUrl) && (
                    <img src={pImgPreview || imgUrl(editPlayer.imageUrl)} alt="Preview"
                      className="w-16 h-16 rounded-lg object-cover border border-border" />
                  )}
                  <label className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg cursor-pointer text-xs font-heading uppercase tracking-wider border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-all">
                    <Download size={14} aria-hidden="true" /> {pImg ? pImg.name : 'Change Photo'}
                    <input type="file" accept="image/*" className="hidden" onChange={e => {
                      const f = e.target.files?.[0]; if (!f) return;
                      setPImg(f); setPImgPreview(URL.createObjectURL(f));
                    }} />
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowPlayerEditModal(false); setEditPlayer(null); }}
                  className="flex-1 py-2.5 rounded-lg border border-border text-muted-foreground font-heading uppercase tracking-wider text-xs hover:bg-secondary/30 transition-all">Cancel</button>
                <button type="submit" disabled={loading}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold hover:scale-[1.02] transition-all disabled:opacity-50">
                  {loading ? 'Saving…' : <span className="inline-flex items-center gap-1.5"><Pencil size={13} aria-hidden="true" /> Update Player</span>}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* ── GPay QR Modal ── */}
      {gpayModal.open && gpayModal.pkg && (() => {
        const amountRupees = Math.round(gpayModal.pkg.price / 100);
        const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || 'msbeastcricketprivatelimited.eazypay@icici';
        const QR_MAP: Record<string, string> = {
          starter: '/payment/qr-starter.png',
          pro: '/payment/qr-pro.png',
          elite: '/payment/qr-elite.png',
        };
        const qrImageSrc = QR_MAP[gpayModal.pkg.key] || '/payment/qr-starter.png';
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={e => { if (e.target === e.currentTarget) setGpayModal(p => ({ ...p, open: false })); }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              className="w-full max-w-sm bg-glass-premium rounded-2xl border-gold-subtle overflow-hidden">
              {/* Header */}
              <div className="p-5 border-b border-border/30 flex items-center justify-between" style={{ background: 'hsla(145,70%,45%,0.08)' }}>
                <div>
                  <div className="font-heading text-lg uppercase tracking-wider text-foreground flex items-center gap-2"><QrCode size={18} style={{ color: '#34d399' }} /> Google Pay QR</div>
                  <div className="text-muted-foreground text-xs font-display mt-0.5">{gpayModal.pkg.name} Plan · ₹{amountRupees.toLocaleString('en-IN')} / year</div>
                </div>
                <button onClick={() => setGpayModal(p => ({ ...p, open: false }))} aria-label="Close" className="w-8 h-8 rounded-lg border border-border text-muted-foreground hover:text-foreground flex items-center justify-center"><XCircle size={16} /></button>
              </div>
              {/* Body */}
              <div className="p-6 flex flex-col items-center gap-5">
                {/* Amount */}
                <div className="text-center p-3 rounded-xl w-full" style={{ background: 'hsla(145,70%,45%,0.1)', border: '1px solid hsla(145,70%,45%,0.3)' }}>
                  <div className="text-xs font-heading uppercase tracking-wider text-green-400 mb-1">Amount to Pay</div>
                  <div className="font-heading text-4xl text-foreground">₹{amountRupees.toLocaleString('en-IN')}</div>
                  <div className="text-xs text-muted-foreground mt-1">Auto-filled in all UPI apps</div>
                </div>
                {/* Static QR Code per package */}
                <div className="flex flex-col items-center gap-2">
                  <div className="p-2 rounded-2xl border-2 bg-white" style={{ borderColor: '#34d399' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrImageSrc} alt="UPI QR Code" width={220} height={220} className="rounded-xl block" />
                  </div>
                  <div className="text-xs text-muted-foreground text-center font-display">Scan with Google Pay · PhonePe · Paytm · BHIM · any UPI app</div>
                </div>
                {/* UPI ID */}
                <div className="w-full p-3 rounded-xl border border-border/40 bg-secondary/10 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-heading uppercase text-muted-foreground">UPI ID</div>
                    <div className="font-mono text-sm text-foreground font-bold">{UPI_ID}</div>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(UPI_ID); toast.success('UPI ID copied!'); }}
                    className="text-xs text-primary hover:text-primary/80 font-heading inline-flex items-center gap-1 flex-shrink-0"><ClipboardCopy size={12} /> Copy</button>
                </div>
                {/* Instructions */}
                <div className="w-full p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-yellow-400 text-xs font-display flex items-start gap-1.5">
                    <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                    After payment, contact us with your transaction ID/UTR to activate your plan. Or enter UTR below.
                  </p>
                </div>
                {/* UTR entry for activation */}
                <div className="w-full">
                  <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5">UTR / Transaction ID (after payment)</label>
                  <div className="flex gap-2">
                    <input id="gpay-utr" className="flex-1 px-3 py-2.5 rounded-xl bg-secondary/20 border border-border/40 text-foreground font-mono text-sm focus:border-primary/60 focus:outline-none"
                      placeholder="e.g. 423856789012" />
                    <button
                      onClick={async () => {
                        const utr = (document.getElementById('gpay-utr') as HTMLInputElement)?.value?.trim();
                        if (!utr) { toast.error('Enter UTR number'); return; }
                        setPkgLoading(true);
                        try {
                          const r = await api.post('/packages/upi-payment', { packageKey: gpayModal.pkg.key, utrNumber: utr });
                          setOrgPackage(r.data.package);
                          await fetchPackage();
                          await refetch();
                          setGpayModal({ open: false, pkg: null });
                          toast.success(`${gpayModal.pkg.name} Plan activated!`);
                        } catch (err: any) {
                          toast.error(err.response?.data?.error || 'Activation failed');
                        } finally { setPkgLoading(false); }
                      }}
                      disabled={pkgLoading}
                      className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading uppercase tracking-wider text-xs glow-gold hover:scale-[1.02] transition-all disabled:opacity-50">
                      {pkgLoading ? <Loader2 size={14} className="animate-spin" /> : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        );
      })()}

      {upiModal.open && upiModal.pkg && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) setUpiModal(p => ({ ...p, open: false })); }}>
          <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
            className="w-full max-w-md bg-glass-premium rounded-2xl border-gold-subtle overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-border/30" style={{ background: 'hsla(45,100%,51%,0.06)' }}>
              <div className="flex items-center justify-between mb-1">
                <div className="font-heading text-xl uppercase tracking-wider text-foreground">Complete Payment</div>
                <button onClick={() => setUpiModal(p => ({ ...p, open: false }))} aria-label="Close" className="w-8 h-8 rounded-lg border border-border text-muted-foreground hover:text-foreground flex items-center justify-center transition-all"><XCircle size={16} aria-hidden="true" /></button>
              </div>
              <div className="text-muted-foreground text-sm font-display">{upiModal.pkg.name} Plan · ₹{(upiModal.pkg.price / 100).toLocaleString('en-IN')} / year</div>
            </div>
            {/* Body */}
            <div className="p-6 space-y-5">
              {/* Amount */}
              <div className="text-center p-4 rounded-xl" style={{ background: 'hsla(45,100%,51%,0.08)', border: '1px solid hsla(45,100%,51%,0.25)' }}>
                <div className="text-muted-foreground text-xs font-heading uppercase tracking-wider mb-1">Pay This Amount</div>
                <div className="font-heading text-4xl text-gradient-gold">₹{(upiModal.pkg.price / 100).toLocaleString('en-IN')}</div>
                <div className="text-xs text-muted-foreground mt-1 font-display">{upiModal.pkg.name} Plan · 1 Year Validity</div>
              </div>

              {/* UPI Details */}
              <div className="space-y-3">
                <div className="font-heading text-sm uppercase tracking-wider text-muted-foreground mb-2">Pay via UPI / GPay / PhonePe / Paytm</div>
                <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-heading uppercase text-blue-400">UPI ID</span>
                    <button onClick={() => { navigator.clipboard.writeText('msbeastcricketprivatelimited.eazypay@icici'); toast.success('UPI ID copied!'); }}
                      className="text-xs text-blue-400 hover:text-blue-300 font-heading inline-flex items-center gap-1"><ClipboardCopy size={12} aria-hidden="true" /> Copy</button>
                  </div>
                  <div className="font-mono text-xl text-foreground font-bold">msbeastcricketprivatelimited.eazypay@icici</div>
                  <div className="text-xs text-muted-foreground mt-1 font-display">or scan QR code below</div>
                </div>

                {/* Static QR Code per package */}
                <div className="flex flex-col items-center gap-2">
                  {(() => {
                    const UPI_QR_MAP: Record<string, string> = {
                      starter: '/payment/qr-starter.png',
                      pro: '/payment/qr-pro.png',
                      elite: '/payment/qr-elite.png',
                    };
                    const upiQrSrc = UPI_QR_MAP[upiModal.pkg?.key] || '/payment/qr-starter.png';
                    return (
                      <div className="p-2 rounded-xl bg-white border-2 border-primary/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={upiQrSrc} alt="UPI QR" width={160} height={160} className="rounded-lg block" />
                      </div>
                    );
                  })()}
                  <div className="text-[10px] text-muted-foreground font-display">Scan with GPay · PhonePe · Paytm · BHIM · any UPI app</div>
                </div>

                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-yellow-400 text-xs font-display flex items-center gap-1.5"><AlertTriangle size={13} className="flex-shrink-0" aria-hidden="true" /> After payment, enter the UTR/Transaction number below to activate your plan instantly.</p>
                </div>

                {/* UTR Input */}
                <div>
                  <label className="block text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1.5">UTR / Transaction Reference Number *</label>
                  <input value={upiModal.utrNumber}
                    onChange={e => setUpiModal(p => ({ ...p, utrNumber: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-secondary/20 border border-border/40 text-foreground font-mono focus:border-primary/60 focus:outline-none transition-all"
                    placeholder="e.g. 423856789012" />
                  <p className="text-[10px] text-muted-foreground mt-1 font-display">Found in your UPI app payment success screen</p>
                </div>
              </div>
            </div>
            {/* Footer */}
            <div className="p-5 border-t border-border/30 flex gap-3">
              <button onClick={() => setUpiModal(p => ({ ...p, open: false }))} className="flex-1 py-3 rounded-xl border border-border text-muted-foreground font-heading uppercase tracking-wider text-xs hover:bg-secondary/30 transition-all">Cancel</button>
              <button onClick={confirmUpiPayment} disabled={pkgLoading || !upiModal.utrNumber.trim()}
                className="flex-2 flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-heading uppercase tracking-widest text-xs glow-gold hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100">
                {pkgLoading ? <span className="inline-flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Activating...</span> : <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} aria-hidden="true" /> Confirm & Activate</span>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    </AuthGuard>
  );
}

// useSearchParams() (used above for the ?tab= deep link) requires a
// Suspense boundary at build time, or `next build` fails prerendering
// this route entirely — even with `dynamic = 'force-dynamic'` set, since
// that only skips static generation of the page's *output*, not the
// client-side bailout check Next.js does while building the static shell.
export default function OrganizerDashboardPage() {
  return (
    <AuthGuard roles={['organizer', 'admin']}>
      <Suspense fallback={null}>
        <OrganizerDashboard />
      </Suspense>
    </AuthGuard>
  );
}
