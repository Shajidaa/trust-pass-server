export interface IUpdateUserPayload {
    name?: string;
    phone?: string;
    gender?: "MALE" | "FEMALE" | "OTHER";
}

export interface IUpdateProfilePayload {
    links?: string[];
}

export interface IUpdateRolePayload {
    role: "CUSTOMER" | "BUYER" | "MODERATOR" | "ADMIN";
}
