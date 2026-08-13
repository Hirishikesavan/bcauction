'use strict';

const mongoose      = require('mongoose');
const Auction       = require('../models/Auction');
const Player        = require('../models/Player');
const Team          = require('../models/Team');
const Bid           = require('../models/Bid');
const User          = require('../models/User');
const AuctionReplay = require('../models/AuctionReplay');
const { getAuth }   = require('../lib/auth');

// Record replay event (non-blocking)
const recordReplay = (auctionId, data) => {
  AuctionReplay.create({ auctionId, ...data }).catch(() => {});
};

// Auto-commentary bank
const commentaryBank = {
  sold: [
    (p, t, amt) => `${t} secures ${p} for ${fmt(amt)}! A strategic addition.`,
    (p, t, amt) => `Sold! ${p} goes to ${t} for ${fmt(amt)}.`,
    (p, t, amt) => `${t} wins ${p} at ${fmt(amt)} — excellent value!`,
    (p, t, amt) => `The hammer falls at ${fmt(amt)} — ${p} joins ${t}!`,
  ],
  unsold: [
    (p) => `${p} goes unsold — watch for this player in the unsold round.`,
    (p) => `No takers for ${p} this time.`,
  ],
};

// Authenticate a socket connection using Better Auth session cookie
const authenticateSocket = async (socket) => {
  try {
    const authInstance = getAuth();
    // Build a minimal headers object from the socket handshake
    const headers = {
      cookie: socket.handshake.headers.cookie || '',
      authorization: socket.handshake.headers.authorization || '',
    };
    const session = await authInstance.api.getSession({ headers });
    if (session?.user) {
      // Ensure role is always up-to-date from DB, not just the session cache.
      // This fixes team_owner showing as 'viewer' if set-role didn't flush the session.
      if (!session.user.role || session.user.role === 'viewer') {
        try {
          const { MongoClient } = require('mongodb');
          const c = new MongoClient(process.env.MONGODB_URI);
          await c.connect();
          const db = c.db('beast-cricket-auction');
          const dbUser = await db.collection('user').findOne(
            { $or: [{ id: session.user.id }, { _id: session.user.id }] },
            { projection: { role: 1 } }
          );
          await c.close();
          if (dbUser?.role && dbUser.role !== session.user.role) {
            session.user.role = dbUser.role;
          }
        } catch { /* non-critical */ }
      }
      return session.user;
    }
  } catch { /* anonymous ok */ }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// In-memory auction states keyed by auctionId
// ─────────────────────────────────────────────────────────────────────────────
const states = {};
const getState = (id) => {
  if (!states[id]) states[id] = {
    currentPlayer: null, currentBid: 0,
    leadingTeamId: null, leadingTeamName: '', leadingTeamColor: 'hsl(45,100%,51%)',
    timer: 0, timerInterval: null, bidHistory: [],
    status: 'draft', rtmActive: null,
  };
  return states[id];
};

const fmt = (n) => {
  if (!n && n !== 0) return '₹0';
  if (n >= 10000000) return `₹${(n/10000000).toFixed(2)} Cr`;
  if (n >= 100000)   return `₹${(n/100000).toFixed(1)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Timer helpers
// ─────────────────────────────────────────────────────────────────────────────
const stopTimer = (st) => {
  if (st.timerInterval) { clearInterval(st.timerInterval); st.timerInterval = null; }
};

const startTimer = (io, auctionId, st, seconds) => {
  stopTimer(st);
  st.timer = seconds;
  st.timerInterval = setInterval(async () => {
    st.timer--;
    io.to(auctionId).emit('timerTick', { timer: st.timer });
    if (st.timer <= 0) {
      stopTimer(st);
      if (st.currentPlayer) {
        if (st.leadingTeamId) {
          await triggerSold(io, auctionId, st);
        } else {
          const unsoldPlayer = st.currentPlayer;
          await Player.findByIdAndUpdate(unsoldPlayer._id, { status: 'unsold' });
          recordReplay(auctionId, {
            event: 'unsold', playerId: unsoldPlayer._id, playerName: unsoldPlayer.name, round: 1,
          });
          const unsoldComment = commentaryBank.unsold[Math.floor(Math.random()*commentaryBank.unsold.length)](unsoldPlayer.name);
          io.to(auctionId).emit('playerUnsold', { player: unsoldPlayer, commentary: unsoldComment });
          setTimeout(() => loadNextPlayer(io, auctionId), 3000);
        }
      }
    }
  }, 1000);
};

// ─────────────────────────────────────────────────────────────────────────────
// RTM timer
// ─────────────────────────────────────────────────────────────────────────────
const startRtmTimer = (io, auctionId, st, seconds = 15) => {
  if (st.rtmActive?.interval) clearInterval(st.rtmActive.interval);
  let t = seconds;
  st.rtmActive = {
    timer: t,
    interval: setInterval(async () => {
      t--;
      io.to(auctionId).emit('rtmTick', { timer: t });
      if (t <= 0) {
        clearInterval(st.rtmActive.interval);
        st.rtmActive = null;
        io.to(auctionId).emit('rtmDeclined');
        setTimeout(() => loadNextPlayer(io, auctionId), 2000);
      }
    }, 1000),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Sold logic
// ─────────────────────────────────────────────────────────────────────────────
const triggerSold = async (io, auctionId, st) => {
  const player    = st.currentPlayer;
  const teamId    = st.leadingTeamId;
  const soldPrice = st.currentBid;

  // CONCURRENCY FIX: Use atomic operations to ensure data consistency
  // Update player status, deduct purse, and increment player count in a single transaction
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Player.findByIdAndUpdate(player._id, { status: 'sold', soldPrice, teamId }, { session });
      const teamUpdate = await Team.findByIdAndUpdate(teamId, { $inc: { purse: -soldPrice, playersCount: 1 } }, { session, new: true });
      
      // Verify purse was sufficient before transaction commits
      if (teamUpdate.purse < 0) {
        throw new Error('Insufficient purse - transaction rolled back');
      }
    });
  } catch (err) {
    console.error('❌ Sold transaction failed:', err.message);
    io.to(auctionId).emit('bidError', { message: 'Transaction failed. Please try again.' });
    return;
  } finally {
    await session.endSession();
  }

  await Auction.findByIdAndUpdate(auctionId, { currentPlayerId: null });

  const [soldTeam, allTeams, auction] = await Promise.all([
    Team.findById(teamId),
    Team.find({ auctionId }),
    Auction.findById(auctionId),
  ]);

  const payload = {
    player, soldPrice, soldPriceFormatted: fmt(soldPrice),
    soldTo: { teamId, teamName: soldTeam?.name, teamColor: soldTeam?.primaryColor, teamShortName: soldTeam?.shortName },
    teams: allTeams,
    rtmEnabled: auction?.rtmEnabled,
    rtmWindow: 15,
  };

  st.currentPlayer = null; st.currentBid = 0;
  st.leadingTeamId = null; st.leadingTeamName = ''; st.bidHistory = [];

  // Record replay event
  recordReplay(auctionId, {
    event: 'sold', playerId: player._id, playerName: player.name,
    teamId: soldTeam?._id, teamName: soldTeam?.name, teamColor: soldTeam?.primaryColor,
    bidAmount: soldPrice, round: 1,
  });

  // Generate AI commentary
  const commentFns = commentaryBank.sold;
  const commentary = commentFns[Math.floor(Math.random()*commentFns.length)](player.name, soldTeam?.name || 'a team', soldPrice);

  io.to(auctionId).emit('playerSold', { ...payload, commentary });

  if (auction?.rtmEnabled) {
    startRtmTimer(io, auctionId, st);
  } else {
    setTimeout(() => loadNextPlayer(io, auctionId), 4000);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Load next player
// ─────────────────────────────────────────────────────────────────────────────
const loadNextPlayer = async (io, auctionId) => {
  const st      = getState(auctionId);
  const auction = await Auction.findById(auctionId);
  if (!auction || auction.status === 'completed') return;

  const categoryOrder = ['Elite', 'Gold', 'Silver', 'Emerging', 'Other'];
  let nextPlayer = null;
  for (const cat of categoryOrder) {
    nextPlayer = await Player.findOne({ auctionId, status: 'active', category: cat });
    if (nextPlayer) break;
  }

  if (!nextPlayer) {
    await Auction.findByIdAndUpdate(auctionId, { status: 'completed', currentPlayerId: null });
    st.currentPlayer = null; st.status = 'completed';
    io.to(auctionId).emit('auctionCompleted');
    // Also broadcast globally so dashboards update
    io.emit('auctionStatusChanged', { auctionId, status: 'completed' });
    return;
  }

  await Auction.findByIdAndUpdate(auctionId, { currentPlayerId: nextPlayer._id });

  st.currentPlayer   = nextPlayer;
  st.currentBid      = nextPlayer.basePrice;
  st.leadingTeamId   = null; st.leadingTeamName = '';
  st.leadingTeamColor= 'hsl(45,100%,51%)';
  st.bidHistory      = [];

  io.to(auctionId).emit('nextPlayer', {
    player: nextPlayer,
    basePrice: nextPlayer.basePrice,
    basePriceFormatted: fmt(nextPlayer.basePrice),
    timer: auction.bidTimer,
  });
  startTimer(io, auctionId, st, auction.bidTimer);
};

// ─────────────────────────────────────────────────────────────────────────────
// Main export — attaches all socket handlers
// ─────────────────────────────────────────────────────────────────────────────

// ── SCHEDULED AUCTION AUTO-START ─────────────────────────────
// Runs every 30 seconds, starts auctions whose scheduledAt time has passed
const startScheduledAuctions = async (io) => {
  try {
    const now = new Date();
    const due = await Auction.find({
      status: 'scheduled',
      scheduledAt: { $lte: now, $ne: null },
    });
    for (const a of due) {
      await Auction.findByIdAndUpdate(a._id, { status: 'active' });
      io.emit('auctionStatusChanged', { auctionId: a._id, status: 'active', scheduledStart: true });
      io.to(a._id.toString()).emit('auctionStarted', { auctionId: a._id, name: a.name });
      console.log('⏰ Auto-started scheduled auction:', a.name);
    }
  } catch (e) {
    console.error('Scheduler error:', e.message);
  }
};

module.exports = (io) => {
  // Start scheduled auction checker
  setInterval(() => startScheduledAuctions(io), 30000);
  startScheduledAuctions(io); // Run immediately on startup

  io.on('connection', async (socket) => {
    // Authenticate via Better Auth session cookie (non-blocking — anonymous is fine)
    const socketUser = await authenticateSocket(socket);

    // ── JOIN ADMIN ROOM ───────────────────────────────────────────────────
    socket.on('join-admin-room', async () => {
      // Verify the connected user is admin before letting them into the admin room
      if (socketUser && (
        socketUser.role === 'admin' ||
        (socketUser.email || '').toLowerCase() === (process.env.ADMIN_EMAIL || 'hirishi2020@gmail.com').toLowerCase()
      )) {
        socket.join('admin-room');
        socket.emit('admin-room-joined', { ok: true });
        console.log('✅ Admin joined admin-room:', socketUser.email);
      } else {
        console.warn('⚠️ Unauthorized admin-room join attempt from:', socketUser?.email || 'anonymous');
      }
    });

    // ── JOIN AUCTION ──────────────────────────────────────────────────────
    socket.on('joinAuction', async ({ auctionId }) => {
      if (!auctionId) return;
      socket.join(auctionId);
      const st = getState(auctionId);

      // Everyone (organizer, team owner, viewer) needs the full team list
      // to render the team strip / leaderboard. Previously a team_owner
      // only received THEIR OWN team here, so the rest of the team
      // strip was empty/broken for team owners.
      // Everyone (organizer, team owner, viewer) needs the full team list
      // to render the team strip / leaderboard. Previously a team_owner
      // only received THEIR OWN team here, so the rest of the team
      // strip was empty/broken for team owners.
      //
      // NOTE: populate('ownerId') is used for any future display needs, but
      // we NEVER rely on it for the actual "is this my team?" check below —
      // it depends on the ref'd collection resolving correctly, and if that
      // ever drifts again (wrong collection, missing user doc, legacy data)
      // a team owner would silently lose their bid button with no error.
      // Matching is therefore always done against the raw, unpopulated
      // ownerId straight off the Team document.
      const rawTeams = await Team.find({ auctionId }).lean();
      let myTeamId = null;
      if (socketUser?.id && socketUser.role === 'team_owner') {
        try {
          const myUserIdStr = String(socketUser.id);
          const myTeam = rawTeams.find(t => t.ownerId && String(t.ownerId) === myUserIdStr);
          if (myTeam) myTeamId = myTeam._id.toString();
        } catch (e) {
          console.error('⚠️ myTeamId match error:', e.message);
        }
      }
      const teams = await Team.find({ auctionId }).populate('ownerId', 'name email').lean().catch(() => rawTeams);

      const auction = await Auction.findById(auctionId).lean();

      // SELF-HEAL: the in-memory `st` for this auctionId only exists on
      // WHICHEVER server process first touched it. If this socket connects
      // after a server restart, after a deploy, or simply joins later than
      // the player was already put on the block, `st.currentPlayer` can be
      // null even though the auction is genuinely 'active' in the DB — and
      // the broadcast/viewer screen would then sit there showing nothing
      // even though bidding is live elsewhere. Rebuild the snapshot from
      // the DB in that case so the screen is never stuck blank.
      if (!st.currentPlayer && auction?.status === 'active' && auction.currentPlayerId) {
        try {
          const dbPlayer = await Player.findById(auction.currentPlayerId).lean();
          if (dbPlayer && dbPlayer.status === 'active') {
            st.currentPlayer = dbPlayer;
            st.currentBid    = st.currentBid || dbPlayer.basePrice;
            st.status        = 'active';
            // Restore bid history from DB for this player so joining clients see it
            if (!st.bidHistory || st.bidHistory.length === 0) {
              try {
                const recentBids = await Bid.find({ auctionId, playerId: dbPlayer._id })
                  .sort({ createdAt: -1 }).limit(15).lean();
                st.bidHistory = recentBids.map(b => ({
                  teamId: b.teamId, teamName: b.teamName, teamShortName: b.teamShortName || '',
                  teamColor: b.teamColor || 'hsl(45,100%,51%)',
                  bidAmount: b.bidAmount, bidAmountFormatted: fmt(b.bidAmount),
                  timestamp: b.createdAt,
                }));
                // Restore leading team from most recent bid
                if (recentBids.length > 0 && !st.leadingTeamId) {
                  const top = recentBids[0];
                  st.leadingTeamId   = top.teamId;
                  st.leadingTeamName = top.teamName;
                  st.currentBid      = top.bidAmount;
                }
              } catch (bidErr) { console.error('⚠️ bid history restore error:', bidErr.message); }
            }
            if (!st.timer || st.timer <= 0) {
              st.timer = auction.bidTimer || 30;
              startTimer(io, auctionId, st, st.timer);
            }
          }
        } catch (e) {
          console.error('⚠️ state rehydrate error:', e.message);
        }
      }

      socket.emit('auctionState', {
        currentPlayer:       st.currentPlayer,
        currentBid:          st.currentBid,
        currentBidFormatted: st.currentBid ? fmt(st.currentBid) : null,
        leadingTeamId:       st.leadingTeamId,
        leadingTeamName:     st.leadingTeamName,
        leadingTeamColor:    st.leadingTeamColor,
        timer:               st.timer,
        bidHistory:          st.bidHistory.slice(0, 15),
        teams,
        status:              auction?.status || 'draft',
        myTeamId,
        auctionConfig: { bidTimer: auction?.bidTimer || 30, bidIncrement: auction?.bidIncrement || 500000 },
        rtmEnabled:    auction?.rtmEnabled ?? true,
      });
    });

    // ── PLACE BID ─────────────────────────────────────────────────────────
    socket.on('placeBid', async ({ auctionId, teamId, bidAmount }) => {
      const st = getState(auctionId);
      if (!st.currentPlayer)        return socket.emit('bidError', { message: 'No active player on stage' });
      if (st.timer <= 0)            return socket.emit('bidError', { message: 'Timer expired!' });
      if (st.status !== 'active')   return socket.emit('bidError', { message: 'Auction is not active' });
      if (st.leadingTeamId?.toString() === teamId?.toString())
        return socket.emit('bidError', { message: 'Your team is already the highest bidder!' });

      const [auction, team] = await Promise.all([
        Auction.findById(auctionId).lean(),
        Team.findById(teamId).lean(),
      ]);
      if (!team)    return socket.emit('bidError', { message: 'Team not found' });
      if (!auction) return socket.emit('bidError', { message: 'Auction not found' });

      // SECURITY: verify the bidding socket actually owns this team before
      // accepting the bid — previously any connected socket could pass any
      // teamId and bid on behalf of a team it didn't own.
      if (socketUser?.role === 'team_owner') {
        const owns = team.ownerId && String(team.ownerId) === String(socketUser.id);
        if (!owns) return socket.emit('bidError', { message: 'You can only bid for your own team' });
      } else if (!socketUser || !['organizer', 'admin'].includes(socketUser.role)) {
        return socket.emit('bidError', { message: 'Not authorized to bid' });
      }

      // CONCURRENCY FIX: Re-validate current bid before accepting
      // This prevents race conditions where two teams bid simultaneously
      // and both think they won. The in-memory state is the authoritative source.
      const currentBidAtValidation = st.currentBid;
      const leadingTeamAtValidation = st.leadingTeamId;
      
      const minBid = currentBidAtValidation + auction.bidIncrement;
      if (bidAmount < minBid)     return socket.emit('bidError', { message: `Minimum bid is ${fmt(minBid)}. Current bid: ${fmt(currentBidAtValidation)}` });
      if (team.purse < bidAmount) return socket.emit('bidError', { message: `Not enough purse! You have ${fmt(team.purse)}` });

      // CONCURRENCY FIX: Check if another bid was accepted during validation
      // If the current bid changed, reject this bid as stale
      if (st.currentBid !== currentBidAtValidation || st.leadingTeamId !== leadingTeamAtValidation) {
        return socket.emit('bidError', { 
          message: `Bid no longer valid. Another team placed a higher bid. Current bid: ${fmt(st.currentBid)}` 
        });
      }

      // CONCURRENCY FIX: Update state atomically
      st.currentBid      = bidAmount;
      st.leadingTeamId   = teamId;
      st.leadingTeamName = team.name;
      st.leadingTeamColor= team.primaryColor;

      const entry = {
        teamId, teamName: team.name, teamShortName: team.shortName,
        teamColor: team.primaryColor, bidAmount,
        bidAmountFormatted: fmt(bidAmount), timestamp: new Date().toISOString(),
      };
      st.bidHistory.unshift(entry);
      if (st.bidHistory.length > 30) st.bidHistory.pop();

      Bid.create({
        auctionId, playerId: st.currentPlayer._id, teamId,
        teamName: team.name, teamShortName: team.shortName || '',
        teamColor: team.primaryColor || 'hsl(45,100%,51%)', bidAmount,
      }).catch(e => console.error('Bid save error:', e.message));
      recordReplay(auctionId, {
        event: 'bid', playerId: st.currentPlayer._id, playerName: st.currentPlayer.name,
        teamId, teamName: team.name, teamColor: team.primaryColor, bidAmount, round: 1,
      });

      startTimer(io, auctionId, st, auction.bidTimer);

      io.to(auctionId).emit('bidUpdate', {
        currentBid: bidAmount, currentBidFormatted: fmt(bidAmount),
        leadingTeamId: teamId, leadingTeamName: team.name, leadingTeamColor: team.primaryColor,
        bidEntry: entry, timer: auction.bidTimer,
      });
    });

    // ── RTM TRIGGER ───────────────────────────────────────────────────────
    socket.on('triggerRTM', async ({ auctionId, playerId }) => {
      if (!socketUser || socketUser.role !== 'team_owner')
        return socket.emit('bidError', { message: 'Only team owners can use RTM' });

      const st = getState(auctionId);
      // Convert better-auth string ID to ObjectId for MongoDB query
      const userId = new mongoose.Types.ObjectId(socketUser.id);
      const auctionIdStr = String(auctionId);
      const [team, player, auction] = await Promise.all([
        Team.findOne({ auctionId: auctionIdStr, ownerId: userId }),
        Player.findById(playerId),
        Auction.findById(auctionId),
      ]);

      if (!team)    return socket.emit('bidError', { message: 'No team found for your account' });
      if (!player || player.status !== 'sold')
        return socket.emit('bidError', { message: 'Player not available for RTM' });
      if (player.teamId?.toString() === team._id.toString())
        return socket.emit('bidError', { message: 'Player already in your team' });
      if (team.rtmUsed >= team.rtmTotal)
        return socket.emit('bidError', { message: 'No RTM cards remaining!' });
      if (!auction?.rtmEnabled)
        return socket.emit('bidError', { message: 'RTM is not enabled for this auction' });

      if (st.rtmActive?.interval) clearInterval(st.rtmActive.interval);
      st.rtmActive = null;

      const soldPrice  = player.soldPrice;
      const prevTeamId = player.teamId;

      await Promise.all([
        Player.findByIdAndUpdate(playerId, { teamId: team._id }),
        Team.findByIdAndUpdate(team._id, { $inc: { purse: -soldPrice, playersCount: 1, rtmUsed: 1 } }),
        prevTeamId ? Team.findByIdAndUpdate(prevTeamId, { $inc: { playersCount: -1, purse: soldPrice } }) : Promise.resolve(),
      ]);

      const allTeams = await Team.find({ auctionId });
      io.to(auctionId).emit('rtmExecuted', {
        player, team, soldPrice, soldPriceFormatted: fmt(soldPrice),
        teams: allTeams,
        message: `🎯 ${team.name} used RTM! ${player.name} transferred for ${fmt(soldPrice)}`,
      });
      setTimeout(() => loadNextPlayer(io, auctionId), 4000);
    });

    // ── RTM DECLINE ───────────────────────────────────────────────────────
    socket.on('declineRTM', ({ auctionId }) => {
      const st = getState(auctionId);
      if (st.rtmActive?.interval) clearInterval(st.rtmActive.interval);
      st.rtmActive = null;
      io.to(auctionId).emit('rtmDeclined');
      setTimeout(() => loadNextPlayer(io, auctionId), 2000);
    });

    // ── ORGANIZER CONTROLS ────────────────────────────────────────────────
    socket.on('startAuction', async ({ auctionId }) => {
      if (!socketUser || !['organizer', 'admin'].includes(socketUser.role)) return;
      await Auction.findByIdAndUpdate(auctionId, { status: 'active' });
      const st = getState(auctionId); st.status = 'active';
      // Broadcast to auction room AND globally so all dashboards update
      io.to(auctionId).emit('auctionStarted');
      io.emit('auctionStatusChanged', { auctionId, status: 'active' });
      await loadNextPlayer(io, auctionId);
    });

    socket.on('pauseAuction', async ({ auctionId }) => {
      if (!socketUser || !['organizer', 'admin'].includes(socketUser.role)) return;
      const st = getState(auctionId);
      stopTimer(st); st.status = 'paused';
      await Auction.findByIdAndUpdate(auctionId, { status: 'paused' });
      io.to(auctionId).emit('auctionPaused', { timer: st.timer });
      io.emit('auctionStatusChanged', { auctionId, status: 'paused' });
    });

    socket.on('resumeAuction', async ({ auctionId }) => {
      if (!socketUser || !['organizer', 'admin'].includes(socketUser.role)) return;
      const st      = getState(auctionId);
      const auction = await Auction.findByIdAndUpdate(auctionId, { status: 'active' }, { new: true });
      st.status = 'active';
      startTimer(io, auctionId, st, st.timer || auction.bidTimer);
      io.to(auctionId).emit('auctionResumed', { timer: st.timer });
      io.emit('auctionStatusChanged', { auctionId, status: 'active' });
    });

    socket.on('skipPlayer', async ({ auctionId }) => {
      if (!socketUser || !['organizer', 'admin'].includes(socketUser.role)) return;
      const st = getState(auctionId);
      stopTimer(st);
      if (st.currentPlayer) await Player.findByIdAndUpdate(st.currentPlayer._id, { status: 'pending' });
      st.currentPlayer = null;
      await loadNextPlayer(io, auctionId);
    });

    socket.on('forceSell', async ({ auctionId }) => {
      if (!socketUser || !['organizer', 'admin'].includes(socketUser.role)) return;
      const st = getState(auctionId);
      stopTimer(st);
      if (st.currentPlayer && st.leadingTeamId) await triggerSold(io, auctionId, st);
      else socket.emit('bidError', { message: 'No leading bid to force sell' });
    });

    // ── END AUCTION (organizer manually ends) ─────────────────────────────
    socket.on('endAuction', async ({ auctionId }) => {
      if (!socketUser || !['organizer', 'admin'].includes(socketUser.role)) return;
      const st = getState(auctionId);
      stopTimer(st);
      // Mark all current players as unsold if still active
      try {
        await Player.updateMany({ auctionId, status: 'active' }, { $set: { status: 'unsold' } });
      } catch (e) { console.error('endAuction: player cleanup error', e.message); }
      await Auction.findByIdAndUpdate(auctionId, { status: 'completed', currentPlayerId: null });
      st.currentPlayer = null; st.status = 'completed';
      // Notify all connected clients
      io.to(auctionId).emit('auctionCompleted');
      io.emit('auctionStatusChanged', { auctionId, status: 'completed' });
      console.log(`✅ Auction ${auctionId} manually ended by organizer`);
    });

    socket.on('disconnect', () => { /* rooms are ephemeral */ });
  });
};
