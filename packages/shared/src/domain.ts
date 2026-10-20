export type ProjectType = "website" | "mini_app" | "website_mini_app";

export type ProjectStatus = "draft" | "active" | "archived";

export type Industry =
  | "restaurant"
  | "beauty"
  | "fitness"
  | "medical"
  | "real_estate"
  | "services";

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  type: ProjectType;
  industry: Industry;
  status: ProjectStatus;
  createdAt: string;
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
