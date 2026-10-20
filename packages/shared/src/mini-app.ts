export type MiniAppModule = {
  id: string;
  label: string;
  description: string;
  industries: string[];
};

export const MINI_APP_MODULES: MiniAppModule[] = [
  { id: "home", label: "Home", description: "Personalized start screen and shortcuts.", industries: ["all"] },
  { id: "catalog", label: "Catalog", description: "Products, services, categories and detail pages.", industries: ["restaurant","beauty","services","real_estate"] },
  { id: "booking", label: "Booking", description: "Availability, appointment slots and confirmations.", industries: ["restaurant","beauty","fitness","medical","services"] },
  { id: "calendar", label: "Calendar", description: "Schedules, staff availability and upcoming visits.", industries: ["beauty","fitness","medical","services"] },
  { id: "cart", label: "Cart & Order", description: "Cart, checkout and order status.", industries: ["restaurant","services"] },
  { id: "membership", label: "Membership", description: "Plans, passes, subscriptions and renewal state.", industries: ["fitness","beauty"] },
  { id: "loyalty", label: "Loyalty", description: "Points, rewards and customer tiers.", industries: ["restaurant","beauty","fitness","services"] },
  { id: "profile", label: "Profile", description: "Customer account, preferences and history.", industries: ["all"] },
  { id: "notifications", label: "Notifications", description: "Transactional and marketing notifications.", industries: ["all"] },
  { id: "telegram", label: "Telegram", description: "Telegram Mini App bridge and bot actions.", industries: ["all"] }
];

export function modulesForIndustry(industry: string) {
  return MINI_APP_MODULES.filter(module => module.industries.includes("all") || module.industries.includes(industry));
}
