export type TGender = "MALE" | "FEMALE" | "OTHER";
export type TRole = "CUSTOMER" | "BUYER" | "MODERATOR" | "ADMIN";
export type TUserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BLOCKED" | "DELETED";
export type TAuthProvider = "GOOGLE" | "CREDENTIAL";

export interface IRegisterUserPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  gender?: TGender;
  role?: TRole;
  image?: string;
}

export interface ILoginUserPayload {
  email: string;
  password: string;
}

export interface IVerifyEmailPayload {
  token: string;
}

export interface IResendVerificationPayload {
  email: string;
}

export interface IChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  revokeOtherSessions?: boolean;
}
