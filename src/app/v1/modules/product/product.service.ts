import httpStatus from "http-status";
import AppError from "../../../errors/AppError";
import { deleteFromCloudinary, uploadToCloudinary } from "../../../libs/cloudinary";
import { prisma } from "../../../libs/prisma";
import {
  ICreateProductPayload,
  IProductFilters,
  IProductImage,
  IUpdateProductPayload,
} from "./product.interface";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const toSlug = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

const serialize = (p: any) => ({ ...p, price: Number(p.price) });

const PRODUCT_SELECT = {
  id: true,
  businessId: true,
  categoryId: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  currency: true,
  stock: true,
  images: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

const resolveUniqueSlug = async (
  base: string,
  excludeId?: string,
): Promise<string> => {
  let slug = base;
  let attempt = 0;
  while (true) {
    const conflict = await prisma.product.findFirst({
      where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (!conflict) return slug;
    slug = `${base}-${++attempt}`;
  }
};

const assertBusinessOwnership = async (businessId: string, ownerId: string) => {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, ownerId: true },
  });

  if (!business)
    throw new AppError(httpStatus.NOT_FOUND, "Business not found.");

  if (business.ownerId !== ownerId) {
    throw new AppError(httpStatus.FORBIDDEN, "You do not own this business.");
  }
};

// ---------------------------------------------------------------------------
// List products  (public — only ACTIVE by default)
// ---------------------------------------------------------------------------

const listProducts = async (filters: IProductFilters) => {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 10));
  const skip = (page - 1) * limit;

  const where: any = {
    // Exclude soft-deleted products. Callers can narrow by ?status=ACTIVE etc.
    status: filters.status
      ? filters.status
      : { not: "DELETED" },
  };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.currency) where.currency = filters.currency;

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {
      ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
    };
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: PRODUCT_SELECT,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
    data: products.map(serialize),
  };
};

// ---------------------------------------------------------------------------
// List products for a specific business  (public — ACTIVE only)
// ---------------------------------------------------------------------------

const listBusinessProducts = async (
  businessId: string,
  filters: IProductFilters,
) => {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true },
  });
  if (!business)
    throw new AppError(httpStatus.NOT_FOUND, "Business not found.");

  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 10));
  const skip = (page - 1) * limit;

  const where: any = {
    businessId,
    // Exclude soft-deleted products. Callers can narrow by ?status=ACTIVE etc.
    status: filters.status
      ? filters.status
      : { not: "DELETED" },
  };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.currency) where.currency = filters.currency;

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {
      ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
    };
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: PRODUCT_SELECT,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
    data: products.map(serialize),
  };
};

// ---------------------------------------------------------------------------
// Get by ID
// ---------------------------------------------------------------------------

const getProductById = async (id: string) => {
  const product = await prisma.product.findUnique({
    where: { id },
    select: PRODUCT_SELECT,
  });
  if (!product) throw new AppError(httpStatus.NOT_FOUND, "Product not found.");
  return serialize(product);
};

// ---------------------------------------------------------------------------
// Get by slug
// ---------------------------------------------------------------------------

const getProductBySlug = async (slug: string) => {
  const product = await prisma.product.findUnique({
    where: { slug },
    select: PRODUCT_SELECT,
  });
  if (!product) throw new AppError(httpStatus.NOT_FOUND, "Product not found.");
  return serialize(product);
};

// ---------------------------------------------------------------------------
// Create  (SELLER — must own the business)
// ---------------------------------------------------------------------------

const createProduct = async (
  ownerId: string,
  payload: ICreateProductPayload,
  imageFiles: Express.Multer.File[],
) => {
  await assertBusinessOwnership(payload.businessId, ownerId);

  const slug = await resolveUniqueSlug(toSlug(payload.name));

  // Upload all images to Cloudinary in parallel
  const uploadedImages: IProductImage[] = await Promise.all(
    imageFiles.map((file) =>
      uploadToCloudinary(file.buffer, `products/${payload.businessId}`),
    ),
  );

  const product = await prisma.product.create({
    data: {
      businessId: payload.businessId,
      categoryId: payload.categoryId,
      name: payload.name.trim(),
      slug,
      description: payload.description,
      price: payload.price,
      currency: payload.currency ?? "BDT",
      stock: payload.stock,
      images: uploadedImages as any,  // IProductImage[] — cast required for Prisma Json field
      status: payload.status ?? "ACTIVE",
    },
    select: PRODUCT_SELECT,
  });

  return serialize(product);
};

