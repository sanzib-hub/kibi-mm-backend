const prisma = require('../lib/prismaClient');

const VALID_STATUSES = ['NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'PROPOSAL_SENT', 'CLOSED_WON', 'CLOSED_LOST'];

async function getLeads({ page = 1, limit = 20, status, budgetMin, budgetMax, sport, city }) {
  const skip = (page - 1) * limit;
  const where = {};

  if (status) where.status = status;

  // Filter on related brief fields
  const briefWhere = {};
  if (budgetMin !== undefined) briefWhere.budget = { ...briefWhere.budget, gte: budgetMin };
  if (budgetMax !== undefined) briefWhere.budget = { ...briefWhere.budget, lte: budgetMax };
  if (sport) briefWhere.sports = { contains: sport, mode: 'insensitive' };
  if (city) briefWhere.targetCities = { contains: city, mode: 'insensitive' };

  if (Object.keys(briefWhere).length > 0) {
    where.brief = briefWhere;
  }

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
  const id = typeof leadId === 'number' ? leadId : parseInt(leadId);
  const lead = await prisma.lead.findUnique({
    where: { id },
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
  const id = typeof leadId === 'number' ? leadId : parseInt(leadId);
  const lead = await prisma.lead.findUnique({ where: { id } });
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
    where: { id },
    data,
    include: {
      brief: {
        include: {
          brandAccount: { select: { id: true, company: true } },
        },
      },
    },
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

  const parsedId = typeof id === 'number' ? id : parseInt(id);
  const value = incompatibleCategories == null ? null
    : Array.isArray(incompatibleCategories) ? JSON.stringify(incompatibleCategories.map(c => String(c).toUpperCase()))
    : typeof incompatibleCategories === 'string' ? JSON.stringify(incompatibleCategories.split(/[,;]/).map(s => s.trim().toUpperCase()).filter(Boolean))
    : null;

  const asset = await model.update({
    where: { id: parsedId },
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

  const parsedId = typeof id === 'number' ? id : parseInt(id);
  const asset = await model.findUnique({ where: { id: parsedId } });
  if (!asset) throw new Error('ASSET_NOT_FOUND');
  return asset;
}

async function getCampaignAnalytics() {
  const [
    totalBriefs,
    briefsByStatus,
    leadsByStatus,
    avgMatchScore,
    topSportsRaw,
    activeBriefs,
  ] = await Promise.all([
    prisma.campaignBrief.count(),
    prisma.campaignBrief.groupBy({ by: ['status'], _count: true }),
    prisma.lead.groupBy({ by: ['status'], _count: true }),
    prisma.matchResult.aggregate({ _avg: { score: true } }),
    prisma.campaignBrief.findMany({ select: { sports: true } }),
    prisma.campaignBrief.count({ where: { status: 'SUBMITTED' } }),
  ]);

  // Compute top sports from the JSON sports field
  const sportCounts = {};
  for (const row of topSportsRaw) {
    const parsed = safeParseJson(row.sports);
    const sportsList = Array.isArray(parsed) ? parsed : (typeof parsed === 'string' && parsed ? [parsed] : []);
    for (const s of sportsList) {
      const key = String(s).trim();
      if (key) sportCounts[key] = (sportCounts[key] || 0) + 1;
    }
  }
  const topSports = Object.entries(sportCounts)
    .map(([sport, count]) => ({ sport, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Lead funnel: ordered status counts
  const funnelOrder = ['NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'PROPOSAL_SENT', 'CLOSED_WON', 'CLOSED_LOST'];
  const statusMap = {};
  for (const g of leadsByStatus) {
    statusMap[g.status] = g._count;
  }
  const leadFunnel = funnelOrder.map(status => ({
    status,
    count: statusMap[status] || 0,
  }));

  const closedWon = statusMap['CLOSED_WON'] || 0;
  const totalLeads = leadsByStatus.reduce((sum, g) => sum + g._count, 0);
  const conversionRate = totalLeads > 0 ? ((closedWon / totalLeads) * 100).toFixed(1) : '0.0';

  return {
    totalBriefs,
    activeBriefs,
    avgMatchScore: avgMatchScore._avg.score ? parseFloat(avgMatchScore._avg.score.toFixed(1)) : 0,
    conversionRate: parseFloat(conversionRate),
    leadFunnel,
    topSports,
    briefsByStatus: briefsByStatus.map(g => ({ status: g.status, count: g._count })),
  };
}

async function getBrands({ page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;

  const [brands, total] = await prisma.$transaction([
    prisma.brandAccount.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { briefs: true } },
        users: { select: { id: true, email: true, firstName: true, lastName: true }, take: 1 },
        briefs: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
      },
    }),
    prisma.brandAccount.count(),
  ]);

  return {
    data: brands.map(b => ({
      id: b.id,
      company: b.company,
      industry: b.industry,
      website: b.website,
      briefsCount: b._count.briefs,
      lastActivity: b.briefs[0]?.createdAt || b.createdAt,
      primaryContact: b.users[0] || null,
      createdAt: b.createdAt,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

async function getBrandById(brandId) {
  const id = typeof brandId === 'number' ? brandId : parseInt(brandId);
  const brand = await prisma.brandAccount.findUnique({
    where: { id },
    include: {
      users: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
      briefs: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          campaignName: true,
          sports: true,
          budget: true,
          budgetCurrency: true,
          status: true,
          submittedAt: true,
          createdAt: true,
        },
      },
    },
  });

  if (!brand) throw new Error('BRAND_NOT_FOUND');

  return {
    id: brand.id,
    company: brand.company,
    industry: brand.industry,
    website: brand.website,
    createdAt: brand.createdAt,
    updatedAt: brand.updatedAt,
    users: brand.users,
    briefs: brand.briefs.map(b => ({
      ...b,
      sports: safeParseJson(b.sports),
    })),
  };
}

async function updateBrand(brandId, { company, industry, website }) {
  const id = typeof brandId === 'number' ? brandId : parseInt(brandId);
  const data = {};

  if (company !== undefined) {
    if (typeof company !== 'string' || !company.trim()) {
      throw new Error('VALIDATION_ERROR');
    }
    if (company.length > 500) throw new Error('VALIDATION_ERROR');
    data.company = company.trim();
  }
  if (industry !== undefined) {
    if (typeof industry === 'string' && industry.length > 500) throw new Error('VALIDATION_ERROR');
    data.industry = industry;
  }
  if (website !== undefined) {
    if (website !== null && typeof website === 'string' && website.trim()) {
      if (!website.startsWith('http')) throw new Error('VALIDATION_ERROR');
      if (website.length > 500) throw new Error('VALIDATION_ERROR');
    }
    data.website = website;
  }

  const brand = await prisma.brandAccount.update({
    where: { id },
    data,
  });
  return brand;
}

// Whitelisted fields per asset type (from Prisma schema, excluding auto-managed fields like id, createdAt, updatedAt)
const ALLOWED_FIELDS = {
  athlete: new Set([
    'name', 'sport', 'city', 'state', 'tier', 'bio', 'imageUrl',
    'socialFollowers', 'featuredFlag', 'incompatibleCategories',
    'status', 'sourceSheet', 'externalId',
  ]),
  league: new Set([
    'name', 'sport', 'city', 'state', 'season', 'level',
    'featuredFlag', 'incompatibleCategories', 'status',
    'logoUrl', 'sourceSheet', 'externalId',
  ]),
  venue: new Set([
    'name', 'type', 'city', 'state', 'sportsSupported', 'capacity',
    'featuredFlag', 'incompatibleCategories', 'status',
    'imageUrl', 'sourceSheet', 'externalId',
  ]),
};

function whitelistFields(data, type) {
  const allowed = ALLOWED_FIELDS[type];
  if (!allowed) return {};
  const result = {};
  for (const [k, v] of Object.entries(data)) {
    if (allowed.has(k)) result[k] = v;
  }
  return result;
}

async function bulkImportAssets(type, assets) {
  const model = { athlete: prisma.athlete, league: prisma.league, venue: prisma.venue }[type];
  if (!model) throw new Error('INVALID_ASSET_TYPE');

  const results = { created: 0, updated: 0, errors: [] };

  for (const asset of assets) {
    try {
      // Whitelist fields first — strip unknown/disallowed fields
      const cleaned = whitelistFields(asset, type);

      // Clean up the asset data — convert types
      if (cleaned.capacity) cleaned.capacity = parseInt(cleaned.capacity) || null;
      if (cleaned.socialFollowers) cleaned.socialFollowers = parseInt(cleaned.socialFollowers) || null;
      if (cleaned.featuredFlag !== undefined) cleaned.featuredFlag = cleaned.featuredFlag === 'true' || cleaned.featuredFlag === true;

      // Remove fields that are empty strings
      for (const [k, v] of Object.entries(cleaned)) {
        if (v === '' || v === undefined) delete cleaned[k];
      }

      if (cleaned.externalId) {
        // Check if record with this externalId exists
        const existing = await model.findFirst({ where: { externalId: cleaned.externalId } });
        if (existing) {
          await model.update({ where: { id: existing.id }, data: cleaned });
          results.updated++;
        } else {
          await model.create({ data: cleaned });
          results.created++;
        }
      } else {
        await model.create({ data: cleaned });
        results.created++;
      }
    } catch (error) {
      results.errors.push({ asset: asset.name || 'Unknown', error: error.message });
    }
  }

  return results;
}

async function getMatchRunsForBrief(briefId) {
  const id = typeof briefId === 'number' ? briefId : parseInt(briefId);
  const runs = await prisma.matchRun.findMany({
    where: { briefId: id },
    orderBy: { ranAt: 'desc' },
    include: {
      _count: { select: { results: true } },
    },
  });

  return runs.map(r => ({
    id: r.id,
    briefId: r.briefId,
    params: safeParseJson(r.paramsJson),
    relaxations: safeParseJson(r.relaxationsJson),
    totalCandidates: r.totalCandidates,
    resultCount: r._count.results,
    ranAt: r.ranAt,
  }));
}

async function addLeadNote(leadId, noteText) {
  const id = typeof leadId === 'number' ? leadId : parseInt(leadId);
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new Error('LEAD_NOT_FOUND');

  // Notes stored as JSON array of { text, timestamp }
  let existingNotes = [];
  if (lead.notes) {
    try {
      const parsed = JSON.parse(lead.notes);
      if (Array.isArray(parsed)) existingNotes = parsed;
      else existingNotes = [{ text: lead.notes, timestamp: lead.createdAt.toISOString() }];
    } catch {
      existingNotes = [{ text: lead.notes, timestamp: lead.createdAt.toISOString() }];
    }
  }

  existingNotes.unshift({ text: noteText, timestamp: new Date().toISOString() });

  const updated = await prisma.lead.update({
    where: { id },
    data: { notes: JSON.stringify(existingNotes) },
    include: {
      brief: {
        include: {
          brandAccount: { select: { id: true, company: true } },
        },
      },
    },
  });

  return formatLead(updated);
}

module.exports = {
  getLeads,
  getLeadById,
  updateLead,
  updateAssetIncompatibleCategories,
  getDashboardStats,
  getAssetDetail,
  getCampaignAnalytics,
  getBrands,
  getBrandById,
  updateBrand,
  bulkImportAssets,
  getMatchRunsForBrief,
  addLeadNote,
};
