// Step content for the Beast Cricket guided assistant.
// Each step belongs to a role and (optionally) deep-links into a dashboard
// tab via `href`. `autoCheck` keys are used by GuideContext to mark a step
// complete automatically once real app data says it's done (organizer
// steps only — see GuideContext for the live checks). Other roles use
// manual "Mark done / Next" advancement since there's no single signal
// that reliably proves e.g. "the team owner read their wallet balance".

export type GuideStep = {
  id: string;
  title: string;
  body: string;
  href?: string;          // deep link — where "Take me there" navigates
  autoCheck?: string;     // key checked against live data (organizer only)
  requiresPlan?: 'pro' | 'elite'; // step is locked unless plan covers it
};

export const ORGANIZER_STEPS: GuideStep[] = [
  { id: 'welcome',        title: 'Welcome, Organizer',              body: 'This is your control center for running a cricket auction end-to-end — creating it, registering players and teams, going live, and sharing results.' },
  { id: 'package',        title: 'Choose Your Package',             body: 'Auctions need an active package (Starter, Pro, or Elite). Pick one based on how many teams/players you need and whether you want broadcast, sponsors, or AI features.', href: '/dashboard/organizer?tab=package', autoCheck: 'hasPackage' },
  { id: 'create-auction',title: 'Create Your Auction',              body: 'Set the auction name, date, purse per team, bid increment, and timer. Every field has a sensible default, but double-check the purse and increment — they can\'t be changed once teams start joining.', href: '/dashboard/organizer?tab=create', autoCheck: 'hasAuction' },
  { id: 'tournament-info',title: 'Tournament Information',          body: 'Add the tournament/league name and a short description — this shows on player registration forms and the broadcast screen.', href: '/dashboard/organizer?tab=create' },
  { id: 'register-players', title: 'Register Players',              body: 'Add players by importing a CSV, or one-by-one with photo, role, category, and base price. The bulk importer needs Pro or higher.', href: '/dashboard/organizer?tab=players', autoCheck: 'hasPlayers' },
  { id: 'sponsor-branding', title: 'Sponsor Branding',               body: 'Upload sponsor logos and banners — they\'ll show on the broadcast screen and generated posters automatically.', href: '/dashboard/organizer?tab=sponsors', requiresPlan: 'elite', autoCheck: 'hasSponsors' },
  { id: 'posters',        title: 'Social Media Posters',            body: 'Generate squad posters, signing announcements, and social kits (Instagram/WhatsApp-ready) from the Poster Generator — no design skill needed.', href: '/poster' },
  { id: 'invite-teams',   title: 'Invite Team Owners',               body: 'Share your auction\'s join code or link — team owners use it to register their own team and pay any entry fee.', href: '/dashboard/organizer?tab=auctions', autoCheck: 'hasTeams' },
  { id: 'approve-teams',  title: 'Review Teams',                     body: 'Check the Teams tab to see who has joined. You can edit or remove a team any time before the auction starts.', href: '/dashboard/organizer?tab=teams', autoCheck: 'hasTeams' },
  { id: 'configure',      title: 'Configure the Auction',            body: 'Review RTM (Right to Match) settings, team purse, and player order before going live.', href: '/dashboard/organizer?tab=auctions' },
  { id: 'go-live',        title: 'Go Live',                          body: 'When everyone\'s ready, hit "Go Live" from My Auctions to open the live bidding room.', href: '/dashboard/organizer?tab=auctions', autoCheck: 'auctionStarted' },
  { id: 'controls',       title: 'Auction Controls',                 body: 'While live you can pause, resume, force-sell, mark unsold, or skip a player directly from the bidding room.', autoCheck: 'auctionStarted' },
  { id: 'broadcast',      title: 'Broadcast Screen',                 body: 'Open the Broadcast Screen (Elite) on a second device, projector, or OBS browser source — it updates live with every bid, automatically.', href: '/dashboard/organizer?tab=auctions', requiresPlan: 'elite' },
  { id: 'completed',      title: 'Auction Completed',                body: 'Once every player has been sold or marked unsold, the auction auto-completes and final results are saved.', autoCheck: 'auctionCompleted' },
  { id: 'reports',        title: 'Generate Reports',                body: 'Head to Reports for every report type — squad PDFs, bid history, revenue, team spending — exportable as CSV, Excel, or PDF.', href: '/reports', autoCheck: 'hasReports' },
  { id: 'analytics',      title: 'Analytics',                        body: 'Review team strength, spending patterns, and category breakdowns in Analytics.', href: '/analytics' },
  { id: 'archive',        title: 'You\'re Done!',                    body: 'That\'s the full workflow, start to finish. Your auction stays archived — you can revisit results, reports, and replays any time.' },
];

