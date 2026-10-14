export interface IUpdateUserPayload {
  name?: string;
  phone?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
}

export interface IUpdateProfilePayload {
  links?: string[];
}

export interface IUpdateRolePayload {
  role: "CUSTOMER" | "SELLER" | "MODERATOR" | "ADMIN";
}

export interface IUpdateStatusPayload {
  status: "ACTIVE" | "BLOCKED";
  reason?: string;
}
