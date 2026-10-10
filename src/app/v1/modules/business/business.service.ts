import httpStatus from "http-status";
import AppError from "../../../errors/AppError";
import {
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../../../libs/cloudinary";
import { prisma } from "../../../libs/prisma";
import {
  IAddressPayload,
  IBusinessFiles,
  IBusinessFilters,
  ICreateBusinessPayload,
  IUpdateBusinessPayload,
} from "./business.interface";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const toSlug = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

const BUSINESS_SELECT = {
  id: true,
  ownerId: true,
  name: true,
  slug: true,
  description: true,
  logoUrl: true,
  coverUrl: true,
  categoryId: true,
  businessType: true,
  websiteUrl: true,
  instaUrl: true,
  tiktokUrl: true,
  contactEmail: true,
  contactPhone: true,
  verificationStatus: true,
  trustScore: true,
  trustScoreUpdatedAt: true,
  isFeatured: true,
  createdAt: true,
  updatedAt: true,
  address: true,
} as const;

const resolveUniqueSlug = async (
  base: string,
  excludeId?: string,
): Promise<string> => {
  let slug = base;
  let attempt = 0;
  while (true) {
    const conflict = await prisma.business.findFirst({
      where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (!conflict) return slug;
    slug = `${base}-${++attempt}`;
  }
};

// ---------------------------------------------------------------------------
// List businesses  (public, paginated)
// ---------------------------------------------------------------------------

const listBusinesses = async (filters: IBusinessFilters) => {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 10));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { slug: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.businessType) where.businessType = filters.businessType;
  if (filters.verificationStatus)
    where.verificationStatus = filters.verificationStatus;

  const [businesses, total] = await Promise.all([
    prisma.business.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: BUSINESS_SELECT,
    }),
    prisma.business.count({ where }),
  ]);

  return {
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
    data: businesses,
  };
};

// ---------------------------------------------------------------------------
// Get by ID  (public)
// ---------------------------------------------------------------------------

const getBusinessById = async (id: string) => {
  const business = await prisma.business.findUnique({
    where: { id },
    select: BUSINESS_SELECT,
  });
  if (!business) throw new AppError(httpStatus.NOT_FOUND, "Business not found.");
  return business;
};

// ---------------------------------------------------------------------------
// Get by slug  (public)
// ---------------------------------------------------------------------------

const getBusinessBySlug = async (slug: string) => {
  const business = await prisma.business.findUnique({
    where: { slug },
    select: BUSINESS_SELECT,
  });
  if (!business) throw new AppError(httpStatus.NOT_FOUND, "Business not found.");
  return business;
};

// ---------------------------------------------------------------------------
// List own businesses  (SELLER)
// ---------------------------------------------------------------------------

const getMyBusinesses = async (ownerId: string) => {
  return prisma.business.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    select: BUSINESS_SELECT,
  });
};

// ---------------------------------------------------------------------------
// Create business  (SELLER)
// ---------------------------------------------------------------------------

