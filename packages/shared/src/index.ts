export type ProjectType = "website" | "mini_app" | "website_mini_app";
export type Industry = "restaurant" | "beauty" | "fitness" | "medical" | "real_estate" | "services";
export type MiniAppModule = "home" | "catalog" | "booking" | "orders" | "profile" | "loyalty" | "notifications";

export interface ProjectConfig {
  type: ProjectType;
  industry: Industry;
  miniAppModules?: MiniAppModule[];
}

export interface TemplateDefinition {
  id: string;
  name: string;
  industry: Industry;
  projectType: ProjectType;
  description: string;
  modules: string[];
  pages: string[];
}
