export type TProductStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "DELETED";
export type TCurrency = "BDT" | "USD" | "INR" | "GBP" | "EUR";

/**
 * Stored in the `images` JSON column so we can delete from Cloudinary later.
 */
export interface IProductImage {
    url: string;
    publicId: string;
}

export interface ICreateProductPayload {
    businessId: string;
    categoryId?: string;
    name: string;
    description?: string;
    price: number;
    currency?: TCurrency;
    stock?: number;
    images?: IProductImage[];
    status?: TProductStatus;
}

export interface IUpdateProductPayload {
    categoryId?: string;
    name?: string;
    description?: string;
    price?: number;
    currency?: TCurrency;
    stock?: number;
    /** Pass only the images that should remain (publicIds to keep). New files are handled via multer. */
    retainImagePublicIds?: string[];
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
