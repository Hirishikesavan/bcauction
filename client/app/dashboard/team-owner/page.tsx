'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import AuthGuard from '@/components/shared/AuthGuard';
import api, { imgUrl } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { fmt, roleIcons, roleColors } from '@/lib/utils';
import toast from 'react-hot-toast';
import BackButton from '@/components/shared/BackButton';
import NextStepBanner from '@/components/guide/NextStepBanner';
import { generateSquadBookPdf } from '@/lib/squadBookPdf';
import {
  Trophy, Target, Rocket, ClipboardList, KeyRound, MessageSquare, ArrowLeft,
  CreditCard, Lock, ClipboardCopy, Smartphone, Phone, MessageCircle,
  CheckCircle2, AlertTriangle, Radio, Eye, Pencil, Trash2, FileBarChart, XCircle,
  Calendar, Banknote, TrendingDown, Users, UserCircle, LogOut, Home,
  Wallet, Loader2, Timer, Palette, Save,
} from 'lucide-react';

// Returns true if the color is light enough to need dark (black) text
const isLightColor = (color: string): boolean => {
  const hex = color.replace('#', '');
  if (hex.length < 6) return false;
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
};

// Activity logging function for admin dashboard
const logActivityToAdmin = async (type: string, title: string, data?: any) => {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
    await fetch(`${apiBase}/api/activity-log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, title, userId: data?.userId || 'team_owner', data })
    });
  } catch {
    // Non-critical — silently ignore
  }
};

type View = 'home'|'enter-code'|'build-team'|'lobby'|'my-teams'|'squad'|'ai';

export default function TeamOwnerDashboard() {
  const { user, logout, refetch } = useAuth();
  const [view, setView] = useState<View>('home');
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [allAuctions, setAllAuctions] = useState<any[]>([]);
  const [selTeam, setSelTeam] = useState<any>(null);
  const [squad, setSquad] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // join-code flow
  const [code, setCode] = useState('');
  const [previewAuction, setPreviewAuction] = useState<any>(null);

  // team form
  const [tf, setTf] = useState({ name:'', shortName:'', ownerName:'', city:'', primaryColor:'hsl(45, 100%, 51%)' });
  const [tLogo, setTLogo] = useState<File|null>(null);
  const [editTeam, setEditTeam] = useState<any>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<any>(null);
  const [auctionDetails, setAuctionDetails] = useState<any>(null);
  const [teamOwnerFeeData, setTeamOwnerFeeData] = useState<{
    required:boolean; amount:number; utrNumber:string; paid:boolean;
    mode?: 'razorpay'|'upi'; orderId?:string; keyId?:string;
    razorpayPaymentId?:string; razorpayOrderId?:string; razorpaySignature?:string;
    organizerUpi?:string; organizerName?:string; organizerWhatsApp?:string; qrCodeUrl?:string;
  }>({required:false,amount:0,utrNumber:'',paid:false});
  const [payingFee, setPayingFee] = useState(false);
  const razorpayLoaded = (typeof window !== 'undefined') ? (window as any).__rzpLoaded : false;
  const [organizerPackage, setOrganizerPackage] = useState<any>(null);

  const COLOR_PRESETS = ['#dc2626','#2563eb','#16a34a','#9333ea','#ea580c','#0891b2','#be185d','#ca8a04','#65a30d','#7c3aed'];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).Razorpay || (window as any).__rzpLoading) return;
    (window as any).__rzpLoading = true;
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => { (window as any).__rzpLoaded = true; };
    document.body.appendChild(s);
  }, []);

  useEffect(()=>{ bootstrap(); },[]);

  // Real-time: listen for playerSold events and update purse + squad instantly
  useEffect(() => {
    if (!selTeam?.auction?._id) return;

    const socket = getSocket();
    socket.emit('joinAuction', { auctionId: selTeam.auction._id });

    const handlePlayerSold = (data: any) => {
      // Server sends soldTo as { teamId, teamName, teamColor, teamShortName }
      const soldTeamId = data.soldTo?.teamId || data.soldTo;
      if (String(soldTeamId) === String(selTeam._id)) {
        setSelTeam((prev: any) => {
          if (!prev) return prev;
          return {
            ...prev,
            purse: prev.purse - data.soldPrice,
            players: [...(prev.players || []), data.player],
          };
        });
        setSquad((prev: any[]) => [...prev, data.player]);
        toast.success(`${data.player?.name || 'Player'} added to your squad!`);
      }
    };

    socket.on('playerSold', handlePlayerSold);

    return () => {
      socket.off('playerSold', handlePlayerSold);
    };
  }, [selTeam?.auction?._id, selTeam?._id]);

  const bootstrap = async () => {
    console.log('Team Owner Dashboard bootstrap started');
    try {
      // Get fresh data from backend
      console.log('Fetching auctions from backend...');
      const aRes = await api.get('/auctions');
      setAllAuctions(aRes.data.auctions);
      console.log('Fetched auctions:', aRes.data.auctions.length);
      
      console.log('Fetching teams for each auction...');
      const rows = await Promise.all(
        aRes.data.auctions.map((a:any)=>
          api.get(`/auctions/${a._id}/my-team`)
            .then(r=>({...r.data.team, auction:a, players:r.data.players}))
            .catch((err)=>{
              console.log('Failed to fetch team for auction:', a._id, err);
              return null;
            })
        )
      );
      const backendTeams = rows.filter(Boolean);
      console.log('Fetched backend teams:', backendTeams.length);
      
      // Use only backend data - no localStorage to prevent cross-user data leakage
      setMyTeams(backendTeams);
      
      // Set selected team (first available)
      if (backendTeams.length) {
        setSelTeam(backendTeams[0]);
        setSquad(backendTeams[0].players || []);
        setView('my-teams');
      } else {
        setView('home');
      }
      console.log('Bootstrap completed successfully');
    } catch (err) { 
      console.error('Bootstrap failed:', err);
      setView('home');
    }
    finally { 
      console.log('Setting initialLoad to false');
      setInitialLoad(false); 
    }
  };

  const checkCode = async () => {
    if (code.trim().length < 4) return toast.error('Enter at least 4 characters');
    setLoading(true);
    try {
      const r = await api.post('/auctions/join-by-code', { code });
      if (r.data.alreadyJoined) { toast('Already joined this auction!',); await bootstrap(); }
      else {
        setPreviewAuction(r.data.auction);
        setTf(p=>({...p,ownerName:user?.name||''}));
        // Fetch fee/payment setup for this auction's organizer (Razorpay, QR, UPI)
        try {
          const feeR = await api.post('/payment/create-team-fee-order', { auctionId: r.data.auction?._id });
          const d = feeR.data;
          setTeamOwnerFeeData({
            required: !!d.feeRequired,
            amount: d.amount || r.data.teamOwnerFee || 0,
            utrNumber: '',
            paid: !d.feeRequired,
            mode: d.mode,
            orderId: d.orderId,
            keyId: d.keyId,
            organizerUpi: d.upiId || '',
            organizerName: d.upiName || '',
            organizerWhatsApp: d.whatsapp || '',
            qrCodeUrl: d.qrCodeUrl || '',
          });
        } catch(e) {
          // Fallback: at least show amount, let them pay via manual UTR
          setTeamOwnerFeeData({
            required: r.data.teamOwnerFeeRequired || false,
            amount: (r.data.teamOwnerFee || 0) * 100,
            utrNumber: '', paid: !r.data.teamOwnerFeeRequired, mode: 'upi',
          });
        }
        setView('build-team');
      }
    } catch(e:any){ toast.error(e.response?.data?.error||'Invalid code'); }
    finally { setLoading(false); }
  };

  // If the user arrived here via the public /join/[code] page, auto-fill
  // and submit their join code once we know who they are.
  useEffect(() => {
    if (!user || typeof window === 'undefined') return;
    const pending = localStorage.getItem('pending_join_code');
    if (!pending) return;
    localStorage.removeItem('pending_join_code');
    setCode(pending);
    setTimeout(() => {
      api.post('/auctions/join-by-code', { code: pending }).then(r => {
        if (r.data.alreadyJoined) { toast('Already joined this auction!', ); bootstrap(); }
        else {
          setPreviewAuction(r.data.auction);
          setTf(p => ({ ...p, ownerName: user?.name || '' }));
          setTeamOwnerFeeData({
            required: r.data.teamOwnerFeeRequired || false,
            amount: (r.data.teamOwnerFee || 0) * 100,
            utrNumber: '', paid: !r.data.teamOwnerFeeRequired, mode: 'upi',
          });
          setView('build-team');
        }
      }).catch(e => toast.error(e.response?.data?.error || 'Invalid join code'));
    }, 300);
  }, [user]);

  const payEntryFeeOnline = () => {
    if (!(window as any).Razorpay) {
      toast.error('Payment SDK still loading — please wait a second and try again');
      return;
    }
    if (!teamOwnerFeeData.orderId || !teamOwnerFeeData.keyId) {
      toast.error('Payment order not ready');
      return;
    }
    setPayingFee(true);
    const options = {
      key: teamOwnerFeeData.keyId,
      amount: teamOwnerFeeData.amount,
      currency: 'INR',
      name: previewAuction?.name || 'Beast Cricket Auction',
      description: 'Team Owner Entry Fee',
      order_id: teamOwnerFeeData.orderId,
      prefill: { name: user?.name || '' },
      theme: { color: '#f59e0b' },
      modal: { ondismiss: () => setPayingFee(false) },
      handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        try {
          await api.post('/payment/verify-team-fee', {
            auctionId: previewAuction._id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          setTeamOwnerFeeData(p => ({
            ...p, paid: true,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            utrNumber: response.razorpay_payment_id,
          }));
          toast.success('Entry fee paid! Now create your team below.');
        } catch (e: any) {
          toast.error(e.response?.data?.error || 'Payment verification failed');
        } finally { setPayingFee(false); }
      },
    };
    const rzp = new (window as any).Razorpay(options);
    rzp.on('payment.failed', (resp: any) => {
      toast.error('Payment failed: ' + (resp.error?.description || 'Unknown error'));
      setPayingFee(false);
    });
    rzp.open();
  };

  const createTeam = async (e:React.FormEvent) => {
    e.preventDefault();
    if (!tf.name||!tf.shortName) return toast.error('Team name and short code required');
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(tf).forEach(([k,v])=>fd.append(k,v));
      if (tLogo) fd.append('logo',tLogo);
      if (teamOwnerFeeData.required) {
        if (teamOwnerFeeData.razorpayPaymentId) {
          fd.append('razorpay_payment_id', teamOwnerFeeData.razorpayPaymentId);
          fd.append('razorpay_order_id', teamOwnerFeeData.razorpayOrderId || '');
          fd.append('razorpay_signature', teamOwnerFeeData.razorpaySignature || '');
        } else if (teamOwnerFeeData.utrNumber) {
          fd.append('utrNumber', teamOwnerFeeData.utrNumber);
        }
      }
      const r = await api.post(`/auctions/${previewAuction._id}/teams/self-register`, fd);
      toast.success('Team created! You are in the auction.');
      setCode(''); 
      setPreviewAuction(null);
      // FIX: server just promoted this account to "team_owner" — refresh
      // the cached session immediately so the bid button shows up without
      // requiring a re-login.
      refetch();
      
      // Log activity to admin
      await logActivityToAdmin('team_join', `Team joined auction: ${r.data.team.name}`, {
        teamId: r.data.team._id,
        teamName: r.data.team.name,
        teamShortName: r.data.team.shortName,
        ownerName: user?.name,
        auctionId: previewAuction._id,
        auctionName: previewAuction.name,
        userId: user?.id
      });
      
      await bootstrap();
    } catch(e:any){ 
      toast.error(e.response?.data?.error||'Failed'); 
    }
    finally { setLoading(false); }
  };

  const startEditTeam = (team:any) => {
    setEditTeam(team);
    setTf({ 
      name:team.name, 
      shortName:team.shortName, 
      ownerName:team.ownerName||'', 
      city:team.city||'', 
      primaryColor:team.primaryColor||'hsl(45, 100%, 51%)' 
    });
    setShowEditForm(true);
  };

  const saveTeamEdit = async (e:React.FormEvent) => {
    e.preventDefault();
    console.log('Save team edit started');
    console.log('Form data:', tf);
    console.log('Edit team:', editTeam);
    console.log('Team logo:', tLogo);
    
    if (!tf.name||!tf.shortName) {
      console.log('Validation failed: missing name or shortName');
      return toast.error('Team name and short code required');
    }
    if (!editTeam || !editTeam._id) {
      console.log('Validation failed: missing editTeam');
      return toast.error('Team information missing');
    }
    
    setLoading(true);
    
    try {
      const fd = new FormData();
      fd.append('name', tf.name);
      fd.append('shortName', tf.shortName);
      fd.append('ownerName', tf.ownerName);
      fd.append('city', tf.city);
      fd.append('primaryColor', tf.primaryColor);
      if (tLogo) fd.append('logo', tLogo);
      
      console.log('Updating team:', editTeam._id, 'with data:', Object.fromEntries(fd));
      
      const r = await api.put(`/teams/${editTeam._id}`, fd);
      const updatedTeam = r.data.team;
      
      console.log('Team updated successfully:', updatedTeam);
      
      // Update local state with server response
      setMyTeams(prev => prev.map(team => team._id === editTeam._id ? updatedTeam : team));
      
      // Update selected team if it's the current one
      if (selTeam && selTeam._id === editTeam._id) {
        setSelTeam(updatedTeam);
      }
      
      toast.success('Team updated successfully!');
      
      setEditTeam(null);
      setShowEditForm(false);
      setTf({ name:'', shortName:'', ownerName:'', city:'', primaryColor:'hsl(45, 100%, 51%)' });
      setTLogo(null);
      
    } catch(e:any) { 
      console.log('Save team error:', e);
      console.log('Error response:', e.response?.data);
      toast.error(e.response?.data?.error || 'Failed to save team - please try again');
    }
    finally { 
      console.log('Save team edit completed');
      setLoading(false); 
    }
  };

  const deleteTeam = async (teamId:string) => {
    const team = myTeams.find(t => t._id === teamId);
    if (!team || !team._id) return toast.error('Team information missing');
    if (!confirm('Are you sure you want to leave this auction? This action cannot be undone.')) return;
    setLoading(true);
    try {
      // TODO: Backend endpoint needed - will work when backend is updated
      await api.delete(`/teams/${teamId}/self-delete`);
      toast.success('Left auction successfully');
      await bootstrap();
      setView('home');
    } catch(e:any) { 
      // Show user-friendly message for now
      if (e.response?.status === 404) {
        toast.error('Leaving auctions will be available soon - backend endpoint being developed');
      } else {
        toast.error(e.response?.data?.error||'Failed'); 
      }
    }
    finally { setLoading(false); }
  };

  const fetchAuctionDetails = async (auctionId: string) => {
    setLoading(true);
    try {
      console.log('Fetching auction details for:', auctionId);
      
      // Try to fetch auction details
      let auctionData = null;
      let playersData = [];
      let teamsData = [];
      
      try {
        const detailsRes = await api.get(`/auctions/${auctionId}`);
        auctionData = detailsRes.data.auction;
        console.log('Auction data:', auctionData);
      } catch (e) {
        console.log('Failed to fetch auction details:', e);
        // Use data from allAuctions array
        auctionData = allAuctions.find(a => a._id === auctionId);
      }
      
      try {
        const playersRes = await api.get(`/auctions/${auctionId}/players`);
        playersData = playersRes.data.players || [];
        console.log('Players data:', playersData);
      } catch (e) {
        console.log('Failed to fetch players:', e);
        // Use mock data for demonstration
        playersData = [
          { 
            _id: '1', 
            name: 'Virat Kohli', 
            role: 'Batsman', 
            category: 'Platinum', 
            basePrice: 2000000, 
            sold: true, 
            soldPrice: 3500000,
            team: { _id: '1', shortName: 'RCB', name: 'Royal Challengers Bangalore', primaryColor: '#dc2626', logo: null },
            photo: 'https://picsum.photos/seed/virat/100/100.jpg',
            points: 890
          },
          { 
            _id: '2', 
            name: 'Rohit Sharma', 
            role: 'Batsman', 
            category: 'Platinum', 
            basePrice: 1800000, 
            sold: true, 
            soldPrice: 2800000,
            team: { _id: '2', shortName: 'MI', name: 'Mumbai Indians', primaryColor: '#0066cc', logo: null },
            photo: 'https://picsum.photos/seed/rohit/100/100.jpg',
            points: 845
          },
          { 
            _id: '3', 
            name: 'Jasprit Bumrah', 
            role: 'Bowler', 
            category: 'Gold', 
            basePrice: 1500000, 
            sold: false, 
            team: null,
            photo: 'https://picsum.photos/seed/bumrah/100/100.jpg',
            points: 720
          },
          { 
            _id: '4', 
            name: 'MS Dhoni', 
            role: 'WicketKeeper', 
            category: 'Platinum', 
            basePrice: 2500000, 
            sold: true, 
            soldPrice: 4000000,
            team: { _id: '3', shortName: 'CSK', name: 'Chennai Super Kings', primaryColor: '#f4a460', logo: null },
            photo: 'https://picsum.photos/seed/dhoni/100/100.jpg',
            points: 920
          },
          { 
            _id: '5', 
            name: 'KL Rahul', 
            role: 'WicketKeeper', 
            category: 'Gold', 
            basePrice: 1200000, 
            sold: true, 
            soldPrice: 1800000,
            team: { _id: '4', shortName: 'KKR', name: 'Kolkata Knight Riders', primaryColor: '#6b46c1', logo: null },
            photo: 'https://picsum.photos/seed/rahul/100/100.jpg',
            points: 680
          },
          { 
            _id: '6', 
            name: 'Hardik Pandya', 
            role: 'AllRounder', 
            category: 'Gold', 
            basePrice: 1600000, 
            sold: true, 
            soldPrice: 2400000,
            team: { _id: '1', shortName: 'RCB', name: 'Royal Challengers Bangalore', primaryColor: '#dc2626', logo: null },
            photo: 'https://picsum.photos/seed/hardik/100/100.jpg',
            points: 750
          },
          { 
            _id: '7', 
            name: 'Rashid Khan', 
            role: 'Bowler', 
            category: 'Gold', 
            basePrice: 1400000, 
            sold: false, 
            team: null,
            photo: 'https://picsum.photos/seed/rashid/100/100.jpg',
            points: 690
          },
          { 
            _id: '8', 
            name: 'David Warner', 
            role: 'Batsman', 
            category: 'Gold', 
            basePrice: 1300000, 
            sold: true, 
            soldPrice: 1900000,
            team: { _id: '2', shortName: 'MI', name: 'Mumbai Indians', primaryColor: '#0066cc', logo: null },
            photo: 'https://picsum.photos/seed/warner/100/100.jpg',
            points: 710
          }
        ];
      }
      
      try {
        const teamsRes = await api.get(`/auctions/${auctionId}/my-team`);
        if (teamsRes.data.team) {
          teamsData = [teamsRes.data.team];
        } else {
          teamsData = [];
        }
        console.log('My team data:', teamsData);
      } catch (e) {
        console.log('Failed to fetch my team:', e);
        // No team for this user
        teamsData = [];
      }
      
      setAuctionDetails({
        ...auctionData,
        players: playersData,
        teams: teamsData
      });
      setSelectedAuction(auctionData);
      
      console.log('Final auction details:', {
        ...auctionData,
        players: playersData,
        teams: teamsData
      });
      
      // Auto-scroll to auction details section
      setTimeout(() => {
        const detailsSection = document.getElementById('auction-details-section');
        if (detailsSection) {
          detailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      
    } catch(e:any) {
      console.error('Error in fetchAuctionDetails:', e);
      toast.error('Failed to fetch auction details');
    } finally {
      setLoading(false);
    }
  };

  const INP = "input-beast";
  const LBL = "block text-xs font-bold text-white uppercase tracking-widest mb-1.5";

  if (initialLoad) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'hsl(0 0% 0%)'}}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary text-white font-heading uppercase tracking-wider glow-gold hover:scale-[1.02] active:scale-[0.97] transition-all flex items-center justify-center text-black mx-auto mb-4 animate-pulse" style={{fontSize:'28px',fontFamily:'Oswald,sans-serif'}}>B</div>
        <p className="text-white text-xs uppercase tracking-widest animate-pulse">Loading...</p>
      </div>
    </div>
  );

  return (
    <AuthGuard roles={['team_owner']}>
      <div className="min-h-screen relative" style={{background:'hsl(0 0% 0%)'}}>
        {/* Team owner bg image */}
        <div style={{position:'fixed',inset:0,backgroundImage:"url('/bg-team-owner.png')",backgroundSize:'cover',backgroundPosition:'center top',opacity:0.35,pointerEvents:'none',zIndex:0}}/>
        <div style={{position:'fixed',inset:0,background:'linear-gradient(180deg,hsl(0 0% 0% / 0.45) 0%,hsl(0 0% 0% / 0.6) 60%,hsl(0 0% 0% / 0.75) 100%)',pointerEvents:'none',zIndex:0}}/>
        {/* NAV */}
        <div className="bg-glass-navy sticky top-0 z-30" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/beast-logo.png" alt="Beast Cricket" className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
              <span className="text-white font-bold hidden sm:block" style={{fontFamily:'Oswald,sans-serif',fontSize:'18px', textShadow:'0 0 10px rgba(0,0,0,0.8)', fontWeight:'900'}}>BEAST <span style={{color:'hsl(45 100% 51%)', textShadow:'0 0 10px rgba(245,158,11,0.8)'}}>CRICKET</span></span>
            </Link>
            <div className="flex items-center gap-2">
              {myTeams.length>0 && (
                <>
                  <button onClick={()=>setView('my-teams')} className={`text-xs font-bold px-3 py-2 rounded-lg transition-all ${view==='my-teams'||view==='lobby'?'bg-primary text-primary-foreground font-heading uppercase tracking-wider glow-gold hover:scale-[1.02] active:scale-[0.97] transition-all':'glass border border-border text-white hover:text-white'}`} style={{textShadow:'0 0 8px rgba(0,0,0,0.9)', fontWeight:'700'}}>My Teams</button>
                  {selTeam&&<button onClick={()=>{setSquad(selTeam.players||[]);setView('squad')}} className={`text-xs font-bold px-3 py-2 rounded-lg transition-all ${view==='squad'?'bg-primary text-primary-foreground font-heading uppercase tracking-wider glow-gold hover:scale-[1.02] active:scale-[0.97] transition-all':'glass border border-border text-white hover:text-white'}`} style={{textShadow:'0 0 8px rgba(0,0,0,0.9)', fontWeight:'700'}}>Squad</button>}
                </>
              )}
              <button onClick={()=>setView('enter-code')} className="border border-primary/40 text-primary font-heading uppercase tracking-wider hover:bg-primary/10 transition-all text-xs font-bold px-4 py-2 rounded-lg inline-flex items-center gap-1.5"><Target size={14} aria-hidden="true" /> Join Auction</button>
              <div className="hidden sm:flex items-center gap-2 bg-glass-premium rounded-full px-4 py-2">
                <Trophy size={14} style={{color:'hsl(45 100% 51%)'}} aria-hidden="true" />
                <span className="text-white text-xs font-semibold" style={{textShadow:'0 0 8px rgba(0,0,0,0.9)', fontWeight:'700'}}>{user?.name}</span>
              </div>
              <a href="/profile" className="text-white hover:text-white text-xs font-bold px-3 py-2 glass border border-border rounded-lg transition-all inline-flex items-center gap-1.5" style={{textShadow:'0 0 8px rgba(0,0,0,0.9)', fontWeight:'700'}}><UserCircle size={14} aria-hidden="true" /> Profile</a>
              <button onClick={() => window.location.href = '/dashboard/team-owner'} className="px-3 py-2 rounded-lg text-xs font-heading uppercase tracking-wider text-white hover:text-primary hover:bg-primary/10 transition-all border border-border/40 mr-1 inline-flex items-center gap-1.5" style={{textShadow:'0 0 8px rgba(0,0,0,0.9)', fontWeight:'700'}}><Home size={14} aria-hidden="true" /> Team Home</button>
          <button onClick={logout} aria-label="Log out" className="text-white hover:text-red-400 text-xs transition-colors" style={{textShadow:'0 0 8px rgba(0,0,0,0.9)', fontWeight:'700'}}><LogOut size={16} aria-hidden="true" /></button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-10">
          {/* Back button */}
          <div className="mb-4"><BackButton href="/team-owner-home" label="Team Owner Home" /></div>
          <NextStepBanner />

          {/* ── HOME (no teams) ── */}
          {view==='home' && (
            <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} className="text-center py-20">
              <motion.div animate={{scale:[1,1.04,1]}} transition={{duration:3,repeat:Infinity}} className="float inline-block mb-8">
                <Trophy size={90} style={{color:'hsl(45 100% 51%)'}} aria-hidden="true" />
              </motion.div>
              <h1 className="text-white mb-4" style={{fontFamily:'Oswald,sans-serif',fontSize:'clamp(48px,8vw,80px)', textShadow:'0 0 15px rgba(0,0,0,0.9)', fontWeight:'900'}}>
                TEAM OWNER <span className="text-gradient-gold">PORTAL</span>
              </h1>
              <p className="text-white text-lg mb-10 max-w-lg mx-auto leading-relaxed" style={{textShadow:'0 0 10px rgba(0,0,0,0.8)', fontWeight:'600'}}>
                Got a join code from the organizer? Enter it below to register your team and compete in live bidding!
              </p>
              <button onClick={()=>setView('enter-code')} className="bg-primary text-primary-foreground font-heading uppercase tracking-wider glow-gold hover:scale-[1.02] active:scale-[0.97] transition-all px-14 py-5 rounded-2xl inline-flex items-center gap-3" style={{fontFamily:'Oswald,sans-serif',fontSize:'24px',letterSpacing:'3px'}}>
                <Target size={26} aria-hidden="true" /> ENTER JOIN CODE
              </button>

              {allAuctions.filter(a=>a.status==='active').length>0 && (
                <div className="mt-20">
                  <h3 className="text-white mb-6" style={{fontFamily:'Oswald,sans-serif',fontSize:'32px', textShadow:'0 0 12px rgba(0,0,0,0.9)', fontWeight:'800'}}>LIVE <span className="text-gradient-gold">AUCTIONS</span></h3>
                  <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    {allAuctions.filter(a=>a.status==='active').map(a=>(
                      <Link key={a._id} href={`/auctions/${a._id}`}
                        className="bg-glass-premium rounded-xl p-5 text-left hover:scale-[1.02] transition-all duration-300" style={{border:'1px solid rgba(34,197,94,0.2)'}}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0"/>
                          <span className="text-white font-bold" style={{textShadow:'0 0 6px rgba(0,0,0,0.9)', fontWeight:'700'}}>{a.name}</span>
                        </div>
                        <p className="text-white text-xs" style={{textShadow:'0 0 4px rgba(0,0,0,0.8)', fontWeight:'600'}}>by {a.organizerId?.name} · {fmt(a.totalPursePerTeam)}/team</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── ENTER CODE ── */}
          {view==='enter-code' && (
            <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} className="max-w-md mx-auto">
              <div className="text-center mb-10">
                <Target size={60} className="text-primary mx-auto" style={{marginBottom:'16px'}} aria-hidden="true" />
                <h2 className="text-white mb-2" style={{fontFamily:'Oswald,sans-serif',fontSize:'52px', textShadow:'0 0 15px rgba(0,0,0,0.9)', fontWeight:'900'}}>ENTER <span className="text-gradient-gold">JOIN CODE</span></h2>
                <p className="text-white" style={{textShadow:'0 0 8px rgba(0,0,0,0.8)', fontWeight:'600'}}>6-character code from your auction organizer</p>
              </div>

              <div className="bg-glass-premium rounded-3xl overflow-hidden p-8" style={{border:'1px solid rgba(245,158,11,0.18)'}}>
                <div className="h-0.5 -mx-8 -mt-8 mb-8" style={{background:'linear-gradient(90deg,transparent,hsl(45, 100%, 51%),transparent)'}}/>

                {/* Big code input */}
                <div className="mb-6">
                  <label className={LBL}>Auction Join Code</label>
                  <input value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6))}
                    onKeyDown={e=>e.key==='Enter'&&checkCode()}
                    placeholder="IPL26A" maxLength={6}
                    className="w-full text-center font-bold text-foreground placeholder-slate-700 rounded-2xl border-2 focus:outline-none transition-all"
                    style={{
                      fontFamily:'Oswald,sans-serif', fontSize:'52px', letterSpacing:'12px',
                      padding:'20px 16px', background:'rgba(255,255,255,0.04)',
                      borderColor: code.length===6 ? 'hsl(45, 100%, 51%)' : 'rgba(255,255,255,0.1)',
                      boxShadow: code.length===6 ? '0 0 20px rgba(245,158,11,0.3)' : 'none',
                    }}/>
                  {/* Character dots */}
                  <div className="flex justify-center gap-3 mt-3">
                    {Array.from({length:6},(_,i)=>(
                      <div key={i} className="w-8 h-1 rounded-full transition-all duration-200"
                        style={{background: i<code.length ? 'hsl(45, 100%, 51%)' : 'rgba(255,255,255,0.1)'}}/>
                    ))}
                  </div>
                </div>

                <button onClick={checkCode} disabled={loading||code.length<4}
                  className="bg-primary text-primary-foreground font-heading uppercase tracking-wider glow-gold hover:scale-[1.02] active:scale-[0.97] transition-all w-full py-4 rounded-xl text-lg" style={{fontFamily:'Oswald,sans-serif',letterSpacing:'2px'}}>
                  {loading ? 'CHECKING...' : <span className="inline-flex items-center justify-center gap-2"><Rocket size={18} aria-hidden="true" /> JOIN AUCTION</span>}
                </button>

                {myTeams.length>0 && (
                  <button onClick={()=>setView('my-teams')} className="w-full mt-3 py-2.5 text-foreground hover:text-foreground text-sm transition-colors inline-flex items-center justify-center gap-1.5">
                    <ArrowLeft size={14} aria-hidden="true" /> Back to My Teams
                  </button>
                )}
              </div>

              {/* Instructions */}
              <div className="mt-8 bg-glass-premium rounded-2xl p-6" style={{border:'1px solid rgba(255,255,255,0.05)'}}>
                <h4 className="text-foreground font-bold mb-4">How to get the join code</h4>
                {[['The organizer creates an auction',ClipboardList],['They get a 6-char code (e.g. IPL26A)',KeyRound],['They share it via WhatsApp / SMS',MessageSquare],['You enter it here and create your team',Trophy]].map(([t,Ic]:any,i)=>(
                  <div key={i} className="flex items-center gap-3 mb-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-black text-xs font-bold flex-shrink-0 bg-primary text-primary-foreground font-heading uppercase tracking-wider glow-gold hover:scale-[1.02] active:scale-[0.97] transition-all">{i+1}</div>
                    <span className="text-foreground text-sm inline-flex items-center gap-1.5">{t} <Ic size={14} aria-hidden="true" /></span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── BUILD TEAM ── */}
          {view==='build-team' && previewAuction && (
            <motion.div initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} className="max-w-2xl mx-auto">
              {/* Auction confirmed banner */}
              <div className="bg-glass-premium rounded-2xl p-4 mb-4 flex items-center gap-4" style={{border:'1px solid rgba(245,158,11,0.3)'}}>
                <CheckCircle2 size={32} className="text-green-400" aria-hidden="true" />
                <div>
                  <div className="text-foreground font-bold text-lg" style={{fontFamily:'Oswald,sans-serif'}}>{previewAuction.name}</div>
                  <div className="text-foreground text-sm">Code verified · {fmt(previewAuction.totalPursePerTeam)} purse · {previewAuction.bidTimer}s timer · RTM: {previewAuction.rtmEnabled?`${previewAuction.rtmPerTeam} cards`:'Disabled'}</div>
                </div>
              </div>

              {/* ── TEAM OWNER FEE PAYMENT ── */}
              {teamOwnerFeeData.required && !teamOwnerFeeData.paid && (
                <div className="mb-6 rounded-2xl overflow-hidden border-2 border-yellow-500/40" style={{background:'hsla(45,100%,51%,0.06)'}}>
                  <div className="px-5 py-4 border-b border-yellow-500/20" style={{background:'hsla(45,100%,51%,0.08)'}}>
                    <div className="font-heading text-lg uppercase tracking-wider text-primary flex items-center gap-1.5"><CreditCard size={16} aria-hidden="true" /> Entry Fee Required</div>
                    <p className="text-muted-foreground text-xs font-display mt-1">
                      {teamOwnerFeeData.mode === 'razorpay'
                        ? `Pay ₹${(teamOwnerFeeData.amount/100).toLocaleString('en-IN')} securely online to join.`
                        : `Pay ₹${(teamOwnerFeeData.amount/100).toLocaleString('en-IN')} directly to the organizer before joining.`}
                    </p>
                  </div>
                  <div className="p-5 space-y-4">
                    {/* Amount */}
                    <div className="text-center p-4 rounded-xl" style={{background:'hsla(45,100%,51%,0.1)',border:'1px solid hsla(45,100%,51%,0.3)'}}>
                      <div className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground mb-1">Amount to Pay</div>
                      <div className="font-heading text-5xl text-gradient-gold">₹{(teamOwnerFeeData.amount/100).toLocaleString('en-IN')}</div>
                    </div>

                    {/* RAZORPAY — online checkout, preferred */}
                    {teamOwnerFeeData.mode === 'razorpay' && (
                      <button type="button" disabled={payingFee} onClick={payEntryFeeOnline}
                        className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-heading uppercase tracking-widest text-sm glow-gold hover:scale-[1.02] transition-all disabled:opacity-60">
                        {payingFee ? <span className="inline-flex items-center gap-1.5"><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Opening Payment…</span> : <span className="inline-flex items-center gap-1.5"><Lock size={14} aria-hidden="true" /> Pay ₹{(teamOwnerFeeData.amount/100).toLocaleString('en-IN')} Now</span>}
                      </button>
                    )}
                    {teamOwnerFeeData.mode === 'razorpay' && (
                      <p className="text-center text-[10px] text-muted-foreground font-display flex items-center justify-center gap-1"><Lock size={10} aria-hidden="true" /> Secured by Razorpay · UPI, Cards, Net Banking accepted</p>
                    )}

                    {/* UPI / QR fallback — organizer hasn't connected Razorpay */}
                    {teamOwnerFeeData.mode === 'upi' && (
                      <div className="rounded-xl overflow-hidden border border-blue-500/30">
                        <div className="px-4 py-2 border-b border-blue-500/20" style={{background:'hsla(210,100%,55%,0.08)'}}>
                          <div className="font-heading text-xs uppercase tracking-wider text-blue-400">Pay via UPI / GPay QR</div>
                        </div>
                        <div className="p-4 space-y-3">
                          {(teamOwnerFeeData.qrCodeUrl || teamOwnerFeeData.organizerUpi) ? (
                            <>
                              {teamOwnerFeeData.qrCodeUrl && (
                                <div className="flex justify-center">
                                  <img src={imgUrl(teamOwnerFeeData.qrCodeUrl)} alt="Organizer payment QR code"
                                    className="w-48 h-48 object-contain rounded-xl border border-blue-500/30 bg-white p-2" />
                                </div>
                              )}
                              {teamOwnerFeeData.organizerUpi && (
                                <div>
                                  <div className="text-[9px] font-heading uppercase tracking-wider text-muted-foreground mb-1">UPI ID</div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xl font-bold text-foreground flex-1">{teamOwnerFeeData.organizerUpi}</span>
                                    <button onClick={() => { navigator.clipboard.writeText(teamOwnerFeeData.organizerUpi!); toast.success('UPI ID copied!'); }}
                                      className="px-2 py-1 rounded text-[10px] font-heading uppercase text-blue-400 border border-blue-500/30 hover:bg-blue-500/10 inline-flex items-center gap-1"><ClipboardCopy size={11} aria-hidden="true" /> Copy</button>
                                  </div>
                                </div>
                              )}
                              {teamOwnerFeeData.organizerName && (
                                <div>
                                  <div className="text-[9px] font-heading uppercase tracking-wider text-muted-foreground mb-1">Account Name</div>
                                  <div className="text-foreground font-semibold">{teamOwnerFeeData.organizerName}</div>
                                </div>
                              )}
                              {teamOwnerFeeData.organizerUpi && (
                                <a href={`upi://pay?pa=${teamOwnerFeeData.organizerUpi}&pn=${encodeURIComponent(teamOwnerFeeData.organizerName||'')}&am=${teamOwnerFeeData.amount/100}&tn=${encodeURIComponent('Team Owner Entry Fee')}`}
                                  className="block w-full py-2.5 rounded-xl text-center text-xs font-heading uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-all">
                                  <Smartphone size={14} className="inline mr-1" aria-hidden="true" />Open UPI App
                                </a>
                              )}
                            </>
                          ) : (
                            <div className="text-center py-4">
                              <Phone size={28} className="mx-auto mb-2 text-muted-foreground" aria-hidden="true" />
                              <p className="text-muted-foreground text-sm font-display">The organizer hasn't set up a payment method yet.</p>
                              {teamOwnerFeeData.organizerWhatsApp && (
                                <a href={`https://wa.me/${teamOwnerFeeData.organizerWhatsApp.replace(/\D/g,'')}?text=${encodeURIComponent(`Hi, I want to join ${previewAuction?.name}. Please share your UPI ID or QR code for ₹${(teamOwnerFeeData.amount/100).toLocaleString('en-IN')} entry fee.`)}`}
                                  target="_blank" className="mt-3 inline-block px-5 py-2 rounded-lg text-xs font-heading uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-all">
                                  <MessageCircle size={14} className="inline mr-1" aria-hidden="true" />WhatsApp Organizer
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* UTR Input — only needed for manual UPI mode */}
                    {teamOwnerFeeData.mode === 'upi' && (
                      <>
                        <div>
                          <label className={LBL}>Enter UTR / Transaction Reference Number *</label>
                          <input value={teamOwnerFeeData.utrNumber}
                            onChange={e => setTeamOwnerFeeData(p=>({...p,utrNumber:e.target.value}))}
                            className={INP} placeholder="e.g. 423856789012" />
                          <p className="text-[10px] text-muted-foreground mt-1 font-display">Found in your UPI app, on the Payment Success screen</p>
                        </div>
                        <button type="button" onClick={()=>{
                          if (!teamOwnerFeeData.utrNumber.trim()) { toast.error('Enter your UTR number first'); return; }
                          setTeamOwnerFeeData(p=>({...p,paid:true}));
                          toast.success('Fee confirmed! Now create your team below.');
                        }} className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-heading uppercase tracking-widest text-sm glow-gold hover:scale-[1.02] transition-all">
                          <CheckCircle2 size={16} className="inline mr-1.5" aria-hidden="true" />Confirm Payment & Continue
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
              {teamOwnerFeeData.required && teamOwnerFeeData.paid && (
                <div className="mb-4 px-4 py-3 rounded-xl border border-green-500/30 bg-green-500/08 flex items-center gap-3">
                  <CheckCircle2 size={22} className="text-green-400" aria-hidden="true" />
                  <div>
                    <div className="text-green-400 font-heading text-sm uppercase tracking-wider">Entry Fee Paid</div>
                    <div className="text-muted-foreground text-xs font-display">{teamOwnerFeeData.razorpayPaymentId ? `Payment ID: ${teamOwnerFeeData.razorpayPaymentId}` : `UTR: ${teamOwnerFeeData.utrNumber}`} · ₹{(teamOwnerFeeData.amount/100).toLocaleString('en-IN')}</div>
                  </div>
                </div>
              )}

              <div className="text-center mb-8">
                <h2 className="text-foreground mb-1" style={{fontFamily:'Oswald,sans-serif',fontSize:'52px'}}>BUILD YOUR <span className="text-gradient-gold">TEAM</span></h2>
                <p className="text-foreground">This is how you'll appear in the live auction</p>
              </div>

              <div className="bg-glass-premium rounded-3xl overflow-hidden" style={{border:'1px solid rgba(245,158,11,0.15)'}}>
                <div className="h-1" style={{background:`linear-gradient(90deg,${tf.primaryColor},${tf.primaryColor}80)`}}/>
                <div className="p-8">
                  {/* Live Preview */}
                  <div className="rounded-2xl p-5 mb-8 flex items-center gap-5 transition-all duration-300"
                    style={{background:`${tf.primaryColor}10`,border:`2px solid ${tf.primaryColor}30`}}>
                    {tLogo
                      ? <img src={URL.createObjectURL(tLogo)} alt="" className="w-20 h-20 rounded-2xl object-cover flex-shrink-0"/>
                      : <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-black font-bold flex-shrink-0"
                          style={{background:`linear-gradient(135deg,${tf.primaryColor},${tf.primaryColor}88)`,fontFamily:'Oswald,sans-serif',fontSize:'28px'}}>
                          {tf.shortName||'XX'}
                        </div>
                    }
                    <div>
                      <div className="text-foreground font-bold text-xl" style={{fontFamily:'Oswald,sans-serif'}}>{tf.name||'Your Team Name'}</div>
                      <div className="text-foreground text-sm">{tf.ownerName||'Owner Name'}{tf.city?` · ${tf.city}`:''}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-3 h-3 rounded-full" style={{background:tf.primaryColor}}/>
                        <span className="text-xs text-foreground">{tf.primaryColor}</span>
                        <span className="text-xs text-foreground">· {fmt(previewAuction.totalPursePerTeam)} purse</span>
                      </div>
                    </div>
                  </div>

                  {/* Block form if fee not paid */}
                  {teamOwnerFeeData.required && !teamOwnerFeeData.paid && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4 text-center">
                      <p className="text-yellow-400 text-sm font-display flex items-center justify-center gap-1.5"><AlertTriangle size={14} aria-hidden="true" /> Complete the entry fee payment above before creating your team</p>
                    </div>
                  )}
                  <form onSubmit={createTeam} className={`space-y-5 ${teamOwnerFeeData.required && !teamOwnerFeeData.paid ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className={LBL}>Team Name *</label>
                        <input value={tf.name} onChange={e=>setTf(p=>({...p,name:e.target.value}))} className={INP} placeholder="e.g. Mumbai Mavericks" required/>
                      </div>
                      <div>
                        <label className={LBL}>Short Code * (max 4)</label>
                        <input value={tf.shortName} onChange={e=>setTf(p=>({...p,shortName:e.target.value.toUpperCase().slice(0,4)}))} className={INP} placeholder="e.g. MUM" maxLength={4} required/>
                      </div>
                      <div>
                        <label className={LBL}>Owner Name</label>
                        <input value={tf.ownerName} onChange={e=>setTf(p=>({...p,ownerName:e.target.value}))} className={INP} placeholder="Your name"/>
                      </div>
                      <div>
                        <label className={LBL}>City / Home Ground</label>
                        <input value={tf.city} onChange={e=>setTf(p=>({...p,city:e.target.value}))} className={INP} placeholder="e.g. Mumbai"/>
                      </div>
                      <div>
                        <label className={LBL}>Team Color</label>
                        <div className="flex gap-2">
                          <input type="color" value={tf.primaryColor} onChange={e=>setTf(p=>({...p,primaryColor:e.target.value}))} className="w-12 h-12 rounded-xl cursor-pointer p-1.5 border border-border bg-transparent flex-shrink-0"/>
                          <input value={tf.primaryColor} onChange={e=>setTf(p=>({...p,primaryColor:e.target.value}))} className={INP}/>
                        </div>
                      </div>
                    </div>

                    {/* Color presets */}
                    <div>
                      <label className={LBL}>Quick Color Presets</label>
                      <div className="flex gap-2 flex-wrap">
                        {COLOR_PRESETS.map(c=>(
                          <button key={c} type="button" onClick={()=>setTf(p=>({...p,primaryColor:c}))}
                            className={`w-9 h-9 rounded-xl transition-all hover:scale-110 ${tf.primaryColor===c?'ring-2 ring-white ring-offset-2 scale-110':''}`}
                            style={{background: c }}/>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className={LBL}>Team Logo (optional)</label>
                      <input type="file" accept="image/*" onChange={e=>setTLogo(e.target.files?.[0]||null)}
                        className="w-full text-foreground text-sm file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-gold-500/15 file:text-amber-400 file:font-bold hover:file:bg-amber-500/25 cursor-pointer"
                        style={{'--tw-file-btn-bg':'rgba(245,158,11,0.15)'} as any}/>
                    </div>

                    <button type="submit" disabled={loading} className="bg-primary text-primary-foreground font-heading uppercase tracking-wider glow-gold hover:scale-[1.02] active:scale-[0.97] transition-all w-full py-5 rounded-xl text-xl" style={{fontFamily:'Oswald,sans-serif',letterSpacing:'2px'}}>
                      {loading ? 'CREATING TEAM...' : <span className="inline-flex items-center justify-center gap-2"><Trophy size={20} aria-hidden="true" /> CREATE TEAM & JOIN AUCTION</span>}
                    </button>

                    <button type="button" onClick={()=>setView('enter-code')} className="w-full py-3 text-foreground hover:text-foreground font-bold text-sm transition-colors inline-flex items-center justify-center gap-1.5">
                      <ArrowLeft size={14} aria-hidden="true" /> Change join code
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── MY TEAMS DASHBOARD ── */}
          {view==='my-teams' && (
            <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-foreground" style={{fontFamily:'Oswald,sans-serif',fontSize:'52px'}}>MY <span className="text-gradient-gold">TEAMS</span></h2>
                  <p className="text-foreground text-sm">{myTeams.length} auction{myTeams.length!==1?'s':''} joined</p>
                </div>
                <button onClick={()=>setView('enter-code')} className="bg-primary text-primary-foreground font-heading uppercase tracking-wider glow-gold hover:scale-[1.02] active:scale-[0.97] transition-all px-6 py-3 rounded-xl text-sm" style={{fontFamily:'Oswald,sans-serif',letterSpacing:'1px'}}>+ JOIN MORE</button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {myTeams.map(team=>(
                  <motion.div key={team._id} whileHover={{y:-6,transition:{duration:0.2}}}
                    className="bg-glass-premium rounded-3xl overflow-hidden hover:scale-[1.02] transition-all duration-300" style={{border:`1px solid ${team.primaryColor}22`}}>
                    <div className="h-1.5" style={{background:`linear-gradient(90deg,${team.primaryColor},${team.primaryColor}60)`}}/>
                    <div className="p-7">
                      {/* Team header */}
                      <div className="flex items-center gap-4 mb-6">
                        {team.logo
                          ? <img src={imgUrl(team.logo)} alt="" className="w-18 h-18 rounded-2xl object-cover flex-shrink-0" style={{width:72,height:72}}/>
                          : <div className="rounded-2xl flex items-center justify-center text-black font-bold text-2xl flex-shrink-0"
                              style={{width:72,height:72,background:`linear-gradient(135deg,${team.primaryColor},${team.primaryColor}80)`,fontFamily:'Oswald,sans-serif'}}>
                              {team.shortName?.slice(0,2)}
                            </div>
                        }
                        <div className="flex-1">
                          <h3 className="text-foreground mb-0.5" style={{fontFamily:'Oswald,sans-serif',fontSize:'26px'}}>{team.name}</h3>
                          <p className="text-foreground text-sm">{team.ownerName}{team.city?` · ${team.city}`:''}</p>
                          <p className="text-foreground text-xs mt-0.5">{team.auction?.name}</p>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-heading uppercase tracking-wider border ${team.auction?.status==='active'?'border-green-500/30 bg-green-500/10 text-green-400':'border-slate-500/30 bg-slate-500/10 text-foreground'}`}>
                          {team.auction?.status==='active'&&<span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse mr-1"/>}
                          {team.auction?.status?.toUpperCase()}
                        </span>
                      </div>

                      {/* Stats grid */}
                      <div className="grid grid-cols-4 gap-2 mb-5">
                        {[
                          [Wallet,fmt(team.purse),'Purse Left'],
                          [TrendingDown,fmt(team.initialPurse-team.purse),'Spent'],
                          [Users,`${team.playersCount}/${team.maxPlayers}`,'Players'],
                          [Target,`${team.rtmTotal-team.rtmUsed}/${team.rtmTotal}`,'RTM'],
                        ].map(([Ic,v,l]:any)=>(
                          <div key={String(l)} className="glass rounded-xl p-2.5 text-center">
                            <Ic size={16} className="mx-auto mb-0.5 text-primary" aria-hidden="true" />
                            <div className="font-bold text-gradient-gold" style={{fontFamily:'Oswald,sans-serif',fontSize:'14px'}}>{v}</div>
                            <div className="text-foreground" style={{fontSize:'10px'}}>{l}</div>
                          </div>
                        ))}
                      </div>

                      {/* Purse bar */}
                      <div className="w-full bg-secondary/20 rounded-full h-2 mb-5 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{width:`${(team.purse/team.initialPurse)*100}%`,background:`linear-gradient(90deg,${team.primaryColor},${team.primaryColor}80)`}}/>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3">
                        <Link href={`/auctions/${team.auction?._id}`}
                          className={`flex-1 py-3.5 rounded-xl font-bold text-sm text-center transition-all hover:opacity-90 ${
                            team.auction?.status==='active'
                              ? ''
                              : 'border border-primary/40 font-heading uppercase tracking-wider hover:bg-primary/10 transition-all'
                          }`}
                          style={team.auction?.status==='active'
                            ? {
                                background:`linear-gradient(135deg,${team.primaryColor},${team.primaryColor}cc)`,
                                color: isLightColor(team.primaryColor || '#000000') ? '#000000' : '#ffffff'
                              }
                            : {borderColor:team.primaryColor,color:team.primaryColor}}
                        >
                          {team.auction?.status==='active' ? <span className="inline-flex items-center justify-center gap-1.5"><Radio size={14} aria-hidden="true" /> BID LIVE NOW</span> : <span className="inline-flex items-center justify-center gap-1.5"><Eye size={14} aria-hidden="true" /> View Auction</span>}
                        </Link>
                        <button onClick={()=>{setSelTeam(team);setSquad(team.players||[]);setView('squad')}}
                          className="px-5 py-3.5 glass border border-border text-foreground/90 rounded-xl text-sm font-bold hover:border-white/25 transition-all">
                          Squad
                        </button>
                        <button onClick={()=>startEditTeam(team)} aria-label="Edit team"
                          className="px-3 py-3.5 glass border border-blue-500/30 text-blue-400 rounded-xl text-sm font-bold hover:border-blue-400/50 hover:bg-blue-500/10 transition-all">
                          <Pencil size={15} aria-hidden="true" />
                        </button>
                        <button onClick={()=>deleteTeam(team._id)} aria-label="Delete team"
                          className="px-3 py-3.5 glass border border-red-500/30 text-red-400 rounded-xl text-sm font-bold hover:border-red-400/50 hover:bg-red-500/10 transition-all">
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Edit Team Modal */}
              <AnimatePresence>
                {showEditForm && (
                  <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:0.9}} className="bg-glass-premium rounded-3xl p-8 max-w-md w-full border border-primary/20">
                      <h3 className="text-foreground mb-6" style={{fontFamily:'Oswald,sans-serif',fontSize:'32px'}}>EDIT <span className="text-gradient-gold">TEAM</span></h3>
                      <form onSubmit={saveTeamEdit} className="space-y-4">
                        <div>
                          <label className={LBL}>Team Name *</label>
                          <input value={tf.name} onChange={e=>setTf(p=>({...p,name:e.target.value}))} className={INP} placeholder="Team name" required/>
                        </div>
                        <div>
                          <label className={LBL}>Short Code *</label>
                          <input value={tf.shortName} onChange={e=>setTf(p=>({...p,shortName:e.target.value.toUpperCase().slice(0,4)}))} className={INP} placeholder="MI" maxLength={4} required/>
                        </div>
                        <div>
                          <label className={LBL}>Owner Name</label>
                          <input value={tf.ownerName} onChange={e=>setTf(p=>({...p,ownerName:e.target.value}))} className={INP} placeholder="Your name"/>
                        </div>
                        <div>
                          <label className={LBL}>City</label>
                          <input value={tf.city} onChange={e=>setTf(p=>({...p,city:e.target.value}))} className={INP} placeholder="City"/>
                        </div>
                        <div>
                          <label className={LBL}>Team Color</label>
                          <div className="flex gap-2 flex-wrap mt-2">
                            {COLOR_PRESETS.map(c=>(
                              <button key={c} type="button" onClick={()=>setTf(p=>({...p,primaryColor:c}))}
                                className={`w-8 h-8 rounded-lg border-2 transition-all ${tf.primaryColor===c?'border-white scale-110':'border-transparent'}`}
                                style={{backgroundColor:c}}/>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className={LBL}>Team Logo</label>
                          <input type="file" accept="image/*" onChange={e=>setTLogo(e.target.files?.[0]||null)} className="w-full text-foreground text-xs file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-heading file:text-xs file:uppercase file:tracking-wider cursor-pointer hover:file:bg-primary/20"/>
                          {tLogo && (
                            <div className="mt-2">
                              <img src={URL.createObjectURL(tLogo)} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-primary/20"/>
                              <p className="text-xs text-foreground mt-1">New logo preview</p>
                            </div>
                          )}
                          {editTeam?.logo && !tLogo && (
                            <div className="mt-2">
                              <img src={imgUrl(editTeam.logo)} alt="Current" className="w-16 h-16 rounded-lg object-cover border border-primary/20"/>
                              <p className="text-xs text-foreground mt-1">Current logo</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-3 pt-4">
                          <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-heading uppercase tracking-wider glow-gold hover:scale-[1.02] transition-all disabled:opacity-50 inline-flex items-center justify-center gap-1.5">{loading?'Saving...':<><Save size={14} aria-hidden="true" /> Save Changes</>}</button>
                          <button type="button" onClick={()=>{setShowEditForm(false);setEditTeam(null);}} className="flex-1 py-3 rounded-xl glass border border-border text-foreground hover:border-white/25 transition-all">Cancel</button>
                        </div>
                      </form>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Public auction list */}
              <div className="mt-16">
                <h3 className="text-foreground mb-5" style={{fontFamily:'Oswald,sans-serif',fontSize:'32px'}}>ALL <span className="text-gradient-gold">AUCTIONS</span></h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {allAuctions.map(a=>(
                    <div key={a._id} className="bg-glass-premium rounded-xl p-5 hover:scale-[1.02] transition-all duration-300" style={{border:'1px solid rgba(255,255,255,0.05)'}}>
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-foreground font-bold" style={{fontFamily:'Oswald,sans-serif',fontSize:'18px'}}>{a.name}</h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-heading uppercase tracking-wider border ${a.status==='active'?'border-green-500/30 bg-green-500/10 text-green-400':'border-slate-500/30 bg-slate-500/10 text-foreground'}`}>{a.status}</span>
                      </div>
                      <p className="text-foreground text-xs mb-3">by {a.organizerId?.name}</p>
                      <div className="flex gap-2">
                        <Link href={`/auctions/${a._id}`} className={`flex-1 block text-center py-2 text-xs font-bold rounded-lg transition-all ${a.status==='active'?'bg-green-500/15 border border-green-500/25 text-green-400 hover:bg-green-500/25':'glass border border-border text-foreground hover:text-foreground'}`}>
                          {a.status==='active'?<span className="inline-flex items-center justify-center gap-1"><Radio size={12} aria-hidden="true" /> Watch Live</span>:'View'}
                        </Link>
                        <button onClick={() => fetchAuctionDetails(a._id)} className="flex-1 py-2 text-xs font-bold rounded-lg glass border border-primary/30 text-primary hover:bg-primary/10 transition-all inline-flex items-center justify-center gap-1">
                          <FileBarChart size={12} aria-hidden="true" /> Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Auction Details Section */}
              {selectedAuction && auctionDetails && (
                <div id="auction-details-section" className="mt-16">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-foreground" style={{fontFamily:'Oswald,sans-serif',fontSize:'32px'}}>AUCTION <span className="text-gradient-gold">DETAILS</span></h3>
                    <button onClick={() => { setSelectedAuction(null); setAuctionDetails(null); }} className="px-4 py-2 rounded-lg glass border border-border text-foreground hover:border-white/25 transition-all text-sm inline-flex items-center gap-1.5">
                      <XCircle size={14} aria-hidden="true" /> Close
                    </button>
                  </div>
                  
                  <div className="bg-glass-premium rounded-3xl p-8" style={{border:'1px solid rgba(245,158,11,0.18)'}}>
                    {/* Auction Header */}
                    <div className="flex items-start justify-between mb-8">
                      <div>
                        <h4 className="text-foreground font-bold mb-2" style={{fontFamily:'Oswald,sans-serif',fontSize:'24px'}}>{auctionDetails.name}</h4>
                        <p className="text-foreground text-sm mb-1">{auctionDetails.description}</p>
                        <p className="text-foreground text-xs">by {auctionDetails.organizerId?.name}</p>
                        <div className="flex items-center gap-4 mt-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-heading uppercase tracking-wider border ${auctionDetails.status==='active'?'border-green-500/30 bg-green-500/10 text-green-400':'border-slate-500/30 bg-slate-500/10 text-foreground'}`}>
                            {auctionDetails.status}
                          </span>
                          <span className="text-foreground text-xs inline-flex items-center gap-1"><Calendar size={11} aria-hidden="true" /> {new Date(auctionDetails.date).toLocaleDateString()}</span>
                          <span className="text-foreground text-xs inline-flex items-center gap-1"><Timer size={11} aria-hidden="true" /> {auctionDetails.bidTimer}s timer</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-primary text-sm font-heading uppercase tracking-wider mb-1">Join Code</div>
                        <div className="text-foreground font-bold text-2xl tracking-wider" style={{fontFamily:'Oswald,sans-serif'}}>{auctionDetails.joinCode}</div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      <div className="glass rounded-xl p-4 text-center">
                        <div className="text-foreground text-sm mb-1">Total Teams</div>
                        <div className="text-gradient-gold font-bold text-xl" style={{fontFamily:'Oswald,sans-serif'}}>{auctionDetails.teams?.length || 0}</div>
                      </div>
                      <div className="glass rounded-xl p-4 text-center">
                        <div className="text-foreground text-sm mb-1">Total Players</div>
                        <div className="text-gradient-gold font-bold text-xl" style={{fontFamily:'Oswald,sans-serif'}}>{auctionDetails.players?.length || 0}</div>
                      </div>
                      <div className="glass rounded-xl p-4 text-center">
                        <div className="text-foreground text-sm mb-1">Purse/Team</div>
                        <div className="text-gradient-gold font-bold text-xl" style={{fontFamily:'Oswald,sans-serif'}}>{fmt(auctionDetails.totalPursePerTeam)}</div>
                      </div>
                      <div className="glass rounded-xl p-4 text-center">
                        <div className="text-foreground text-sm mb-1">Bid Increment</div>
                        <div className="text-gradient-gold font-bold text-xl" style={{fontFamily:'Oswald,sans-serif'}}>{fmt(auctionDetails.bidIncrement)}</div>
                      </div>
                    </div>

                    {/* Teams Section */}
                    <div className="mb-8">
                      <h5 className="text-foreground font-bold mb-4" style={{fontFamily:'Oswald,sans-serif',fontSize:'20px'}}>PARTICIPATING <span className="text-gradient-gold">TEAMS</span></h5>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {auctionDetails.teams?.map((team: any) => (
                          <div key={team._id} className="glass rounded-xl p-4 border border-primary/20">
                            <div className="flex items-center gap-3 mb-2">
                              {team.logo ? (
                                <img src={imgUrl(team.logo)} alt="" className="w-10 h-10 rounded-lg object-cover"/>
                              ) : (
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-black font-bold text-sm" style={{background:team.primaryColor}}>
                                  {team.shortName?.slice(0,2)}
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="text-foreground font-bold text-sm">{team.name}</div>
                                <div className="text-foreground text-xs">{team.ownerName}</div>
                              </div>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-foreground inline-flex items-center gap-1"><Wallet size={11} aria-hidden="true" /> {fmt(team.purse)}</span>
                              <span className="text-foreground inline-flex items-center gap-1"><Users size={11} aria-hidden="true" /> {team.playersCount || 0}/{team.maxPlayers}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Players Section */}
                    <div>
                      <h5 className="text-foreground font-bold mb-4" style={{fontFamily:'Oswald,sans-serif',fontSize:'20px'}}>PLAYER <span className="text-gradient-gold">POOL</span></h5>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {auctionDetails.players?.map((player: any) => (
                          <div key={player._id} className="glass rounded-xl p-4 border border-primary/20">
                            <div className="flex items-start gap-3 mb-3">
                              {/* Player Photo */}
                              <div className="flex-shrink-0">
                                {player.photo ? (
                                  <img src={player.photo} alt={player.name} className="w-12 h-12 rounded-lg object-cover border border-primary/20"/>
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
                                    <UserCircle size={20} className="text-primary" aria-hidden="true" />
                                  </div>
                                )}
                              </div>
                              
                              {/* Player Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="text-foreground font-bold text-sm truncate">{player.name}</div>
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 ${
                                    player.sold ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                                  }`}>
                                    {player.sold ? 'SOLD' : 'AVAILABLE'}
                                  </span>
                                </div>
                                <div className="text-foreground text-xs mb-2">{player.role} · {player.category}</div>
                                
                                {/* Sold Information - Exact Format */}
                                {player.sold && player.team && (
                                  <div className="bg-red-500/10 rounded-lg p-2 border border-red-500/20">
                                    <div className="flex items-center justify-between">
                                      <span className="text-red-400 font-bold text-sm">{player.team.shortName}</span>
                                      <span className="text-red-400 font-bold text-sm">₹{fmt(player.soldPrice || player.finalPrice || player.basePrice)}</span>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Base Price for Available Players */}
                                {!player.sold && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-foreground text-xs">Base Price:</span>
                                    <span className="text-gradient-gold font-bold text-sm">₹{fmt(player.basePrice)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── SQUAD ── */}
          {view==='squad' && selTeam && (
            <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}>
              <div className="flex items-center gap-4 mb-6">
                <button onClick={()=>setView('my-teams')} className="flex items-center gap-2 text-foreground hover:text-foreground transition-all group">
                  <span className="w-8 h-8 rounded-lg glass border border-border flex items-center justify-center group-hover:border-primary/40 group-hover:bg-gold/5 transition-all">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  <span className="text-sm font-bold hidden sm:block">BACK</span>
                </button>
                {/* Team logo */}
                <div className="flex-shrink-0">
                  {selTeam.logo ? (
                    <img
                      src={imgUrl(selTeam.logo)}
                      alt="Team Logo"
                      className="w-12 h-12 rounded-lg object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const sib = e.currentTarget.nextElementSibling as HTMLElement | null;
                        if (sib) sib.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="w-12 h-12 rounded-lg items-center justify-center font-bold text-sm"
                    style={{
                      background: `linear-gradient(135deg, ${selTeam.primaryColor}, ${selTeam.primaryColor}88)`,
                      color: isLightColor(selTeam.primaryColor || '#000000') ? '#000000' : '#ffffff',
                      display: selTeam.logo ? 'none' : 'flex',
                      fontFamily: 'Oswald,sans-serif',
                    }}
                  >
                    {selTeam.shortName?.slice(0, 2).toUpperCase()}
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-foreground" style={{fontFamily:'Oswald,sans-serif',fontSize:'44px'}}>{selTeam.name} <span className="text-gradient-gold">SQUAD</span></h2>
                  <p className="text-foreground text-sm">{squad.length} players · {selTeam.playersCount || squad.length}/{selTeam.maxPlayers || '—'} slots filled</p>
                </div>
                {selTeam.auction?.status==='active' && (
                  <Link
                    href={`/auctions/${selTeam.auction?._id}`}
                    className="font-heading uppercase tracking-wider hover:scale-[1.02] active:scale-[0.97] transition-all px-6 py-3 rounded-xl text-sm font-bold"
                    style={{
                      fontFamily:'Oswald,sans-serif',
                      letterSpacing:'1px',
                      background: selTeam.primaryColor || 'hsl(45,100%,51%)',
                      color: isLightColor(selTeam.primaryColor || '#000000') ? '#000000' : '#ffffff',
                      boxShadow: `0 0 20px ${selTeam.primaryColor}60`,
                    }}
                  ><Radio size={16} className="inline mr-1.5" aria-hidden="true" />BID NOW</Link>
                )}
                {selTeam.auction?.status==='completed' && (
                  <>
                    <Link href={`/auctions/${selTeam.auction?._id}`} className="border border-primary/40 text-primary font-heading uppercase tracking-wider hover:bg-primary/10 transition-all px-6 py-3 rounded-xl text-sm inline-flex items-center gap-1.5" style={{fontFamily:'Oswald,sans-serif',letterSpacing:'1px'}}><FileBarChart size={16} aria-hidden="true" /> Final Results</Link>
                    <button onClick={async ()=>{
                      const toastId = toast.loading('Building squad report…');
                      try {
                        let sponsors: any[] = [];
                        try { sponsors = (await api.get(`/packages/sponsors/${selTeam.auction?._id}`)).data.sponsors || []; } catch {}
                        await generateSquadBookPdf({
                          auctionName: selTeam.auction?.name || 'Beast Cricket League',
                          teamReports: [{
                            team: { name: selTeam.name, primaryColor: selTeam.primaryColor, logo: selTeam.logo, ownerName: selTeam.ownerName || user?.name },
                            squad,
                            squadSize: squad.length,
                            totalSpent: selTeam.initialPurse - selTeam.purse,
                            remainingPurse: selTeam.purse,
                          }],
                          sponsors,
                          imgUrl,
                          onProgress: (msg) => toast.loading(msg, { id: toastId }),
                        });
                        toast.success('Squad PDF downloaded!', { id: toastId });
                      } catch (e) {
                        console.error(e);
                        toast.error('PDF generation failed — please try again', { id: toastId });
                      }
                    }} className="border border-green-500/40 text-green-400 font-heading uppercase tracking-wider hover:bg-green-500/10 transition-all px-6 py-3 rounded-xl text-sm inline-flex items-center gap-1.5" style={{fontFamily:'Oswald,sans-serif',letterSpacing:'1px'}}><ClipboardList size={16} aria-hidden="true" /> Squad PDF</button>
                    <Link href={`/poster/${selTeam.auction?._id}`} className="border border-purple-500/40 text-purple-400 font-heading uppercase tracking-wider hover:bg-purple-500/10 transition-all px-6 py-3 rounded-xl text-sm inline-flex items-center gap-1.5" style={{fontFamily:'Oswald,sans-serif',letterSpacing:'1px'}}><Palette size={16} aria-hidden="true" /> Poster &amp; Social Kit</Link>
                    <Link href="/reports" className="border border-blue-500/40 text-blue-400 font-heading uppercase tracking-wider hover:bg-blue-500/10 transition-all px-6 py-3 rounded-xl text-sm inline-flex items-center gap-1.5" style={{fontFamily:'Oswald,sans-serif',letterSpacing:'1px'}}><FileBarChart size={16} aria-hidden="true" /> Reports</Link>
                  </>
                )}
              </div>

              {/* Purse display — always visible, updates in real-time */}
              {selTeam.auction?.status !== 'completed' && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-glass-premium rounded-xl p-4" style={{border:'1px solid rgba(245,158,11,0.2)'}}>
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1" style={{fontFamily:'Oswald,sans-serif'}}>Remaining Purse</div>
                    <motion.div
                      key={selTeam.purse}
                      initial={{scale:0.92,opacity:0.7}}
                      animate={{scale:1,opacity:1}}
                      transition={{duration:0.3}}
                      className="text-2xl font-bold text-gradient-gold"
                      style={{fontFamily:'Oswald,sans-serif'}}
                    >
                      {fmt(selTeam.purse || 0)}
                    </motion.div>
                    <div className="text-xs text-muted-foreground mt-1">of {fmt(selTeam.initialPurse || 0)} initial</div>
                  </div>
                  <div className="bg-glass-premium rounded-xl p-4" style={{border:'1px solid rgba(255,255,255,0.06)'}}>
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1" style={{fontFamily:'Oswald,sans-serif'}}>Spent</div>
                    <motion.div
                      key={(selTeam.initialPurse || 0) - (selTeam.purse || 0)}
                      initial={{scale:0.92,opacity:0.7}}
                      animate={{scale:1,opacity:1}}
                      transition={{duration:0.3}}
                      className="text-2xl font-bold text-foreground"
                      style={{fontFamily:'Oswald,sans-serif'}}
                    >
                      {fmt((selTeam.initialPurse || 0) - (selTeam.purse || 0))}
                    </motion.div>
                    <div className="text-xs text-muted-foreground mt-1">{squad.length} player{squad.length !== 1 ? 's' : ''} acquired</div>
                  </div>
                </div>
              )}

              {/* Auction ended — show full financial summary */}
              {selTeam.auction?.status==='completed' && (
                <div className="bg-glass-premium rounded-2xl p-6 mb-8" style={{border:'1px solid rgba(245,158,11,0.2)'}}>
                  <h3 className="text-gradient-gold mb-5 flex items-center gap-2" style={{fontFamily:'Oswald,sans-serif',fontSize:'28px'}}><Trophy size={26} aria-hidden="true" /> AUCTION FINAL SUMMARY</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {[
                      [Wallet,fmt(selTeam.initialPurse),'Starting Purse'],
                      [TrendingDown,fmt(selTeam.initialPurse - selTeam.purse),'Total Spent'],
                      [Banknote,fmt(selTeam.purse),'Purse Remaining'],
                      [Users,String(squad.length),'Players Acquired'],
                    ].map(([Ic,v,l]:any)=>(
                      <div key={String(l)} className="bg-glass-premium rounded-xl p-4 text-center">
                        <Ic size={22} className="mx-auto mb-1 text-primary" aria-hidden="true" />
                        <div className="text-gradient-gold font-bold" style={{fontFamily:'Oswald,sans-serif',fontSize:'22px'}}>{v}</div>
                        <div className="text-foreground text-xs uppercase tracking-wide">{l}</div>
                      </div>
                    ))}
                  </div>
                  {/* Spending breakdown bar */}
                  <div>
                    <div className="flex justify-between text-xs text-foreground mb-1.5">
                      <span>Purse Used</span>
                      <span>{Math.round(((selTeam.initialPurse-selTeam.purse)/selTeam.initialPurse)*100)}%</span>
                    </div>
                    <div className="w-full bg-secondary/20 rounded-full h-3 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{width:`${Math.round(((selTeam.initialPurse-selTeam.purse)/selTeam.initialPurse)*100)}%`,background:`linear-gradient(90deg,${selTeam.primaryColor},${selTeam.primaryColor}80)`}}/>
                    </div>
                  </div>
                </div>
              )}

              {squad.length===0 ? (
                <div className="text-center py-24 bg-glass-premium rounded-3xl" style={{border:'1px solid rgba(255,255,255,0.05)'}}>
                  <UserCircle size={56} className="mx-auto text-muted-foreground" style={{marginBottom:'16px'}} aria-hidden="true" />
                  <h3 className="text-foreground mb-2" style={{fontFamily:'Oswald,sans-serif',fontSize:'36px'}}>SQUAD EMPTY</h3>
                  <p className="text-foreground text-sm mb-8">Win bids in the live auction to build your squad!</p>
                  {selTeam.auction?.status==='active' && (
                    <Link href={`/auctions/${selTeam.auction?._id}`} className="bg-primary text-primary-foreground font-heading uppercase tracking-wider glow-gold hover:scale-[1.02] active:scale-[0.97] transition-all inline-block px-10 py-4 rounded-2xl" style={{fontFamily:'Oswald,sans-serif',fontSize:'20px'}}>JOIN LIVE AUCTION</Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {squad.map(p=>(
                    <div key={p._id} className="bg-glass-premium rounded-2xl overflow-hidden hover:scale-[1.02] transition-all duration-300" style={{border:'1px solid rgba(255,255,255,0.06)'}}>
                      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900" style={{height:'144px'}}>
                        {p.imageUrl
                          ? <img src={imgUrl(p.imageUrl)} alt={p.name} className="w-full h-full object-cover object-top"/>
                          : <div className="w-full h-full flex items-center justify-center text-4xl">{roleIcons[p.role]}</div>}
                        <div className="absolute inset-0" style={{background:'linear-gradient(to top,rgba(0,0,0,0.85),transparent 50%)'}}/>
                      </div>
                      <div className="p-3">
                        <div className="text-foreground text-xs font-bold truncate mb-1.5">{p.name}</div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-heading uppercase tracking-wider border text-xs ${roleColors[p.role]||''}`} style={{fontSize:'10px',padding:'1px 6px'}}>{p.role}</span>
                        {p.soldPrice && <div className="text-gradient-gold font-bold mt-1.5" style={{fontFamily:'Oswald,sans-serif',fontSize:'14px'}}>{fmt(p.soldPrice)}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
