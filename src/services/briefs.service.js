const prisma = require('../lib/prismaClient');
const notificationService = require('./notification.service');

function safeJson(val) {
  if (!val) return null;
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}

async function createBrief(data, user) {
  const brief = await prisma.$transaction(async (tx) => {
    const newBrief = await tx.campaignBrief.create({
      data: {
        brandAccountId: user.brandAccountId,
        brandUserId: user.id,
        campaignName: data.campaignName,
        budget: data.budget ? parseFloat(data.budget) : null,
        budgetCurrency: data.budgetCurrency || 'INR',
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        campaignObjective: data.campaignObjective || null,
        sports: safeJson(data.sports),
        targetCities: safeJson(data.targetCities),
        targetStates: safeJson(data.targetStates),
        targetRegions: safeJson(data.targetRegions),
        assetCategories: safeJson(data.assetCategories || ['athlete', 'league', 'venue']),
        athleteTiers: safeJson(data.athleteTiers),
        deliverables: safeJson(data.deliverables),
        notes: data.notes || null,
        contactName: data.contactName || null,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        status: data.status === 'DRAFT' ? 'DRAFT' : 'SUBMITTED',
        submittedAt: data.status === 'DRAFT' ? null : new Date(),
      },
    });

    const lead = await tx.lead.create({
      data: {
        briefId: newBrief.id,
        status: 'NEW',
      },
    });

    return { brief: newBrief, lead };
  });

  // Send notifications if submitted (non-blocking)
  if (brief.brief.status === 'SUBMITTED') {
    const brandUser = await prisma.brandUser.findUnique({
      where: { id: user.id },
      include: { brandAccount: true },
    });
    notificationService.sendBriefSubmissionNotification(
      brief.brief,
      brandUser,
      brandUser.brandAccount
    );
  }

  return { id: brief.brief.id, leadId: brief.lead.id, status: brief.brief.status };
}

async function getBriefForUser(briefId, userId) {
  const brief = await prisma.campaignBrief.findUnique({ where: { id: briefId } });
  if (!brief) throw new Error('BRIEF_NOT_FOUND');
  if (brief.brandUserId !== userId) throw new Error('FORBIDDEN');
  return parseBriefFields(brief);
}

async function getLatestResults(briefId, userId) {
  const brief = await prisma.campaignBrief.findUnique({ where: { id: briefId } });
  if (!brief) throw new Error('BRIEF_NOT_FOUND');
  if (brief.brandUserId !== userId) throw new Error('FORBIDDEN');

  const matchRun = await prisma.matchRun.findFirst({
    where: { briefId },
    orderBy: { ranAt: 'desc' },
    include: { results: true },
  });

  if (!matchRun) return { match_run_id: null, athletes: [], leagues: [], venues: [] };

  return {
    match_run_id: matchRun.id,
    is_relaxed: matchRun.relaxationsJson
      ? Object.keys(JSON.parse(matchRun.relaxationsJson || '{}')).length > 0
      : false,
    athletes: matchRun.results.filter(r => r.assetType === 'athlete'),
    leagues:  matchRun.results.filter(r => r.assetType === 'league'),
    venues:   matchRun.results.filter(r => r.assetType === 'venue'),
  };
}

async function updateBriefStatus(briefId, status) {
  return prisma.campaignBrief.update({
    where: { id: briefId },
    data: { status, submittedAt: status === 'SUBMITTED' ? new Date() : undefined },
  });
}

function parseBriefFields(brief) {
  const safe = (v) => { try { return JSON.parse(v); } catch { return v; } };
  return {
    ...brief,
    sports:          safe(brief.sports),
    targetCities:    safe(brief.targetCities),
    targetStates:    safe(brief.targetStates),
    targetRegions:   safe(brief.targetRegions),
    assetCategories: safe(brief.assetCategories),
    athleteTiers:    safe(brief.athleteTiers),
    deliverables:    safe(brief.deliverables),
  };
}

module.exports = { createBrief, getBriefForUser, getLatestResults, updateBriefStatus };
