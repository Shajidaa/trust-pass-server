import httpStatus from "http-status";
import AppError from "../../../errors/AppError";
import { prisma } from "../../../libs/prisma";
import {
    IAddressPayload,
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

/** Public-safe business projection */
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

/** Ensure the slug is globally unique — appends a suffix when it collides */
const resolveUniqueSlug = async (base: string, excludeId?: string): Promise<string> => {
    let slug = base;
    let attempt = 0;

    while (true) {
        const conflict = await prisma.business.findFirst({
            where: {
                slug,
                ...(excludeId ? { NOT: { id: excludeId } } : {}),
            },
            select: { id: true },
        });

        if (!conflict) return slug;
        attempt++;
        slug = `${base}-${attempt}`;
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
    if (filters.verificationStatus) where.verificationStatus = filters.verificationStatus;

    const [businesses, total] = await Promise.all([
        prisma.business.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, select: BUSINESS_SELECT }),
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
// List own businesses  (BUYER)
// ---------------------------------------------------------------------------

const getMyBusinesses = async (ownerId: string) => {
    const businesses = await prisma.business.findMany({
        where: { ownerId },
        orderBy: { createdAt: "desc" },
        select: BUSINESS_SELECT,
    });

    return businesses;
};

// ---------------------------------------------------------------------------
// Create business  (BUYER)
// ---------------------------------------------------------------------------

const createBusiness = async (ownerId: string, payload: ICreateBusinessPayload) => {
    const baseSlug = toSlug(payload.name);
    const slug = await resolveUniqueSlug(baseSlug);

    // Upsert address if provided, otherwise skip
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

    const business = await prisma.business.create({
        data: {
            ownerId,
            name: payload.name.trim(),
            slug,
            description: payload.description,
            logoUrl: payload.logoUrl,
            coverUrl: payload.coverUrl,
            categoryId: payload.categoryId,
            businessType: payload.businessType ?? "INDIVIDUAL",
            websiteUrl: payload.websiteUrl,
            instaUrl: payload.instaUrl,
            tiktokUrl: payload.tiktokUrl,
            contactEmail: payload.contactEmail,
            contactPhone: payload.contactPhone,
            addressId,
        },
        select: BUSINESS_SELECT,
    });

    return business;
};

// ---------------------------------------------------------------------------
// Update business  (BUYER — own only)
// ---------------------------------------------------------------------------

const updateBusiness = async (id: string, ownerId: string, payload: IUpdateBusinessPayload) => {
    const existing = await prisma.business.findUnique({ where: { id }, select: { id: true, ownerId: true, name: true, slug: true } });

    if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Business not found.");

    // Ownership check — ADMIN bypass is handled at route level with role middleware
    if (existing.ownerId !== ownerId) {
        throw new AppError(httpStatus.FORBIDDEN, "You do not have permission to update this business.");
    }

    let slug = existing.slug;
    if (payload.name && payload.name.toLowerCase() !== existing.name.toLowerCase()) {
        slug = await resolveUniqueSlug(toSlug(payload.name), id);
    }

    const updated = await prisma.business.update({
        where: { id },
        data: {
            ...(payload.name ? { name: payload.name.trim(), slug } : {}),
            ...(payload.description !== undefined ? { description: payload.description } : {}),
            ...(payload.logoUrl !== undefined ? { logoUrl: payload.logoUrl } : {}),
            ...(payload.coverUrl !== undefined ? { coverUrl: payload.coverUrl } : {}),
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

    return updated;
};

// ---------------------------------------------------------------------------
// Delete business  (BUYER — own only | ADMIN — any)
// ---------------------------------------------------------------------------

const deleteBusiness = async (id: string, requesterId: string, requesterRole: string) => {
    const existing = await prisma.business.findUnique({ where: { id }, select: { id: true, ownerId: true } });

    if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Business not found.");

    const isOwner = existing.ownerId === requesterId;
    const isAdmin = requesterRole === "ADMIN";

    if (!isOwner && !isAdmin) {
        throw new AppError(httpStatus.FORBIDDEN, "You do not have permission to delete this business.");
    }

    // Delete linked address (cascade-safe — address has no other relations)
    const biz = await prisma.business.findUnique({ where: { id }, select: { addressId: true } });

    await prisma.business.delete({ where: { id } });

    if (biz?.addressId) {
        await prisma.address.delete({ where: { id: biz.addressId } }).catch(() => { });
    }

    return null;
};

// ---------------------------------------------------------------------------
// Update address  (BUYER — own only)
// ---------------------------------------------------------------------------

const updateBusinessAddress = async (id: string, ownerId: string, payload: IAddressPayload) => {
    const existing = await prisma.business.findUnique({
        where: { id },
        select: { id: true, ownerId: true, addressId: true },
    });

    if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Business not found.");

    if (existing.ownerId !== ownerId) {
        throw new AppError(httpStatus.FORBIDDEN, "You do not have permission to update this business.");
    }

    const addressData = {
        addressLine: payload.addressLine,
        city: payload.city,
        district: payload.district,
        division: payload.division,
        postalCode: payload.postalCode,
        country: payload.country ?? "BANGLADESH",
    };

    let address;

    if (existing.addressId) {
        // Update existing address row
        address = await prisma.address.update({
            where: { id: existing.addressId },
            data: addressData,
        });
    } else {
        // Create new address and link it
        address = await prisma.address.create({ data: addressData });
        await prisma.business.update({
            where: { id },
            data: { addressId: address.id },
        });
    }

    return address;
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
