const mailer = require('../lib/mailer');
const { sendSlackMessage } = require('../lib/slackNotifier');
const config = require('../config');

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeParseJson(str, fallback) {
  if (str == null) return fallback;
  try {
    const v = JSON.parse(str);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

async function sendBriefSubmissionNotification(brief, brandUser, brandAccount) {
  const sports = (safeParseJson(brief.sports, []) || []).join(', ') || '—';
  const cities = (safeParseJson(brief.targetCities, []) || []).join(', ') || '—';
  const states = (safeParseJson(brief.targetStates, []) || []).join(', ') || '—';

  const html = `
    <h2 style="color:#1a1a2e">New Brief Submitted — ${escapeHtml(brief.campaignName)}</h2>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:6px;font-weight:bold">Company</td><td style="padding:6px">${escapeHtml(brandAccount.company)}</td></tr>
      <tr><td style="padding:6px;font-weight:bold">Contact</td><td style="padding:6px">${escapeHtml(brief.contactName) || '—'} &lt;${escapeHtml(brief.contactEmail) || '—'}&gt;</td></tr>
      <tr><td style="padding:6px;font-weight:bold">Campaign</td><td style="padding:6px">${escapeHtml(brief.campaignName)}</td></tr>
      <tr><td style="padding:6px;font-weight:bold">Objective</td><td style="padding:6px">${escapeHtml(brief.campaignObjective) || '—'}</td></tr>
      <tr><td style="padding:6px;font-weight:bold">Budget</td><td style="padding:6px">${escapeHtml(brief.budgetCurrency) || 'INR'} ${escapeHtml(brief.budget) || '—'}</td></tr>
      <tr><td style="padding:6px;font-weight:bold">Sports</td><td style="padding:6px">${escapeHtml(sports)}</td></tr>
      <tr><td style="padding:6px;font-weight:bold">Cities</td><td style="padding:6px">${escapeHtml(cities)}</td></tr>
      <tr><td style="padding:6px;font-weight:bold">States</td><td style="padding:6px">${escapeHtml(states)}</td></tr>
    </table>
    <p style="margin-top:20px">
      <a href="${config.frontendUrl}/admin/leads" style="background:#6c63ff;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px">
        View in Admin Dashboard
      </a>
    </p>
  `;

  // Fire and forget
  mailer.sendMail({
    from: config.smtpFrom,
    to: config.notifyEmail,
    subject: `[KIBI] New Brief: ${escapeHtml(brief.campaignName)} — ${escapeHtml(brandAccount.company)}`,
    html,
  }).catch(err => console.warn('[Mailer] Brief notification failed:', err.message));

  sendSlackMessage({
    text: `*New brief submitted*: ${brief.campaignName} by ${brandAccount.company} | Sports: ${sports} | Cities: ${cities}`,
  });
}

async function sendDemoConfirmationEmail(demoRequest, brief, brandAccount) {
  const html = `
    <h2 style="color:#1a1a2e">Demo Request Received</h2>
    <p>Hi ${escapeHtml(demoRequest.contactName)},</p>
    <p>Thank you for requesting a demo for your campaign <strong>${escapeHtml(brief.campaignName)}</strong>.</p>
    <p>Our KIBI Sports team will reach out within 1 business day to schedule your personalised demo and walk you through the full sponsorship packages.</p>
    <hr/>
    <p style="color:#666;font-size:12px">KIBI Sports Platform — connecting brands with athletes, leagues, and venues.</p>
  `;

  mailer.sendMail({
    from: config.smtpFrom,
    to: demoRequest.contactEmail,
    subject: `[KIBI] Demo Request Confirmed — ${escapeHtml(brief.campaignName)}`,
    html,
  }).catch(err => console.warn('[Mailer] Demo confirmation failed:', err.message));

  // Also notify internal team
  mailer.sendMail({
    from: config.smtpFrom,
    to: config.notifyEmail,
    subject: `[KIBI] Demo Requested: ${escapeHtml(brief.campaignName)} — ${escapeHtml(brandAccount.company)}`,
    html: `<p>Demo requested by ${escapeHtml(demoRequest.contactName)} &lt;${escapeHtml(demoRequest.contactEmail)}&gt; for brief: ${escapeHtml(brief.campaignName)}</p><p>Preferred time: ${escapeHtml(demoRequest.preferredTime) || 'Not specified'}</p>`,
  }).catch(err => console.warn('[Mailer] Internal demo notification failed:', err.message));

  sendSlackMessage({
    text: `*Demo requested*: ${brief.campaignName} by ${brandAccount.company} — Contact: ${demoRequest.contactName} <${demoRequest.contactEmail}>`,
  });
}

module.exports = { sendBriefSubmissionNotification, sendDemoConfirmationEmail };
