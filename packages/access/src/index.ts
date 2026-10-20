export type Role="owner"|"admin"|"editor"|"viewer";
export const permissions={
  owner:["*"],
  admin:["projects:*","clients:*","leads:*","bookings:*","domains:*","billing:read","team:*"],
  editor:["projects:read","projects:write","clients:*","leads:*","bookings:*","domains:read"],
  viewer:["projects:read","clients:read","leads:read","bookings:read","domains:read","analytics:read"]
} as const;
export function can(role:Role,permission:string){const list=permissions[role]||[];return list.includes("*")||list.includes(permission)||list.includes(permission.split(":")[0]+":*")||list.includes("projects:*")&&permission.startsWith("projects:");}
