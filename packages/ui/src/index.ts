export const uiTokens = {
  colors: {
    background: "#080808",
    panel: "#101010",
    panelRaised: "#151515",
    text: "#f7f7f5",
    muted: "#8a8a86",
    line: "#262626",
    accent: "#d8ff3e"
  },
  typography: {
    display: "Inter, ui-sans-serif, system-ui, sans-serif",
    trackingDisplay: "-0.065em"
  },
  motion: {
    fast: "160ms",
    normal: "220ms",
    slow: "420ms"
  }
} as const;

export const navGroups = [
  { label: "Работа", items: ["Обзор", "Проекты", "Клиенты", "Лиды", "Бронирования"] },
  { label: "Создание", items: ["Сайты", "Мини-приложения", "Шаблоны", "Компоненты"] },
  { label: "Операции", items: ["Аналитика", "Домены", "Интеграции", "Тариф и оплата", "Команда"] }
] as const;
