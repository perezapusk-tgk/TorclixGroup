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