export const TEAM_OWNER_STEPS: GuideStep[] = [
  { id: 'welcome',     title: 'Welcome, Team Owner',        body: 'Here\'s how to join an auction, build your team, and bid live.' },
  { id: 'join',        title: 'Join an Auction',            body: 'Enter the join code your organizer shared, or open their invite link directly.', href: '/dashboard/team-owner', autoCheck: 'hasJoined' },
  { id: 'wallet',      title: 'Check Your Wallet',          body: 'Your purse (budget) is shown at the top of your team page — track it closely once bidding starts. If your organizer is on Pro/Elite, they may also credit a separate Team Wallet for entry-fee refunds or bonuses.', href: '/dashboard/team-owner', autoCheck: 'hasTeam' },
  { id: 'create-team', title: 'Create Your Team',           body: 'Pick a name, short name, logo, and colors. If the auction has an entry fee, you\'ll pay it here before your team is created.', href: '/dashboard/team-owner', autoCheck: 'teamSetupCompleted' },
  { id: 'wishlist',    title: 'Plan Your Targets',          body: 'Browse the player list beforehand and note who you want — bidding moves fast once live.', href: '/dashboard/team-owner' },
  { id: 'budget',      title: 'Budget Strategy',            body: 'Decide roughly how much to spend per role (batters/bowlers/all-rounders) before the auction starts so you don\'t overspend early.' },
  { id: 'live-bidding',title: 'Live Bidding',               body: 'When your auction goes live, click "Bid Now" on your team card to enter the bidding room and start placing bids.', href: '/dashboard/team-owner', autoCheck: 'auctionLive' },
  { id: 'winning',     title: 'Track Your Wins',            body: 'Players you win appear in your squad immediately — watch your remaining purse update in real time.', autoCheck: 'hasBid' },
  { id: 'team-mgmt',   title: 'Manage Your Team',           body: 'Edit your team name, logo, or colors any time from My Teams.', href: '/dashboard/team-owner', autoCheck: 'hasSquad' },
  { id: 'reports',     title: 'Reports & Downloads',        body: 'Once the auction ends, download your Squad PDF and check the final results from your team page.', href: '/dashboard/team-owner' },
];

export const VIEWER_STEPS: GuideStep[] = [
  { id: 'welcome',    title: 'Welcome, Viewer',           body: 'You can follow any live auction without an account — here\'s what\'s available to you.' },
  { id: 'live',       title: 'Watch Live Auctions',       body: 'Open an audience link to watch bidding happen in real time, with live team purses and bid history.' },
  { id: 'scoreboard', title: 'Live Scoreboard',           body: 'See every team\'s squad size and remaining purse update as the auction progresses.' },
  { id: 'broadcast',  title: 'Broadcast View',            body: 'Some organizers project a full broadcast screen — ask for that link if you want the big-screen experience.' },
  { id: 'stats',      title: 'Statistics',                body: 'Category breakdowns and top buys are shown live in the sidebar during bidding.' },
  { id: 'sponsors',   title: 'Sponsor Area',              body: 'Sponsor logos rotate at the bottom of the broadcast/audience screen.' },
  { id: 'profiles',   title: 'Player Profiles',           body: 'Click any player card to see their role, category, and base price.' },
  { id: 'search',     title: 'Search & Filters',          body: 'Use the search bar on public auction pages to quickly find a specific player or team.' },
];

