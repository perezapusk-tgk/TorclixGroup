export type UsageMetric="projects"|"members"|"storage_gb"|"monthly_visitors"|"leads";
export const PLAN_LIMITS={starter:{projects:5,members:2,storage_gb:5,monthly_visitors:10000,leads:500},pro:{projects:50,members:10,storage_gb:100,monthly_visitors:100000,leads:10000},scale:{projects:250,members:50,storage_gb:500,monthly_visitors:1000000,leads:100000}} as const;
export function usagePercent(value:number,limit:number){return limit<=0?0:Math.min(100,Math.round(value/limit*100));}
