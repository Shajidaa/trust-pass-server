import { prisma } from "../../../libs/prisma";

// ---------------------------------------------------------------------------
// Dashboard — aggregated platform stats
// ---------------------------------------------------------------------------

const getDashboardStats = async () => {
  const [
    totalUsers,
    newUsersThisMonth,
    totalBusinesses,
    verifiedBusinesses,
    pendingVerifications,
    totalProducts,
    activeProducts,
    totalReports,
    pendingReports,
    totalCategories,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        createdAt: { gte: new Date(new Date().setDate(1)) }, // from 1st of current month
      },
    }),
    prisma.business.count(),
    prisma.business.count({ where: { verificationStatus: "VERIFIED" } }),
    prisma.businessVerification.count({
      where: { status: { in: ["PENDING", "UNDER_REVIEW"] } },
    }),
    prisma.product.count({ where: { NOT: { status: "DELETED" } } }),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.report.count(),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.category.count(),
  ]);

  // Business breakdown by verification status
  const businessByStatus = await prisma.business.groupBy({
    by: ["verificationStatus"],
    _count: { id: true },
  });

  // Report breakdown by status
  const reportByStatus = await prisma.report.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  // User breakdown by role
  const userByRole = await prisma.user.groupBy({
    by: ["role"],
    _count: { id: true },
  });

  return {
    users: {
      total: totalUsers,
      newThisMonth: newUsersThisMonth,
      byRole: Object.fromEntries(userByRole.map((r) => [r.role, r._count.id])),
    },
    businesses: {
      total: totalBusinesses,
      verified: verifiedBusinesses,
      pendingVerification: pendingVerifications,
      byStatus: Object.fromEntries(
        businessByStatus.map((b) => [b.verificationStatus, b._count.id]),
      ),
    },
    products: {
      total: totalProducts,
      active: activeProducts,
    },
    reports: {
      total: totalReports,
      pending: pendingReports,
      byStatus: Object.fromEntries(
        reportByStatus.map((r) => [r.status, r._count.id]),
      ),
    },
    categories: {
      total: totalCategories,
    },
  };
};

// ---------------------------------------------------------------------------
// Manage businesses
// ---------------------------------------------------------------------------

const getAdminBusinesses = async (
  page = 1,
  limit = 20,
  search?: string,
  verificationStatus?: string,
) => {
  const skip = (Math.max(1, page) - 1) * Math.min(100, limit);
  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
      { contactEmail: { contains: search, mode: "insensitive" } },
    ];
  }

  if (verificationStatus) where.verificationStatus = verificationStatus;

  const [businesses, total] = await Promise.all([
    prisma.business.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        businessType: true,
        verificationStatus: true,
        trustScore: true,
        isFeatured: true,
        contactEmail: true,
        createdAt: true,
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { products: true, documents: true, reports: true } },
      },
    }),
    prisma.business.count({ where }),
  ]);

  return {
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
    data: businesses,
  };
};

// ---------------------------------------------------------------------------
// Manage reports
// ---------------------------------------------------------------------------

const getAdminReports = async (page = 1, limit = 20, status?: string) => {
  const skip = (Math.max(1, page) - 1) * Math.min(100, limit);
  const where: any = {};
  if (status) where.status = status;

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reason: true,
        title: true,
        status: true,
        penaltyPoints: true,
        createdAt: true,
        updatedAt: true,
        business: { select: { id: true, name: true, slug: true } },
        reporter: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.report.count({ where }),
  ]);

  return {
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
    data: reports,
  };
};

// ---------------------------------------------------------------------------
// Manage users
// ---------------------------------------------------------------------------

const getAdminUsers = async (
  page = 1,
  limit = 20,
  search?: string,
  role?: string,
  status?: string,
) => {
  const skip = (Math.max(1, page) - 1) * Math.min(100, limit);
  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (role) where.role = role;
  if (status) where.status = status;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        provider: true,
        createdAt: true,
        _count: { select: { businesses: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
    data: users,
  };
};

// ---------------------------------------------------------------------------

export const AdminService = {
  getDashboardStats,
  getAdminBusinesses,
  getAdminReports,
  getAdminUsers,
};
