const prisma = require('../lib/prismaClient');
const notificationService = require('./notification.service');

async function createDemoRequest({ brief_id, contact_name, contact_email, contact_phone, preferred_time, notes }, userId) {
  const briefId = parseInt(brief_id);

  const brief = await prisma.campaignBrief.findUnique({
    where: { id: briefId },
    include: { brandAccount: true },
  });
  if (!brief) throw new Error('BRIEF_NOT_FOUND');
  if (brief.brandUserId !== userId) throw new Error('FORBIDDEN');

  const lead = await prisma.lead.findUnique({ where: { briefId } });
  if (!lead) throw new Error('LEAD_NOT_FOUND');

  const demoRequest = await prisma.demoRequest.create({
    data: {
      leadId: lead.id,
      briefId,
      contactName: contact_name,
      contactEmail: contact_email,
      contactPhone: contact_phone || null,
      preferredTime: preferred_time || null,
      notes: notes || null,
    },
  });

  // Advance lead status
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      status: 'DEMO_SCHEDULED',
      demoRequestedAt: new Date(),
    },
  });

  // Send notifications
  notificationService.sendDemoConfirmationEmail(demoRequest, brief, brief.brandAccount);

  return { id: demoRequest.id, leadId: lead.id, status: 'DEMO_SCHEDULED' };
}

module.exports = { createDemoRequest };
