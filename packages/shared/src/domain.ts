export type ProjectType = "website" | "mini_app" | "website_mini_app";
export type ProjectStatus = "draft" | "active" | "archived";

export type Industry =
  | "restaurant"
  | "beauty"
  | "fitness"
  | "medical"
  | "real_estate"
  | "services";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: "starter" | "pro" | "scale" | string;
  createdAt: string;
}

export interface Membership {
  organizationId: string;
  userId: string;
  role: "owner" | "admin" | "editor" | "viewer" | string;
}

export interface Project {
  id: string;
  organizationId: string;
  clientId?: string;
  name: string;
  type: ProjectType;
  industry: Industry;
  status: ProjectStatus;
  createdAt: string;
  updatedAt?: string;
}

export type BlockType =
  | "Hero" | "Features" | "Gallery" | "Pricing" | "Testimonials"
  | "FAQ" | "Booking" | "Contact" | "CTA" | "Story";

export interface SiteBlock {
  id: string;
  type: BlockType;
  title: string;
  body: string;
}

export interface SitePage {
  id: string;
  name: string;
  blocks: SiteBlock[];
}

export interface SiteDocument {
  projectId: string;
  activePage: string;
  accent: string;
  pages: SitePage[];
}

export interface Client {
  id: string;
  organizationId: string;
  name: string;
  email?: string;
  projectIds: string[];
}

export interface Lead {
  id: string;
  organizationId: string;
  projectId: string;
  name: string;
  email?: string;
  phone?: string;
  source: string;
  status: "new" | "contacted" | "qualified" | "won" | "lost" | string;
  createdAt: string;
}

export interface Booking {
  id: string;
  organizationId: string;
  projectId: string;
  customerName: string;
  customerEmail?: string;
  service?: string;
  startAt: string;
  status: "pending" | "confirmed" | "cancelled" | string;
  createdAt: string;
}

export interface Domain {
  id: string;
  organizationId: string;
  projectId?: string;
  hostname: string;
  status: "pending" | "connected" | "error" | string;
  sslStatus: "pending" | "active" | "error" | string;
}
