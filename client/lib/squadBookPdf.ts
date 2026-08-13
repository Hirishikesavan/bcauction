'use client';
// ════════════════════════════════════════════════════════════════════════════
// SQUAD BOOK PDF GENERATOR — Fixed Version
// ════════════════════════════════════════════════════════════════════════════

const GOLD = '#f5b942';
const GOLD_LIGHT = '#ffe3a3';
const NAVY_DARK = '#070b14';
const NAVY = '#0c1a2e';
const NAVY_LIGHT = '#13243d';

const PAGE_W = 1240;
const PAGE_H = 1754;

function escapeHtml(s: string) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c] as string));
}

function roleEmoji(role: string) {
  return ({ Batsman:'BAT', Bowler:'BWL', AllRounder:'AR', WicketKeeper:'WK', Other:'PLY' } as any)[role] || 'PLY';
}

// Convert an image URL to a base64 data URL (bypasses CORS for html2canvas)
async function toDataUrl(url: string): Promise<string> {
  try {
    // If it's already a data URL or SVG, return as-is
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;
    const res = await fetch(url, { mode: 'cors', cache: 'force-cache' });
    if (!res.ok) return '';
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

async function renderPageToCanvas(html: string): Promise<HTMLCanvasElement> {
  const html2canvas = (await import('html2canvas')).default;
  const container = document.createElement('div');
  container.style.cssText = `position:fixed;left:-99999px;top:0;width:${PAGE_W}px;height:${PAGE_H}px;overflow:hidden;z-index:-1;`;
  container.innerHTML = html;
  document.body.appendChild(container);
  try {
    const canvas = await html2canvas(container, {
      width: PAGE_W,
      height: PAGE_H,
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: NAVY_DARK,
      logging: false,
      imageTimeout: 8000,
      removeContainer: false,
    });
    return canvas;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

const baseStyles = `
  *{box-sizing:border-box;margin:0;padding:0;}
  .page{width:${PAGE_W}px;height:${PAGE_H}px;position:relative;background:
    linear-gradient(135deg,${NAVY_DARK} 0%,${NAVY} 40%,${NAVY_LIGHT} 100%);
    font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#fff;overflow:hidden;}
  .frame{position:absolute;inset:0;border:2px solid ${GOLD};box-shadow:inset 0 0 0 12px ${NAVY_DARK},inset 0 0 0 16px ${GOLD}44,0 0 60px ${GOLD}22;}
  .topbar{position:absolute;top:0;left:0;right:0;height:12px;background:linear-gradient(90deg,${GOLD},${GOLD_LIGHT},${GOLD});box-shadow:0 2px 12px ${GOLD}33;}
  .botbar{position:absolute;bottom:0;left:0;right:0;height:12px;background:linear-gradient(90deg,${GOLD},${GOLD_LIGHT},${GOLD});box-shadow:0 -2px 12px ${GOLD}33;}
  .glow{position:absolute;top:-150px;left:50%;transform:translateX(-50%);width:1200px;height:600px;background:radial-gradient(ellipse closest-side,${GOLD}18,transparent 65%);}
  .footer{position:absolute;bottom:28px;left:60px;right:60px;display:flex;align-items:center;justify-content:space-between;}
  .footer-brand{font-size:16px;letter-spacing:2.5px;color:#ffffff77;font-weight:600;text-transform:uppercase;}
  .footer-sponsors{display:flex;align-items:center;gap:24px;}
  .footer-sponsors img{height:56px;max-width:200px;object-fit:contain;}
  .footer-sponsors-label{font-size:11px;letter-spacing:1.5px;color:${GOLD};font-weight:600;margin-right:8px;text-transform:uppercase;}
`;

function coverHtml(auctionName: string, sponsorsBlock: string) {
  return `<style>${baseStyles}</style>
  <div class="page">
    <div class="glow"></div>
    <div class="topbar"></div><div class="botbar"></div>
    <div class="frame"></div>
    <div style="position:absolute;top:220px;left:0;right:0;text-align:center;">
      <div style="font-size:26px;letter-spacing:8px;color:${GOLD};font-weight:700;text-transform:uppercase;">Official Squad Report</div>
      <div style="margin-top:32px;font-size:72px;font-weight:800;letter-spacing:1.5px;line-height:1.1;color:${GOLD_LIGHT};text-shadow:0 2px 0 ${GOLD},0 4px 12px rgba(0,0,0,0.6);padding:0 60px;">${escapeHtml(auctionName).toUpperCase()}</div>
      <div style="margin-top:24px;width:280px;height:3px;background:linear-gradient(90deg,transparent,${GOLD},transparent);margin-left:auto;margin-right:auto;"></div>
      <div style="margin-top:26px;font-size:18px;color:#ffffff99;letter-spacing:3px;text-transform:uppercase;">Complete Team Squads · ${new Date().getFullYear()}</div>
      <div style="margin-top:8px;font-size:14px;color:#ffffff66;">Generated ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</div>
    </div>
    <div style="position:absolute;left:0;right:0;bottom:110px;text-align:center;font-size:100px;opacity:0.08;filter:blur(2px);">B</div>
    <div class="footer">
      <div class="footer-brand">Beast Cricket Auction Platform</div>
      <div class="footer-sponsors">${sponsorsBlock}</div>
    </div>
  </div>`;
}

function teamPageHtml(tr: any, sponsorsBlock: string, teamLogoB64: string, playerImgB64Map: Record<string, string>) {
  const squad = tr.squad || [];
  const cols = squad.length > 15 ? 5 : squad.length > 8 ? 4 : 3;
  const color = tr.team?.primaryColor || GOLD;

  const cards = squad.map((p: any) => {
    const imgSrc = playerImgB64Map[p._id] || playerImgB64Map[p.imageUrl] || '';
    return `
    <div style="background:linear-gradient(160deg,#ffffff10,#ffffff03);border:1px solid ${GOLD}55;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;aspect-ratio:3/4;">
      <div style="position:relative;width:100%;height:70%;background:#0006;">
        ${imgSrc ? `<img src="${imgSrc}" style="width:100%;height:100%;object-fit:contain;object-position:center;display:block;background:#10182a;"/>` : ''}
        <div style="${imgSrc ? 'display:none;' : ''}width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:46px;background:#ffffff08;">${roleEmoji(p.role)}</div>
        <div style="position:absolute;left:0;right:0;bottom:0;height:50%;background:linear-gradient(180deg,transparent,#000000cc);"></div>
        <div style="position:absolute;top:8px;left:8px;background:${color};color:#000;font-size:11px;font-weight:bold;padding:3px 8px;border-radius:6px;letter-spacing:0.5px;">${escapeHtml(p.role||'').toUpperCase()}</div>
      </div>
      <div style="padding:12px 10px;text-align:center;background:linear-gradient(180deg,transparent,#00000033);">
        <div style="font-size:12px;font-weight:bold;letter-spacing:0.2px;color:#fff;line-height:1.3;word-wrap:break-word;hyphens:auto;">${escapeHtml(p.name||'').toUpperCase()}</div>
        <div style="margin-top:4px;font-size:13px;font-weight:bold;color:${GOLD};">${p.soldPrice ? '₹'+Number(p.soldPrice).toLocaleString('en-IN') : '—'}</div>
      </div>
    </div>`;
  }).join('');

  const logoSrc = teamLogoB64 || '';

  return `<style>${baseStyles}</style>
  <div class="page">
    <div class="glow"></div>
    <div class="topbar"></div><div class="botbar"></div>
    <div class="frame"></div>

    <div style="position:absolute;top:38px;left:60px;right:60px;display:flex;align-items:center;gap:20px;">
      <div style="position:relative;">
        ${logoSrc ? `<img src="${logoSrc}" style="width:88px;height:88px;border-radius:50%;object-fit:cover;border:3px solid ${GOLD};box-shadow:0 0 20px ${GOLD}44;"/>` : `<div style="width:88px;height:88px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:${GOLD};font-family:sans-serif;border:3px solid ${GOLD};">${(tr.team?.name||'T')?.charAt(0)?.toUpperCase()||'T'}</div>`}
      </div>
      <div>
        <div style="font-size:42px;font-weight:800;letter-spacing:0.8px;color:#fff;line-height:1.1;">${escapeHtml((tr.team?.name||'').toUpperCase())}</div>
        <div style="margin-top:4px;font-size:15px;color:${GOLD};letter-spacing:1.5px;text-transform:uppercase;">Owner: ${escapeHtml(tr.team?.ownerName||'—')}</div>
      </div>
    </div>

    <div style="position:absolute;top:150px;left:60px;right:60px;display:flex;gap:14px;">
      ${[
        ['Total Players', String(tr.squadSize ?? squad.length)],
        ['Squad Value', '₹'+Number(tr.totalSpent||0).toLocaleString('en-IN')],
        ['Purse Left', '₹'+Number(tr.remainingPurse||0).toLocaleString('en-IN')],
      ].map(([label,val]) => `
        <div style="flex:1;background:linear-gradient(135deg,#ffffff08,#ffffff03);border:1px solid ${GOLD}33;border-radius:10px;padding:12px 16px;">
          <div style="font-size:11px;letter-spacing:1px;color:#ffffff99;text-transform:uppercase;">${label}</div>
          <div style="margin-top:3px;font-size:22px;font-weight:700;color:#fff;">${val}</div>
        </div>`).join('')}
    </div>

    <div style="position:absolute;top:230px;left:60px;right:60px;height:1px;background:linear-gradient(90deg,${GOLD}66,transparent);"></div>

    <div style="position:absolute;top:254px;left:60px;right:60px;bottom:90px;display:grid;grid-template-columns:repeat(${cols},1fr);grid-auto-rows:1fr;gap:12px;">
      ${cards}
    </div>

    <div class="footer">
      <div class="footer-brand">Beast Cricket Auction Platform</div>
      <div class="footer-sponsors">${sponsorsBlock}</div>
    </div>
  </div>`;
}

export async function generateSquadBookPdf(opts: {
  auctionName: string;
  teamReports: any[];
  sponsors?: any[];
  imgUrl: (s: string) => string;
  onProgress?: (msg: string) => void;
}) {
  const { auctionName, teamReports, sponsors = [], imgUrl, onProgress } = opts;

  // Validate inputs upfront
  if (!auctionName || typeof auctionName !== 'string') throw new Error('Auction name is required');
  if (!Array.isArray(teamReports) || teamReports.length === 0) throw new Error('No team reports to export — squad data may not be available yet');

  const validTeams = teamReports.filter(tr => tr && tr.team);
  if (validTeams.length === 0) throw new Error('No valid team data found');

  console.log(`[PDF] Starting generation for "${auctionName}" with ${validTeams.length} team(s)`);

  try {
    const { jsPDF } = await import('jspdf');

    onProgress?.('Pre-loading images…');

    // Pre-load all images as base64 to avoid CORS issues in html2canvas
    const sponsorImgMap: Record<string, string> = {};
    for (const s of sponsors.slice(0, 4)) {
      if (s?.logoUrl) {
        try { sponsorImgMap[s.logoUrl] = await toDataUrl(imgUrl(s.logoUrl)); } catch {}
      }
    }

    const sponsorsBlock = sponsors.slice(0, 4).map((s: any) => {
      const b64 = s.logoUrl ? sponsorImgMap[s.logoUrl] : '';
      return b64 ? `<img src="${b64}" />` : '';
    }).filter(Boolean).join('');
    const sponsorsHtml = sponsorsBlock ? `<div class="footer-sponsors-label">SPONSORED BY</div>${sponsorsBlock}` : '';

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [PAGE_W, PAGE_H] });

    onProgress?.('Building cover page…');
    try {
      const coverCanvas = await renderPageToCanvas(coverHtml(auctionName, sponsorsHtml));
      pdf.addImage(coverCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, PAGE_W, PAGE_H);
    } catch (coverErr) {
      console.error('[PDF] Cover page render failed:', coverErr);
      // Add blank cover as fallback
      pdf.setFillColor(7, 11, 20);
      pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');
      pdf.setTextColor(245, 185, 66);
      pdf.setFontSize(48);
      pdf.text(auctionName.toUpperCase(), PAGE_W / 2, PAGE_H / 2, { align: 'center' });
    }

    for (let i = 0; i < validTeams.length; i++) {
      const tr = validTeams[i];
      const teamName = tr.team?.name || `Team ${i + 1}`;
      onProgress?.(`Processing ${teamName} (${i + 1}/${validTeams.length})…`);

      try {
        // Pre-load team logo
        let teamLogoB64 = '';
        if (tr.team?.logo) {
          try { teamLogoB64 = await toDataUrl(imgUrl(tr.team.logo)); } catch {}
        }

        // Pre-load player images
        const playerImgB64Map: Record<string, string> = {};
        const squad = tr.squad || [];
        await Promise.allSettled(
          squad.slice(0, 30).map(async (p: any) => {
            if (p.imageUrl) {
              try {
                const b64 = await toDataUrl(imgUrl(p.imageUrl));
                if (b64) {
                  playerImgB64Map[p._id] = b64;
                  playerImgB64Map[p.imageUrl] = b64;
                }
              } catch {}
            }
          })
        );

        pdf.addPage([PAGE_W, PAGE_H], 'portrait');
        const canvas = await renderPageToCanvas(teamPageHtml(tr, sponsorsHtml, teamLogoB64, playerImgB64Map));
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, PAGE_W, PAGE_H);
      } catch (teamErr) {
        console.error(`[PDF] Team page render failed for ${teamName}:`, teamErr);
        // Add a simple text-only fallback page
        pdf.addPage([PAGE_W, PAGE_H], 'portrait');
        pdf.setFillColor(7, 11, 20);
        pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');
        pdf.setTextColor(245, 185, 66);
        pdf.setFontSize(36);
        pdf.text(teamName.toUpperCase(), PAGE_W / 2, 200, { align: 'center' });
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(16);
        const squad = tr.squad || [];
        squad.forEach((p: any, idx: number) => {
          pdf.text(`${p.name || ''} — ${p.role || ''} — ₹${Number(p.soldPrice || 0).toLocaleString('en-IN')}`, 120, 320 + idx * 36);
        });
      }
    }

    onProgress?.('Saving PDF…');
    const safeFilename = (auctionName || 'Squad').replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
    pdf.save(`${safeFilename}-Squad-Report.pdf`);
    console.log('[PDF] Generation complete');
  } catch (err: any) {
    console.error('[PDF] Fatal error:', err);
    throw new Error(err?.message || 'PDF generation failed');
  }
}
