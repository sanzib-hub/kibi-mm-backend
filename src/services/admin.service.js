const prisma = require('../lib/prismaClient');

const VALID_STATUSES = ['NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'PROPOSAL_SENT', 'CLOSED_WON', 'CLOSED_LOST'];

async function getLeads({ page = 1, limit = 20, status, budgetMin, budgetMax, sport, city }) {
  const skip = (page - 1) * limit;
  const where = {};

  if (status) where.status = status;

  const [leads, total] = await prisma.$transaction([
    prisma.lead.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        brief: {
          include: {
            brandAccount: { select: { id: true, company: true } },
            brandUser: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return {
    data: leads.map(formatLead),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

async function getLeadById(leadId) {
  const lead = await prisma.lead.findUnique({
    where: { id: parseInt(leadId) },
    include: {
      brief: {
        include: {
          brandAccount: true,
          brandUser: { select: { id: true, email: true, firstName: true, lastName: true } },
          matchRuns: {
            orderBy: { ranAt: 'desc' },
            take: 1,
            include: { results: true },
          },
        },
      },
      demoRequests: true,
    },
  });

  if (!lead) throw new Error('LEAD_NOT_FOUND');
  return formatLeadDetail(lead);
}

async function updateLead(leadId, { status, assignedTo, notes }) {
  const lead = await prisma.lead.findUnique({ where: { id: parseInt(leadId) } });
  if (!lead) throw new Error('LEAD_NOT_FOUND');

  if (status && !VALID_STATUSES.includes(status)) {
    throw new Error('INVALID_STATUS');
  }

  const data = {};
  if (status)     data.status = status;
  if (assignedTo !== undefined) data.assignedTo = assignedTo;
  if (notes !== undefined)      data.notes = notes;

  if (status === 'CLOSED_WON' || status === 'CLOSED_LOST') {
    data.closedAt = new Date();
  }

  const updated = await prisma.lead.update({
    where: { id: parseInt(leadId) },
    data,
  });

  return formatLead(updated);
}

function formatLead(lead) {
  return {
    id: lead.id,
    status: lead.status,
    assignedTo: lead.assignedTo,
    notes: lead.notes,
    demoRequestedAt: lead.demoRequestedAt,
    demoScheduledAt: lead.demoScheduledAt,
    closedAt: lead.closedAt,
    createdAt: lead.createdAt,
    brief: lead.brief ? {
      id: lead.brief.id,
      campaignName: lead.brief.campaignName,
      budget: lead.brief.budget,
      budgetCurrency: lead.brief.budgetCurrency,
      campaignObjective: lead.brief.campaignObjective,
      sports: safeParseJson(lead.brief.sports),
      targetCities: safeParseJson(lead.brief.targetCities),
      contactName: lead.brief.contactName,
      contactEmail: lead.brief.contactEmail,
      submittedAt: lead.brief.submittedAt,
      company: lead.brief.brandAccount?.company,
    } : null,
  };
}

function formatLeadDetail(lead) {
  return {
    ...formatLead(lead),
    demoRequests: lead.demoRequests,
    lastMatchRun: lead.brief?.matchRuns?.[0] || null,
  };
}

function safeParseJson(str) {
  try { return JSON.parse(str); } catch { return str; }
}

async function updateAssetIncompatibleCategories(type, id, { incompatibleCategories }) {
  const model = { athlete: prisma.athlete, league: prisma.league, venue: prisma.venue }[type];
  if (!model) throw new Error('INVALID_ASSET_TYPE');

  const value = incompatibleCategories == null ? null
    : Array.isArray(incompatibleCategories) ? JSON.stringify(incompatibleCategories.map(c => String(c).toUpperCase()))
    : typeof incompatibleCategories === 'string' ? JSON.stringify(incompatibleCategories.split(/[,;]/).map(s => s.trim().toUpperCase()).filter(Boolean))
    : null;

  const asset = await model.update({
    where: { id: parseInt(id) },
    data: { incompatibleCategories: value },
  });
  return asset;
}

async function getDashboardStats() {
  const [totalBriefs, leadsByStatus, totalDeliverables, recentActivity] = await Promise.all([
    prisma.campaignBrief.count(),
    prisma.lead.groupBy({ by: ['status'], _count: true }),
    prisma.deliverable.count(),
    prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        brief: {
          include: {
            brandAccount: { select: { id: true, company: true } },
          },
        },
      },
    }),
  ]);
  return {
    totalBriefs,
    leadsByStatus: leadsByStatus.map(g => ({ status: g.status, count: g._count })),
    totalDeliverables,
    recentActivity: recentActivity.map(l => ({
      id: l.id,
      status: l.status,
      createdAt: l.createdAt,
      briefId: l.briefId,
      campaignName: l.brief?.campaignName,
      company: l.brief?.brandAccount?.company,
    })),
  };
}

async function getAssetDetail(type, id) {
  const model = { athlete: prisma.athlete, league: prisma.league, venue: prisma.venue }[type];
  if (!model) throw new Error('INVALID_ASSET_TYPE');

  const asset = await model.findUnique({ where: { id: parseInt(id) } });
  if (!asset) throw new Error('ASSET_NOT_FOUND');
  return asset;
}

module.exports = { getLeads, getLeadById, updateLead, updateAssetIncompatibleCategories, getDashboardStats, getAssetDetail };
