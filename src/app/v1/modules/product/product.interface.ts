export type TProductStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "DELETED";
export type TCurrency = "BDT" | "USD" | "INR" | "GBP" | "EUR";

export interface ICreateProductPayload {
    businessId: string;
    categoryId?: string;
    name: string;
    description?: string;
    price: number;
    currency?: TCurrency;
    stock?: number;
    images?: string[];
    status?: TProductStatus;
}

export interface IUpdateProductPayload {
    categoryId?: string;
    name?: string;
    description?: string;
    price?: number;
    currency?: TCurrency;
    stock?: number;
    images?: string[];
    status?: TProductStatus;
}

export interface IProductFilters {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    currency?: TCurrency;
    status?: TProductStatus;
    minPrice?: number;
    maxPrice?: number;
}