// ---------------------------------------------------------------------------
// Update  (SELLER — must own the business the product belongs to)
// ---------------------------------------------------------------------------

const updateProduct = async (
  id: string,
  ownerId: string,
  payload: IUpdateProductPayload,
  imageFiles: Express.Multer.File[],
) => {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      businessId: true,
      name: true,
      slug: true,
      status: true,
      images: true,
    },
  });

  if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Product not found.");

  // Soft-deleted products cannot be edited
  if (existing.status === "DELETED") {
    throw new AppError(
      httpStatus.GONE,
      "This product has been deleted and cannot be updated.",
    );
  }

  await assertBusinessOwnership(existing.businessId, ownerId);

  // Resolve which existing images to keep
  const currentImages = (existing.images as unknown as IProductImage[]) ?? [];
  const retainSet = new Set(payload.retainImagePublicIds ?? currentImages.map((i) => i.publicId));

  const imagesToKeep = currentImages.filter((i) => retainSet.has(i.publicId));
  const imagesToDelete = currentImages.filter((i) => !retainSet.has(i.publicId));

  // Upload new images (if any)
  const newlyUploaded: IProductImage[] = await Promise.all(
    imageFiles.map((file) =>
      uploadToCloudinary(file.buffer, `products/${existing.businessId}`),
    ),
  );

  const finalImages = [...imagesToKeep, ...newlyUploaded];

  if (finalImages.length > 10) {
    throw new AppError(httpStatus.BAD_REQUEST, "A product can have at most 10 images.");
  }

  let slug = existing.slug;
  if (payload.name && payload.name.toLowerCase() !== existing.name.toLowerCase()) {
    slug = await resolveUniqueSlug(toSlug(payload.name), id);
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(payload.name ? { name: payload.name.trim(), slug } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.categoryId !== undefined ? { categoryId: payload.categoryId } : {}),
      ...(payload.price !== undefined ? { price: payload.price } : {}),
      ...(payload.currency !== undefined ? { currency: payload.currency } : {}),
      ...(payload.stock !== undefined ? { stock: payload.stock } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      images: finalImages as any,  // IProductImage[] — cast required for Prisma Json field
    },
    select: PRODUCT_SELECT,
  });

  // Clean up removed images from Cloudinary after DB commit (non-blocking)
  if (imagesToDelete.length > 0) {
    Promise.all(imagesToDelete.map((i) => deleteFromCloudinary(i.publicId))).catch(
      (err) => console.error("[Cloudinary] Failed to delete removed product images:", err),
    );
  }

  return serialize(updated);
};

// ---------------------------------------------------------------------------
// Delete  (SELLER — own product | ADMIN — any)

// ---------------------------------------------------------------------------

const deleteProduct = async (
  id: string,
  requesterId: string,
  requesterRole: string,
) => {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true, businessId: true, status: true, images: true },
  });

  if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Product not found.");

  if (existing.status === "DELETED") {
    throw new AppError(httpStatus.GONE, "Product is already deleted.");
  }

  if (requesterRole !== "ADMIN") {
    await assertBusinessOwnership(existing.businessId, requesterId);
  }

  await prisma.product.update({
    where: { id },
    data: { status: "DELETED" },
  });

  // Fire-and-forget: remove all product images from Cloudinary
  const images = (existing.images as unknown as IProductImage[]) ?? [];
  if (images.length > 0) {
    Promise.all(images.map((i) => deleteFromCloudinary(i.publicId))).catch(
      (err) => console.error("[Cloudinary] Failed to delete product images on delete:", err),
    );
  }

  return null;
};

// ---------------------------------------------------------------------------

export const ProductService = {
  listProducts,
  listBusinessProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
};
