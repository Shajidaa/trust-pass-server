import httpStatus from "http-status";
import AppError from "../../../errors/AppError";
import { prisma } from "../../../libs/prisma";
import {
  ICategoryFilters,
  ICreateCategoryPayload,
  IUpdateCategoryPayload,
} from "./category.interface";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Converts a name like "Hot Deals" → "hot-deals" */
const toSlug = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");

const serializeCategory = (cat: any) => ({
  ...cat,
  id: cat.id.toString(), // BigInt → string for JSON safety
});

// ---------------------------------------------------------------------------
// List categories  (public, paginated, filterable)
// ---------------------------------------------------------------------------

const listCategories = async (filters: ICategoryFilters) => {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 10));
  const skip = (page - 1) * limit;

  const where: any = {};

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { slug: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  // Public consumers only see active categories unless explicitly filtered
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  const [categories, total] = await Promise.all([
    prisma.category.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
    }),
    prisma.category.count({ where }),
  ]);
  if (categories.length === 0) {
    throw new Error("No categories have been added yet.");
  }
  return {
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
    data: categories.map(serializeCategory),
  };
};

// ---------------------------------------------------------------------------
// Get single category
// ---------------------------------------------------------------------------

const getCategoryById = async (id: string) => {
  const category = await prisma.category.findUnique({
    where: { id: id },
  });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found.");
  }

  return serializeCategory(category);
};

// ---------------------------------------------------------------------------
// Create category  (ADMIN)
// ---------------------------------------------------------------------------

const createCategory = async (payload: ICreateCategoryPayload) => {
  const slug = toSlug(payload.name);

  // Enforce unique name and slug
  const existing = await prisma.category.findFirst({
    where: {
      OR: [{ name: { equals: payload.name, mode: "insensitive" } }, { slug }],
    },
  });

  if (existing) {
    throw new AppError(
      httpStatus.CONFLICT,
      `A category with this name already exists.`,
    );
  }

  const category = await prisma.category.create({
    data: {
      name: payload.name.trim(),
      slug,
      iconUrl: payload.iconUrl ?? null,
      isActive: payload.isActive ?? true,
    },
  });

  return serializeCategory(category);
};

// ---------------------------------------------------------------------------
// Update category  (ADMIN)
// ---------------------------------------------------------------------------

const updateCategory = async (id: string, payload: IUpdateCategoryPayload) => {
  const existing = await prisma.category.findUnique({
    where: { id: id },
  });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found.");
  }

  // If name is being changed, check it won't collide
  if (
    payload.name &&
    payload.name.toLowerCase() !== existing.name.toLowerCase()
  ) {
    const newSlug = toSlug(payload.name);

    const conflict = await prisma.category.findFirst({
      where: {
        AND: [
          { id: id },
          {
            OR: [
              { name: { equals: payload.name, mode: "insensitive" } },
              { slug: newSlug },
            ],
          },
        ],
      },
    });

    if (conflict) {
      throw new AppError(
        httpStatus.CONFLICT,
        "A category with this name already exists.",
      );
    }
  }

  const updated = await prisma.category.update({
    where: { id: id },
    data: {
      ...(payload.name
        ? { name: payload.name.trim(), slug: toSlug(payload.name) }
        : {}),
      ...(payload.iconUrl !== undefined ? { iconUrl: payload.iconUrl } : {}),
      ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
    },
  });

  return serializeCategory(updated);
};

// ---------------------------------------------------------------------------
// Delete category  (ADMIN)
// ---------------------------------------------------------------------------

const deleteCategory = async (id: string) => {
  const existing = await prisma.category.findUnique({
    where: { id: id },
  });

  if (!existing) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found.");
  }

  await prisma.category.delete({
    where: {
      id: id,
    },
  });
};

// ---------------------------------------------------------------------------

export const CategoryService = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
