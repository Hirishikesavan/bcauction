// ════════════════════════════════════════════════════════════════════════════
// TEAMS ROUTES — SELF-SERVICE (Team Owner only)
// ════════════════════════════════════════════════════════════════════════════
// These routes let a logged-in Team Owner manage ONLY the team they own.
// Every read/write here is gated by: team.ownerId === req.user.id
// Never trust a teamId from the client without checking ownership server-side.
// ════════════════════════════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Team = require('../models/Team');
const Player = require('../models/Player');
const { authenticate, authorize } = require('../middleware/auth');
const { getMulterStorage, getImageUrl, deleteUploadedImage } = require('../utils/cloudinary');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: getMulterStorage(multer, uploadsDir),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only image files are allowed (jpg, jpeg, png, gif, webp)'));
  },
});

// Helper: load a team and verify the logged-in user owns it.
// Returns the team document, or sends a 403/404 and returns null.
async function loadOwnedTeam(req, res) {
  const team = await Team.findById(req.params.teamId);
  if (!team) {
    res.status(404).json({ error: 'Team not found' });
    return null;
  }
  const userId = new mongoose.Types.ObjectId(req.user.id);
  if (!team.ownerId || team.ownerId.toString() !== userId.toString()) {
    // Never reveal whether the team exists in more detail than this —
    // ownership mismatch is always a 403, not a data leak.
    res.status(403).json({ error: 'You do not own this team' });
    return null;
  }
  return team;
}

// Team Owner updates their own team profile (name, short name, city, color, logo)
router.put('/:teamId', authenticate, authorize('team_owner'), upload.single('logo'), async (req, res) => {
  try {
    const team = await loadOwnedTeam(req, res);
    if (!team) return;

    const { name, shortName, ownerName, city, primaryColor } = req.body;
    if (name) team.name = name;
    if (shortName) team.shortName = shortName.toUpperCase().slice(0, 4);
    if (ownerName !== undefined) team.ownerName = ownerName;
    if (city !== undefined) team.city = city;
    if (primaryColor) team.primaryColor = primaryColor;
    if (req.file) {
      const oldLogo = team.logo;
      team.logo = getImageUrl(req.file);
      if (oldLogo && oldLogo !== team.logo) {
        deleteUploadedImage(oldLogo, uploadsDir).catch(() => {});
      }
    }

    await team.save();

    // Notify anyone watching the live auction room that this team's profile changed
    try {
      const io = require('../socket/io').getIO();
      if (io) io.to(String(team.auctionId)).emit('teamUpdated', { team });
    } catch (e) { /* non-critical */ }

    res.json({ success: true, team });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Team Owner leaves the auction (deletes their own team only)
router.delete('/:teamId/self-delete', authenticate, authorize('team_owner'), async (req, res) => {
  try {
    const team = await loadOwnedTeam(req, res);
    if (!team) return;

    // Block leaving once the team already has players bought in this auction,
    // to avoid orphaning sold players / corrupting purse math mid-auction.
    const soldCount = await Player.countDocuments({ teamId: team._id, status: 'sold' });
    if (soldCount > 0) {
      return res.status(400).json({ error: 'Cannot leave — your team already has players. Contact the organizer.' });
    }

    const auctionId = String(team.auctionId);
    const oldLogo = team.logo;
    await Team.findByIdAndDelete(team._id);
    if (oldLogo) deleteUploadedImage(oldLogo, uploadsDir).catch(() => {});

    try {
      const io = require('../socket/io').getIO();
      if (io) io.to(auctionId).emit('teamLeft', { teamId: String(team._id) });
    } catch (e) { /* non-critical */ }

    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
