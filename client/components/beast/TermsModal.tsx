'use client';
import { useState, useCallback } from 'react';
import { X, ScrollText, CheckCircle } from 'lucide-react';

const TERMS_CONTENT = `BEAST CRICKET AUCTION — TERMS & CONDITIONS

Last Updated: 2026

Welcome to Beast Cricket Auction ("Beast Cricket", "Company", "we", "our", or "us"). These Terms & Conditions govern your access to and use of the Beast Cricket website, mobile application, and all related services (collectively, the "Platform").

By accessing, registering, or using the Platform, you confirm that you have read, understood, and agree to be bound by these Terms & Conditions.

1. ACCEPTANCE OF TERMS
By creating an account, accessing the Platform, registering for tournaments, participating in auctions, making payments, or using any features or services provided by Beast Cricket, you agree to comply with these Terms & Conditions and all applicable laws and regulations.

2. ELIGIBILITY
To use the Platform, you must:
• Be at least 18 years of age; or have the consent of a parent or legal guardian if you are under 18.
• Provide accurate and complete registration information.
• Have the legal authority to enter into this agreement.
We reserve the right to refuse service or terminate accounts that fail to meet these requirements.

3. USER ACCOUNTS
Users are responsible for maintaining the confidentiality of their account credentials. You agree to provide accurate information, maintain the security of your login credentials, notify us immediately of any unauthorized access, and accept responsibility for all activities under your account.

4. PLATFORM SERVICES
Beast Cricket is a digital cricket tournament and auction management platform that provides: Tournament Management, Cricket Player Auctions, Team Registration, Player Registration, Franchise Management, Live Auction System, AI Assistant, Squad PDF Generation, WhatsApp Sharing, Broadcasting & Notifications, Analytics & Reports, Payment Integration, and User Management.

5. ORGANIZER RESPONSIBILITIES
Tournament Organizers are solely responsible for creating tournaments and auctions, managing player and team registrations, collecting registration fees, scheduling tournaments, conducting auctions, prize distribution, tournament cancellation decisions, refund decisions, and compliance with applicable laws. Beast Cricket provides only the technology platform.

6. PAYMENTS
All payments must be processed using the approved payment gateways integrated with the Platform. Users are responsible for verifying payment details before submission, ensuring sufficient account balance, and providing accurate billing information.

7. REFUND & CANCELLATION POLICY
Beast Cricket is a technology platform and is not the Organizer of tournaments or auctions. If an Organizer cancels, postpones, reschedules, or modifies a tournament or auction, Beast Cricket shall not be responsible for issuing refunds. Any refund must be sought directly from the respective Organizer. Platform subscription fees, convenience fees, payment gateway charges, and service fees paid to Beast Cricket are non-refundable, except where required by applicable law.

8. USER RESPONSIBILITIES
Users agree NOT to: provide false information, create fake accounts, use another person's account, attempt unauthorized access, upload malware, reverse engineer the Platform, disrupt auctions, manipulate bids, use bots or automated software, conduct fraudulent activities, abuse other users, or violate any applicable law.

9. INTELLECTUAL PROPERTY
All content on Beast Cricket including logos, trademarks, source code, software, UI/UX designs, images, videos, icons, graphics, documents, APIs, and databases is owned by Beast Cricket or its licensors. Users may not copy, modify, distribute, reproduce, sell, or exploit any content without prior written permission.

10. PRIVACY
Your use of the Platform is governed by our Privacy Policy. By using Beast Cricket, you consent to the collection, storage, processing, and use of your information as described in our Privacy Policy.

11. AI ASSISTANT
The AI Assistant is provided to assist users with tournament management, auction insights, reports, and general platform guidance. AI-generated responses are informational only and should not be treated as legal, financial, or professional advice.

12. LIMITATION OF LIABILITY
To the fullest extent permitted by law, Beast Cricket shall not be liable for tournament cancellations, auction cancellations, organizer disputes, registration disputes, prize disputes, payment gateway failures, data loss, internet failures, server downtime, software bugs, unauthorized access, third-party service failures, business interruption, or indirect, incidental, special, punitive, or consequential damages.

13. DATA SECURITY
We implement commercially reasonable security measures to protect user information. However, no online system can guarantee absolute security.

14. CHANGES TO TERMS
We reserve the right to update or modify these Terms & Conditions at any time. Continued use of the Platform after changes become effective constitutes acceptance of the revised Terms.

15. GOVERNING LAW
These Terms & Conditions shall be governed by and interpreted in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the competent courts where Beast Cricket operates.

16. CONTACT INFORMATION
Beast Cricket Auction
Email: beastcricketofficialauction@gmail.com
Business Hours: Monday to Friday, 9:00 AM – 6:00 PM (IST)

© 2026 Beast Cricket Auction. All Rights Reserved.`;

interface TermsModalProps {
  onAccept?: () => void;
  trigger?: React.ReactNode;
  mode?: 'view' | 'accept'; // view = just read, accept = checkbox flow
}

export function TermsModal({ onAccept, trigger, mode = 'view' }: TermsModalProps) {
  const [open, setOpen] = useState(false);
  const handleClose = useCallback(() => setOpen(false), []);
  const handleAccept = useCallback(() => {
    setOpen(false);
    onAccept?.();
  }, [onAccept]);

  return (
    <>
      <span onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger ?? <span className="text-primary underline hover:text-primary/80 transition-colors">Terms & Conditions</span>}
      </span>

      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

          {/* Modal */}
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-border/40 shadow-2xl"
            style={{ background: 'hsl(222 35% 10%)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 shrink-0">
              <div className="flex items-center gap-2">
                <ScrollText size={20} className="text-primary" />
                <h2 className="font-heading text-lg uppercase tracking-wider text-foreground">Terms &amp; Conditions</h2>
              </div>
              <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-white/5">
                <X size={20} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 px-6 py-5 text-sm text-muted-foreground font-display leading-relaxed whitespace-pre-wrap">
              {TERMS_CONTENT}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border/30 shrink-0 flex gap-3 justify-end">
              <button onClick={handleClose}
                className="px-5 py-2 rounded-lg text-xs font-heading uppercase tracking-wider border border-border/40 text-muted-foreground hover:bg-white/5 transition-all">
                Close
              </button>
              {mode === 'accept' && (
                <button onClick={handleAccept}
                  className="px-6 py-2 rounded-lg text-xs font-heading uppercase tracking-wider bg-primary text-primary-foreground glow-gold hover:scale-[1.02] transition-all flex items-center gap-2">
                  <CheckCircle size={14} /> I Agree
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface TermsCheckboxProps {
  accepted: boolean;
  onChange: (v: boolean) => void;
}

export function TermsCheckbox({ accepted, onChange }: TermsCheckboxProps) {
  return (
    <div className="flex items-start gap-2.5 mt-1">
      <input
        type="checkbox"
        id="terms-accept"
        checked={accepted}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 accent-yellow-400 w-4 h-4 cursor-pointer shrink-0"
      />
      <label htmlFor="terms-accept" className="text-xs text-muted-foreground font-display cursor-pointer select-none leading-relaxed">
        I have read and agree to the{' '}
        <TermsModal mode="view" trigger={<span className="text-primary underline hover:text-primary/80 cursor-pointer">Terms &amp; Conditions</span>} />
        {' '}of Beast Cricket Auction
      </label>
    </div>
  );
}
