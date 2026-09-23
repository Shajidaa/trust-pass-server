export type TVerificationStatus = "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";
export type TBusinessType = "INDIVIDUAL" | "COMPANY" | "NGO" | "GOVERNMENT" | "OTHER";
export type TDivision = "DHAKA" | "CHITTAGONG" | "RAJSHAHI" | "KHULNA" | "BARISAL" | "SYLHET" | "RANGPUR" | "MYMENSINGH";
export type TCountry = "BANGLADESH" | "INDIA" | "USA" | "UK" | "OTHER";

export interface IAddressPayload {
    addressLine: string;
    city: string;
    district: string;
    division: TDivision;
    postalCode: string;
    country?: TCountry;
}

export interface ICreateBusinessPayload {
    name: string;
    description?: string;
    logoUrl?: string;
    coverUrl?: string;
    categoryId?: string;
    businessType?: TBusinessType;
    websiteUrl?: string;
    instaUrl?: string;
    tiktokUrl?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: IAddressPayload;
}

export interface IUpdateBusinessPayload {
    name?: string;
    description?: string;
    logoUrl?: string;
    coverUrl?: string;
    categoryId?: string;
    businessType?: TBusinessType;
    websiteUrl?: string;
    instaUrl?: string;
    tiktokUrl?: string;
    contactEmail?: string;
    contactPhone?: string;
}

export interface IBusinessFilters {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    businessType?: TBusinessType;
    verificationStatus?: TVerificationStatus;
}