const createBusiness = async (
  ownerId: string,
  payload: ICreateBusinessPayload,
  files?: IBusinessFiles,
) => {
  const baseSlug = toSlug(payload.name);
  const slug = await resolveUniqueSlug(baseSlug);

  // 1. Upload logo + cover in parallel BEFORE touching the DB.
  //    Track publicIds for compensating rollback if the DB write fails.
  const uploadedPublicIds: string[] = [];

  const [logoResult, coverResult] = await Promise.all([
    files?.logo
      ? uploadToCloudinary(
        files.logo.buffer,
        `trust-pass/businesses/${ownerId}/logo`,
        `logo_${slug}`,
      ).then((r) => {
        uploadedPublicIds.push(r.publicId);
        return r;
      })
      : Promise.resolve(null),

    files?.cover
      ? uploadToCloudinary(
        files.cover.buffer,
        `trust-pass/businesses/${ownerId}/cover`,
        `cover_${slug}`,
      ).then((r) => {
        uploadedPublicIds.push(r.publicId);
        return r;
      })
      : Promise.resolve(null),
  ]);

  // Uploaded file takes priority over any URL string passed in the body
  const logoUrl = logoResult?.url ?? payload.logoUrl;
  const coverUrl = coverResult?.url ?? payload.coverUrl;

  // 2. Create address record if provided
  let addressId: string | undefined;
  if (payload.address) {
    const addr = await prisma.address.create({
      data: {
        addressLine: payload.address.addressLine,
        city: payload.address.city,
        district: payload.address.district,
        division: payload.address.division,
        postalCode: payload.address.postalCode,
        country: payload.address.country ?? "BANGLADESH",
      },
    });
    addressId = addr.id;
  }

  // 3. DB transaction — business + initial verification record atomically.
  //    On failure: compensate by deleting any uploaded Cloudinary assets.
  try {
    return await prisma.$transaction(async (tx) => {
      const newBusiness = await tx.business.create({
        data: {
          ownerId,
          name: payload.name.trim(),
          slug,
          description: payload.description,
          logoUrl,
          coverUrl,
          categoryId: payload.categoryId,
          businessType: payload.businessType ?? "INDIVIDUAL",
          websiteUrl: payload.websiteUrl,
          instaUrl: payload.instaUrl,
          tiktokUrl: payload.tiktokUrl,
          contactEmail: payload.contactEmail,
          contactPhone: payload.contactPhone,
          addressId,
          verificationStatus: "PENDING",
        },
        select: BUSINESS_SELECT,
      });

      await tx.businessVerification.create({
        data: {
          businessId: newBusiness.id,
          submittedBy: ownerId,
          status: "PENDING",
        },
      });

      return newBusiness;
    });
  } catch (err) {
    // Compensating action — delete orphaned Cloudinary assets
    await Promise.allSettled(uploadedPublicIds.map(deleteFromCloudinary));
    throw err;
  }
};

// ---------------------------------------------------------------------------
// Update business  (SELLER — own only)
// ---------------------------------------------------------------------------

const updateBusiness = async (
  id: string,
  ownerId: string,
  payload: IUpdateBusinessPayload,
  files?: IBusinessFiles,
) => {
  const existing = await prisma.business.findUnique({
    where: { id },
    select: {
      id: true,
      ownerId: true,
      name: true,
      slug: true,
      logoUrl: true,
      coverUrl: true,
    },
  });

  if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Business not found.");

  if (existing.ownerId !== ownerId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You do not have permission to update this business.",
    );
  }

  let slug = existing.slug;
  if (payload.name && payload.name.toLowerCase() !== existing.name.toLowerCase()) {
    slug = await resolveUniqueSlug(toSlug(payload.name), id);
  }

  // Upload new images in parallel — only for fields that have a new file
  const uploadedPublicIds: string[] = [];
  const oldPublicIds: string[] = [];

  const [logoResult, coverResult] = await Promise.all([
    files?.logo
      ? uploadToCloudinary(
        files.logo.buffer,
        `trust-pass/businesses/${ownerId}/logo`,
        `logo_${slug}`,
      ).then((r) => {
        uploadedPublicIds.push(r.publicId);
        return r;
      })
      : Promise.resolve(null),

    files?.cover
      ? uploadToCloudinary(
        files.cover.buffer,
        `trust-pass/businesses/${ownerId}/cover`,
        `cover_${slug}`,
      ).then((r) => {
        uploadedPublicIds.push(r.publicId);
        return r;
      })
      : Promise.resolve(null),
  ]);

  // Resolve final URLs
  const logoUrl = logoResult?.url ?? payload.logoUrl;
  const coverUrl = coverResult?.url ?? payload.coverUrl;

  // Track old Cloudinary assets to delete after successful update
  if (logoResult && existing.logoUrl) oldPublicIds.push(extractPublicId(existing.logoUrl));
  if (coverResult && existing.coverUrl) oldPublicIds.push(extractPublicId(existing.coverUrl));

  try {
    const updated = await prisma.business.update({
      where: { id },
      data: {
        ...(payload.name ? { name: payload.name.trim(), slug } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(logoUrl !== undefined ? { logoUrl } : {}),
        ...(coverUrl !== undefined ? { coverUrl } : {}),
        ...(payload.categoryId !== undefined ? { categoryId: payload.categoryId } : {}),
        ...(payload.businessType !== undefined ? { businessType: payload.businessType } : {}),
        ...(payload.websiteUrl !== undefined ? { websiteUrl: payload.websiteUrl } : {}),
        ...(payload.instaUrl !== undefined ? { instaUrl: payload.instaUrl } : {}),
        ...(payload.tiktokUrl !== undefined ? { tiktokUrl: payload.tiktokUrl } : {}),
        ...(payload.contactEmail !== undefined ? { contactEmail: payload.contactEmail } : {}),
        ...(payload.contactPhone !== undefined ? { contactPhone: payload.contactPhone } : {}),
      },
      select: BUSINESS_SELECT,
    });

    // Delete old images from Cloudinary only after DB succeeds
    if (oldPublicIds.length > 0) {
      await Promise.allSettled(oldPublicIds.map(deleteFromCloudinary));
    }

    return updated;
  } catch (err) {
    // DB failed — roll back newly uploaded assets
    await Promise.allSettled(uploadedPublicIds.map(deleteFromCloudinary));
    throw err;
  }
};