export const ADMIN_STEPS: GuideStep[] = [
  { id: 'welcome',      title: 'Welcome, Admin',            body: 'This is the platform-wide control panel — manage every organizer, package, and auction here.' },
  { id: 'users',        title: 'User Management',           body: 'Search, view, and manage every registered account from Users.', href: '/dashboard/admin?tab=users', autoCheck: 'hasUsers' },
  { id: 'organizers',   title: 'Organizers',                 body: 'Review every organizer account and their auction activity.', href: '/dashboard/admin?tab=organizers', autoCheck: 'hasOrganizers' },
  { id: 'subscriptions',title: 'Subscriptions & Packages',   body: 'Review and adjust organizer package assignments and pricing.', href: '/dashboard/admin?tab=subscriptions' },
  { id: 'grant-plan',   title: 'Grant a Plan',               body: 'Manually grant or extend a package for an organizer (e.g. for support cases).', href: '/dashboard/admin?tab=grant-plan' },
  { id: 'payments',     title: 'Payments',                   body: 'Track every payment processed on the platform.', href: '/dashboard/admin?tab=payments', autoCheck: 'hasPayments' },
  { id: 'bank',         title: 'Bank & Payouts',             body: 'Review organizer bank/UPI details used for direct payment collection.', href: '/dashboard/admin?tab=bank' },
  { id: 'auctions',     title: 'All Auctions',               body: 'Monitor every auction running on the platform, live or completed.', href: '/dashboard/admin?tab=auctions', autoCheck: 'hasAuctions' },
  { id: 'ai-control',   title: 'AI Control',                 body: 'Manage Beast AI feature availability and usage across the platform.', href: '/dashboard/admin?tab=ai-control' },
  { id: 'logs',         title: 'Audit Logs',                 body: 'Every sensitive action (role changes, payments, deletions) is logged here.', href: '/dashboard/admin?tab=logs' },
];

export const STEPS_BY_ROLE: Record<string, GuideStep[]> = {
  organizer: ORGANIZER_STEPS,
  team_owner: TEAM_OWNER_STEPS,
  viewer: VIEWER_STEPS,
  admin: ADMIN_STEPS,
};

// ── Help Center: feature documentation ────────────────────────────────────
export type FeatureDoc = { id: string; title: string; body: string; roles: string[]; tags: string[] };

export const FEATURE_DOCS: FeatureDoc[] = [
  { id: 'feat-rtm', title: 'RTM (Right to Match)', body: 'If enabled by the organizer, a team that previously owned a player gets the option to match the winning bid when that player comes up again. A popup appears for the eligible team with a time-limited "Use RTM" / "Decline" choice.', roles: ['organizer','team_owner'], tags: ['rtm','match','rule'] },
  { id: 'feat-bulk-import', title: 'Bulk Player Import', body: 'Pro and Elite organizers can upload a CSV of players (name, role, category, base price, photo URL) instead of adding them one by one. Available from Players → Bulk Import.', roles: ['organizer'], tags: ['bulk','import','csv','players'] },
  { id: 'feat-team-wallet', title: 'Team Wallet', body: 'A separate balance from the main purse, available on Pro/Elite. The organizer can credit or debit it (e.g. refunding an entry fee or awarding a bonus); it does not affect bidding power directly.', roles: ['organizer','team_owner'], tags: ['wallet','credit','debit'] },
  { id: 'feat-broadcast', title: 'Broadcast Screen', body: 'An Elite-only, auto-updating live screen designed for projectors, TVs, or as an OBS Browser Source — shows the current player, bid, and team purses with no manual refresh needed.', roles: ['organizer','viewer'], tags: ['broadcast','obs','screen','elite'] },
  { id: 'feat-sponsors', title: 'Sponsor Ads', body: 'Elite organizers can upload sponsor logos that rotate automatically on the broadcast and audience screens, with an optional click-through website link.', roles: ['organizer'], tags: ['sponsor','ads','logo'] },
  { id: 'feat-branding', title: 'Custom Branding', body: 'Elite organizers can set a league name, tagline, colors, logo, and banner that apply across the auction\'s public-facing pages (audience view, broadcast, posters).', roles: ['organizer'], tags: ['branding','logo','colors'] },
  { id: 'feat-replay', title: 'Auction Replay', body: 'Pro and Elite organizers can replay a completed auction\'s bidding history player-by-player, useful for reviewing how the auction unfolded.', roles: ['organizer'], tags: ['replay','history'] },
  { id: 'feat-posters', title: 'Social Media Posters', body: 'Generate squad announcement and signing posters formatted for Instagram/WhatsApp directly in the browser — no design tool needed. Found at Poster Generator.', roles: ['organizer'], tags: ['poster','social','instagram'] },
  { id: 'feat-admin-grant', title: 'Manual Plan Grants', body: 'Admins can grant or extend any organizer\'s package directly, bypassing payment — used for support cases (e.g. a confirmed offline payment) without needing a Razorpay transaction.', roles: ['admin'], tags: ['admin','grant','plan'] },
  { id: 'feat-admin-audit-log', title: 'Audit Logs', body: 'Every sensitive platform action (role changes, payments, deletions) is recorded with the acting user, timestamp, and action details — the system of record for support and compliance questions.', roles: ['admin'], tags: ['admin','audit','compliance'] },
];

