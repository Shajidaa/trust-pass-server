import httpStatus from "http-status";
import AppError from "../../../errors/AppError";
import { uploadToCloudinary } from "../../../libs/cloudinary";
import { prisma } from "../../../libs/prisma";
import {
  IUpdateProfilePayload,
  IUpdateRolePayload,
  IUpdateStatusPayload,
  IUpdateUserPayload,
} from "./user.interface";

// ---------------------------------------------------------------------------
// Shared safe user projection
// ---------------------------------------------------------------------------

const SAFE_USER = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  image: true,
  role: true,
  status: true,
  gender: true,
  phone: true,
  provider: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ---------------------------------------------------------------------------
// GET /users/me
// ---------------------------------------------------------------------------

const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: SAFE_USER,
  });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found.");
  return user;
};

// ---------------------------------------------------------------------------
// PATCH /users/me
// ---------------------------------------------------------------------------

const updateMe = async (userId: string, payload: IUpdateUserPayload) => {
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
      ...(payload.gender !== undefined ? { gender: payload.gender } : {}),
    },
    select: SAFE_USER,
  });
};

// ---------------------------------------------------------------------------
// GET /profile/me
// ---------------------------------------------------------------------------

const getMyProfile = async (userId: string) => {
  const profile = await prisma.profile.findFirst({
    where: { user_id: userId },
  });

  // Auto-create on first fetch so the caller always gets a record
  if (!profile) {
    return prisma.profile.create({
      data: { user_id: userId },
    });
  }

  return profile;
};

// ---------------------------------------------------------------------------
// PATCH /profile/me
// ---------------------------------------------------------------------------

const updateMyProfile = async (
  userId: string,
  payload: IUpdateProfilePayload,
) => {
  const existing = await prisma.profile.findFirst({
    where: { user_id: userId },
  });

  if (!existing) {
    return prisma.profile.create({
      data: {
        user_id: userId,
        links: payload.links ?? [],
      },
    });
  }

  return prisma.profile.update({
    where: { id: existing.id },
    data: {
      ...(payload.links !== undefined ? { links: payload.links } : {}),
    },
  });
};

// ---------------------------------------------------------------------------
// POST /profile/me/photo
// ---------------------------------------------------------------------------

const uploadProfilePhoto = async (
  userId: string,
  file: Express.Multer.File,
) => {
  const { url } = await uploadToCloudinary(
    file.buffer,
    `trust-pass/users/${userId}/profile`,
    `avatar_${userId}`,
  );

  const [user, profile] = await Promise.all([
    prisma.user.update({
      where: { id: userId },
      data: { image: url },
      select: { id: true, image: true },
    }),
    prisma.profile.upsert({
      where: {
        id:
          (
            await prisma.profile.findFirst({
              where: { user_id: userId },
              select: { id: true },
            })
          )?.id ?? "",
      },
      create: { user_id: userId, profile_photo: url },
      update: { profile_photo: url },
    }),
  ]).catch(async () => {
    // Fallback: upsert profile separately if id lookup failed
    const prof = await prisma.profile.findFirst({ where: { user_id: userId } });
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { image: url },
      select: { id: true, image: true },
    });
    if (prof) {
      await prisma.profile.update({
        where: { id: prof.id },
        data: { profile_photo: url },
      });
    } else {
      await prisma.profile.create({
        data: { user_id: userId, profile_photo: url },
      });
    }
    return [updatedUser, null];
  });

  return { photoUrl: url };
};

// ---------------------------------------------------------------------------
// ADMIN — List all users
// ---------------------------------------------------------------------------

const listUsers = async (
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
        ...SAFE_USER,
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
// ADMIN — Get user by ID
// ---------------------------------------------------------------------------

const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      ...SAFE_USER,
      businesses: {
        select: { id: true, name: true, slug: true, verificationStatus: true },
        take: 5,
      },
      _count: { select: { businesses: true, reports: true } },
    },
  });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found.");
  return user;
};

// ---------------------------------------------------------------------------
// ADMIN — Update user role
// ---------------------------------------------------------------------------

const updateUserRole = async (id: string, payload: IUpdateRolePayload) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found.");

  return prisma.user.update({
    where: { id },
    data: { role: payload.role },
    select: SAFE_USER,
  });
};

// ---------------------------------------------------------------------------
// ADMIN — Delete user
// ---------------------------------------------------------------------------

const deleteUser = async (id: string, requesterId: string) => {
  if (id === requesterId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You cannot delete your own account.",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found.");

  await prisma.user.delete({ where: { id } });
  return null;
};

// ---------------------------------------------------------------------------
// ADMIN — Ban / Unban user
// ---------------------------------------------------------------------------

const updateUserStatus = async (
  targetId: string,
  requesterId: string,
  payload: IUpdateStatusPayload,
) => {
  // Guard: admin cannot act on their own account via this endpoint
  if (targetId === requesterId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You cannot change your own account status.",
    );
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true, status: true, email: true, name: true },
  });

  if (!target) throw new AppError(httpStatus.NOT_FOUND, "User not found.");

  // Guard: protect ADMIN accounts from being banned by other admins
  if (target.role === "ADMIN") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Admin accounts cannot be banned.",
    );
  }

  // Guard: no-op prevention — avoid redundant updates
  if (target.status === payload.status) {
    const label = payload.status === "BLOCKED" ? "already banned" : "already active";
    throw new AppError(httpStatus.CONFLICT, `User is ${label}.`);
  }

  // Persist the status change
  const updated = await prisma.user.update({
    where: { id: targetId },
    data: { status: payload.status },
    select: SAFE_USER,
  });

  // On ban: revoke all active sessions immediately so the user is
  // logged out across all devices without waiting for token expiry.
  if (payload.status === "BLOCKED") {
    await prisma.session.deleteMany({ where: { userId: targetId } });
  }

  return updated;
};

// ---------------------------------------------------------------------------

export const UserService = {
  getMe,
  updateMe,
  getMyProfile,
  updateMyProfile,
  uploadProfilePhoto,
  listUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  deleteUser,
};
