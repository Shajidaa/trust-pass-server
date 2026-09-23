export interface ICreateCategoryPayload {
    name: string;
    iconUrl?: string;
    isActive?: boolean;
}

export interface IUpdateCategoryPayload {
    name?: string;
    iconUrl?: string;
    isActive?: boolean;
}

export interface ICategoryFilters {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
}