// ── Help Center: troubleshooting ──────────────────────────────────────────
export type TroubleshootEntry = { id: string; problem: string; solution: string; roles: string[]; tags: string[] };

export const TROUBLESHOOTING: TroubleshootEntry[] = [
  { id: 'ts-no-package', problem: '"Buy a package first" error when creating an auction', solution: 'You need an active package (Starter/Pro/Elite) before creating an auction. Go to My Package and complete a purchase — activation is instant.', roles: ['organizer'], tags: ['package','error','create'] },
  { id: 'ts-feature-locked', problem: 'A button says "Feature Locked" or I get a FEATURE_LOCKED error', solution: 'That feature needs a higher plan than the one currently active. Open My Package to compare plans and upgrade — the feature unlocks immediately after payment.', roles: ['organizer'], tags: ['locked','upgrade','plan'] },
  { id: 'ts-join-fail', problem: 'My join code isn\'t working', solution: 'Double-check the code with your organizer — codes are case-sensitive and tied to one specific auction. If the auction has already started or completed, new teams may no longer be accepted.', roles: ['team_owner'], tags: ['join','code','error'] },
  { id: 'ts-bid-disabled', problem: 'The bid button is greyed out during live bidding', solution: 'This means either it isn\'t your turn to outbid (someone else is already the highest bidder and the increment hasn\'t changed), your purse can\'t cover the next increment, or the auction is paused — check the status banner at the top of the bidding room.', roles: ['team_owner'], tags: ['bid','disabled','live'] },
  { id: 'ts-no-broadcast', problem: 'I can\'t find the Broadcast Screen option', solution: 'Broadcast is an Elite-only feature. If you\'re on Starter or Pro, upgrade from My Package to unlock it.', roles: ['organizer'], tags: ['broadcast','missing','elite'] },
  { id: 'ts-image-not-saving', problem: 'An uploaded photo/logo doesn\'t show up after saving', solution: 'Confirm the file is a JPG, PNG, GIF, or WEBP under 5MB. If it still doesn\'t appear, refresh the page — some lists cache until the next load.', roles: ['organizer','team_owner'], tags: ['upload','image','photo','logo'] },
  { id: 'ts-admin-no-data', problem: 'Users/Organizers/Payments tab looks empty on Admin dashboard', solution: 'This reflects real platform data — if no organizers have signed up or no payments have processed yet, the tab is correctly empty rather than showing placeholder rows.', roles: ['admin'], tags: ['admin','empty','data'] },
];

// ── Help Center: keyboard shortcuts ───────────────────────────────────────
// Only real, implemented shortcuts are listed here — nothing aspirational.
export type ShortcutEntry = { keys: string; description: string };

export const KEYBOARD_SHORTCUTS: ShortcutEntry[] = [
  { keys: '?', description: 'Open the Guided Assistant\'s Help Center from anywhere in the app' },
  { keys: 'Esc', description: 'Close the Guided Assistant panel if it\'s open' },
  { keys: 'Enter', description: 'Submit the join-code field (Team Owner) or the user search field (Admin)' },
];

// ── Help Center / searchable FAQ ──────────────────────────────────────────
export type FaqEntry = { id: string; question: string; answer: string; roles: string[]; tags: string[] };