// ---------------------------------------------------------------------------
// Delete business  (SELLER — own only | ADMIN — any)
// ---------------------------------------------------------------------------

const deleteBusiness = async (
  id: string,
  requesterId: string,
  requesterRole: string,
) => {
  const existing = await prisma.business.findUnique({
    where: { id },
    select: { id: true, ownerId: true, logoUrl: true, coverUrl: true, addressId: true },
  });

  if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Business not found.");

  const isOwner = existing.ownerId === requesterId;
  const isAdmin = requesterRole === "ADMIN";

  if (!isOwner && !isAdmin) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You do not have permission to delete this business.",
    );
  }

  await prisma.business.delete({ where: { id } });

  if (existing.addressId) {
    await prisma.address.delete({ where: { id: existing.addressId } }).catch(() => { });
  }

  // Clean up Cloudinary assets after DB delete succeeds
  const toDelete = [existing.logoUrl, existing.coverUrl].filter(Boolean) as string[];
  if (toDelete.length > 0) {
    await Promise.allSettled(toDelete.map((url) => deleteFromCloudinary(extractPublicId(url))));
  }

  return null;
};

// ---------------------------------------------------------------------------
// Update address  (SELLER — own only)
// ---------------------------------------------------------------------------

const updateBusinessAddress = async (
  id: string,
  ownerId: string,
  payload: IAddressPayload,
) => {
  const existing = await prisma.business.findUnique({
    where: { id },
    select: { id: true, ownerId: true, addressId: true },
  });

  if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Business not found.");

  if (existing.ownerId !== ownerId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You do not have permission to update this business.",
    );
  }

  const addressData = {
    addressLine: payload.addressLine,
    city: payload.city,
    district: payload.district,
    division: payload.division,
    postalCode: payload.postalCode,
    country: payload.country ?? "BANGLADESH",
  };

  if (existing.addressId) {
    return prisma.address.update({
      where: { id: existing.addressId },
      data: addressData,
    });
  }

  const address = await prisma.address.create({ data: addressData });
  await prisma.business.update({ where: { id }, data: { addressId: address.id } });
  return address;
};

// ---------------------------------------------------------------------------
// Internal helper — extract Cloudinary public_id from a secure URL
// e.g. "https://res.cloudinary.com/demo/image/upload/v123/trust-pass/businesses/x/logo_slug.jpg"
//   => "trust-pass/businesses/x/logo_slug"
// ---------------------------------------------------------------------------

const extractPublicId = (url: string): string => {
  try {
    const parts = url.split("/upload/");
    if (parts.length < 2) return url;
    // Strip version segment (v<digits>/) if present, then strip extension
    return parts[1].replace(/^v\d+\//, "").replace(/\.[^/.]+$/, "");
  } catch {
    return url;
  }
};

// ---------------------------------------------------------------------------

export const BusinessService = {
  listBusinesses,
  getBusinessById,
  getBusinessBySlug,
  getMyBusinesses,
  createBusiness,
  updateBusiness,
  deleteBusiness,
  updateBusinessAddress,
};
