export type TTrustRuleStatus = "VERIFICATION" | "ACTIVITY" | "REPORT";

export interface ICreateTrustRulePayload {
    ruleKey: string;
    label: string;
    points: number;
    isActive?: boolean;
    status: TTrustRuleStatus;
}

export interface IUpdateTrustRulePayload {
    label?: string;
    points?: number;
    isActive?: boolean;
    status?: TTrustRuleStatus;
}

export interface ITrustRuleFilters {
    isActive?: boolean;
    status?: TTrustRuleStatus;
}