export const FAQS: FaqEntry[] = [
  { id: 'faq-create-auction', question: 'How do I create an auction?', answer: 'Go to My Auctions → Create Auction, fill in the name, date, purse per team, bid increment, and timer, then save. You\'ll need an active package first.', roles: ['organizer'], tags: ['auction','create','setup'] },
  { id: 'faq-buy-package', question: 'How do I buy or upgrade a package?', answer: 'Open My Package from your dashboard sidebar, pick Starter/Pro/Elite, and pay through Razorpay (or your organizer\'s UPI/QR if they\'ve set one up). Activation is instant.', roles: ['organizer'], tags: ['package','payment','upgrade','razorpay'] },
  { id: 'faq-register-players', question: 'How do I add players to my auction?', answer: 'Use Players → Add Player for one at a time, or Bulk Import (Pro+) to upload a CSV of many players at once, including photos.', roles: ['organizer'], tags: ['players','register','csv','import'] },
  { id: 'faq-join-code', question: 'How do I join an auction as a team owner?', answer: 'Get the join code or invite link from your organizer, then enter it on your Team Owner dashboard or open the link directly.', roles: ['team_owner'], tags: ['join','code','invite'] },
  { id: 'faq-entry-fee', question: 'Why am I being asked to pay an entry fee?', answer: 'Some organizers charge a one-time team entry fee. Pay it via the Razorpay button if the organizer has online payments set up, or via their UPI/QR code otherwise.', roles: ['team_owner'], tags: ['fee','payment','entry'] },
  { id: 'faq-bid', question: 'How do I place a bid?', answer: 'Once your auction is live, open "Bid Now" from your team page — the current player and bid amount are shown, with a button to raise the bid by the configured increment.', roles: ['team_owner'], tags: ['bid','live','auction'] },
  { id: 'faq-broadcast', question: 'How do I show the auction on a big screen or stream it?', answer: 'Open the Broadcast Screen URL in any browser window and project it, or add it as an OBS Browser Source to stream to YouTube/Facebook Live. It updates automatically — no refresh needed.', roles: ['organizer'], tags: ['broadcast','obs','stream','screen'] },
  { id: 'faq-reports', question: 'What reports can I generate?', answer: 'Auction Summary, Sold/Unsold Players, Team Purchases, Bid History, Category Stats, Timeline, Revenue, Sponsor, and more — each exportable as CSV, Excel, or PDF from the Reports page.', roles: ['organizer','team_owner'], tags: ['reports','pdf','csv','excel','export'] },
  { id: 'faq-rtm', question: 'What is RTM (Right to Match)?', answer: 'RTM lets a team match the winning bid for a player they previously owned, if enabled by the organizer. You\'ll see a popup to use or decline it when eligible.', roles: ['team_owner','organizer'], tags: ['rtm','match','bid'] },
  { id: 'faq-watch-free', question: 'Do I need an account to watch an auction?', answer: 'No — audience/viewer links work without logging in. You can watch live bids, team purses, and results freely.', roles: ['viewer'], tags: ['watch','free','viewer','account'] },
  { id: 'faq-sponsor', question: 'How do sponsors get shown?', answer: 'Organizers on the Elite plan can upload sponsor logos under Sponsors — they rotate automatically on the broadcast and audience screens.', roles: ['organizer'], tags: ['sponsor','branding','logo'] },
  { id: 'faq-team-owner-account', question: 'I don\'t have a role yet — what do I pick?', answer: 'Pick Organizer if you\'re running the auction, Team Owner if you\'re bidding for a team, or Viewer to just watch. You can\'t change this from the picker after — contact support to switch.', roles: ['organizer','team_owner','viewer'], tags: ['role','signup','select'] },
  { id: 'faq-admin-grant-plan', question: 'How do I manually grant or extend a package for an organizer?', answer: 'Go to Subscriptions & Packages → Grant a Plan, pick the organizer and plan tier, and confirm — useful for support cases like a failed payment that was actually received.', roles: ['admin'], tags: ['admin','grant','plan','package'] },
  { id: 'faq-admin-audit', question: 'Where can I see sensitive actions like role changes or deletions?', answer: 'Audit Logs records every sensitive action platform-wide — role changes, payments, and deletions — with the acting user and timestamp.', roles: ['admin'], tags: ['admin','audit','logs'] },
  { id: 'faq-admin-ai', question: 'How do I control Beast AI feature availability?', answer: 'AI Control lets you enable/disable Beast AI features (Bid Advisor, Fraud Detection, Commentary) platform-wide or monitor their usage.', roles: ['admin'], tags: ['admin','ai','control'] },
];
