const prisma = require('../lib/prismaClient');
const notificationService = require('./notification.service');

async function createDemoRequest({ brief_id, contact_name, contact_email, contact_phone, preferred_time, notes }) {
  const briefId = parseInt(brief_id);

  const brief = await prisma.campaignBrief.findUnique({ where: { id: briefId } });
  if (!brief) throw new Error('BRIEF_NOT_FOUND');

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

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      status: 'DEMO_SCHEDULED',
      demoRequestedAt: new Date(),
    },
  });

  notificationService.sendDemoConfirmationEmail(demoRequest, brief);

  return { id: demoRequest.id, leadId: lead.id, status: 'DEMO_SCHEDULED' };
}

module.exports = { createDemoRequest };
