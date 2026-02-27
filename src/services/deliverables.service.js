const prisma = require('../lib/prismaClient');

async function submitDeliverable(briefId, data) {
  // Validate brief exists
  const brief = await prisma.campaignBrief.findUnique({ where: { id: briefId } });
  if (!brief) throw new Error('BRIEF_NOT_FOUND');

  return prisma.deliverable.create({
    data: {
      briefId,
      type: data.type,
      submissionUrl: data.submissionUrl,
      description: data.description || null,
    },
  });
}

async function getDeliverables(briefId) {
  return prisma.deliverable.findMany({
    where: { briefId },
    orderBy: { createdAt: 'desc' },
  });
}

async function reviewDeliverable(deliverableId, { status, feedback }) {
  return prisma.deliverable.update({
    where: { id: deliverableId },
    data: {
      status, // APPROVED, REJECTED, REVISION_REQUESTED
      feedback: feedback || null,
      reviewedAt: new Date(),
    },
  });
}

module.exports = { submitDeliverable, getDeliverables, reviewDeliverable };
