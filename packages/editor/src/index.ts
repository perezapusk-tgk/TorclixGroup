export type EditorBlockType =
  | "Hero" | "Features" | "Gallery" | "Pricing" | "Testimonials"
  | "FAQ" | "Booking" | "Contact" | "CTA" | "Story";

export interface EditorBlock {
  id: string;
  type: EditorBlockType;
  title: string;
  body: string;
  settings?: Record<string, unknown>;
}

export interface EditorPage {
  id: string;
  name: string;
  blocks: EditorBlock[];
}

export interface SiteDocument {
  projectId: string;
  version: number;
  activePage: string;
  accent: string;
  pages: EditorPage[];
  settings?: {
    seoTitle?: string;
    seoDescription?: string;
    font?: string;
    customCss?: string;
  };
}

export function createDocument(projectId: string): SiteDocument {
  return {
    projectId,
    version: 1,
    activePage: "home",
    accent: "#d8ff3e",
    pages: [{
      id: "home",
      name: "Главная",
      blocks: [{
        id: "hero",
        type: "Hero",
        title: "Ваш бизнес — в одном цифровом пространстве",
        body: "Сайт, заявки, записи и Telegram Mini App управляются из одной студии TorclixGroup."
      }]
    }]
  };
}

export function nextVersion(document: SiteDocument): SiteDocument {
  return { ...document, version: Math.max(1, Number(document.version || 1)) + 1 };
}
