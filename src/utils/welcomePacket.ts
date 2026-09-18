import jsPDF from 'jspdf';
import { Client, PricingSettings } from '../types';

const PROGRAM_LABELS: Record<string, string> = {
  regular: 'Regular Cleaning',
  deep: 'Deep Clean',
  move: 'Move In/Out Clean',
  office: 'Office Cleaning',
};

const FREQUENCY_LABELS: Record<string, string> = {
  'one-time': 'One-Time',
  weekly: 'Weekly',
  'bi-weekly': 'Bi-Weekly',
  monthly: 'Monthly',
};

// Brand colors (emerald/teal, matching the app + site)
const EMERALD: [number, number, number] = [5, 150, 105];
const SLATE_DARK: [number, number, number] = [15, 23, 42];
const SLATE: [number, number, number] = [71, 85, 105];
const SLATE_LIGHT: [number, number, number] = [148, 163, 184];

/**
 * Builds and downloads a one-page "New Client Welcome Packet" PDF: a welcome
 * note, their service summary, the guarantee, and — the main point — a clear
 * explanation of the Give $25/Get $25 referral program with THEIR unique
 * referral code front and center, ready to text or hand to a friend.
 */
export function generateWelcomePacketPdf(client: Client, settings: PricingSettings): void {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 54;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // ---- Header band ----
  doc.setFillColor(...SLATE_DARK);
  doc.rect(0, 0, pageWidth, 96, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('Clean Convictions', margin, 46);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(203, 213, 225);
  doc.text('No Compromise. No Dust. — House & Office Cleaning in Yuma, AZ', margin, 66);
  doc.text(
    [settings.businessPhone, settings.businessEmail, 'cleanconvictions.com'].filter(Boolean).join('   •   '),
    margin,
    82
  );
  y = 132;

  // ---- Welcome heading ----
  doc.setTextColor(...SLATE_DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(`Welcome, ${client.name}!`, margin, y);
  y += 26;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...SLATE);
  const welcomeText =
    "Thank you for choosing Clean Convictions. We're glad to have you, and we're committed to giving you " +
    "the same careful, thorough clean every single visit. Here's a quick summary of your service, plus " +
    'something worth sharing: a referral code worth real money to you and a friend.';
  const welcomeLines = doc.splitTextToSize(welcomeText, contentWidth);
  doc.text(welcomeLines, margin, y);
  y += welcomeLines.length * 14 + 20;

  // ---- Service summary box ----
  const boxTop = y;
  const boxHeight = 108;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, boxTop, contentWidth, boxHeight, 6, 6, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...SLATE_DARK);
  doc.text('YOUR SERVICE', margin + 16, boxTop + 22);

  const rows: [string, string][] = [
    ['Service', PROGRAM_LABELS[client.defaultProgram] || client.defaultProgram],
    ['Frequency', FREQUENCY_LABELS[client.preferredFrequency] || client.preferredFrequency],
    ['Address', client.address || '—'],
    ['Agreed Rate', client.agreedRate ? `$${client.agreedRate} per visit` : '—'],
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  let rowY = boxTop + 42;
  rows.forEach(([label, value]) => {
    doc.setTextColor(...SLATE_LIGHT);
    doc.text(label.toUpperCase(), margin + 16, rowY);
    doc.setTextColor(...SLATE_DARK);
    const valueLines = doc.splitTextToSize(value, contentWidth - 170);
    doc.text(valueLines, margin + 150, rowY);
    rowY += 15 * Math.max(1, valueLines.length);
  });
  y = boxTop + boxHeight + 28;

  // ---- Guarantee line ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...EMERALD);
  doc.text('✓ 24-Hour Free Re-Clean Guarantee', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE);
  doc.text('— tell us within 24 hours if anything was missed and we\'ll come back and fix it, free.', margin + 190, y);
  y += 34;

  // ---- Referral program banner ----
  const referralBoxTop = y;
  const referralBoxHeight = 168;
  doc.setFillColor(...EMERALD);
  doc.roundedRect(margin, referralBoxTop, contentWidth, referralBoxHeight, 8, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Give $25, Get $25', margin + 20, referralBoxTop + 30);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  const referralExplainer = doc.splitTextToSize(
    `Know someone who could use a great cleaning service? Share your code below. When a friend books their ` +
    `first cleaning and mentions it, they get $${settings.referralDiscountAmount || 25} off — and you get ` +
    `$${settings.referralRewardAmount || 25} in credit toward your next cleaning. No limit on how many friends you refer.`,
    contentWidth - 40
  );
  doc.text(referralExplainer, margin + 20, referralBoxTop + 52);

  // Code chip
  const code = client.referralCode || 'ASK-YOUR-CLEANER';
  const chipY = referralBoxTop + 92;
  const chipHeight = 46;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin + 20, chipY, contentWidth - 40, chipHeight, 6, 6, 'F');
  doc.setTextColor(...EMERALD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(code, margin + 20 + (contentWidth - 40) / 2, chipY + 30, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    'Your personal referral code — text it, share it, or hand this page to a friend.',
    margin + 20,
    referralBoxTop + referralBoxHeight - 14
  );

  y = referralBoxTop + referralBoxHeight + 30;

  // ---- Footer ----
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...SLATE_LIGHT);
  doc.text(
    `Questions anytime — ${settings.businessPhone || ''}${settings.businessPhone && settings.businessEmail ? '  •  ' : ''}${settings.businessEmail || ''}`,
    margin,
    y
  );

  const fileSafeName = client.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'client';
  doc.save(`Clean-Convictions-Welcome-Packet-${fileSafeName}.pdf`);
}
