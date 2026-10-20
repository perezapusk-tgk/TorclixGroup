export const roles=["owner","admin","editor","viewer"];

export const permissions={
  owner:["*"],
  admin:["projects:*","clients:*","leads:*","bookings:*","catalog:*","domains:*","analytics:read","billing:read","team:*"],
  editor:["projects:read","projects:write","clients:read","clients:write","leads:read","leads:write","bookings:read","bookings:write","catalog:read","catalog:write","domains:read"],
  viewer:["projects:read","clients:read","leads:read","bookings:read","catalog:read","domains:read","analytics:read"]
};

export function can(role,permission){
  const list=permissions[role]||[];
  return list.includes("*")||list.includes(permission)||list.includes(permission.split(":")[0]+":*");
}

export function assertRole(role){
  if(!roles.includes(role)) throw new Error(`Unknown role: ${role}`);
  return role;
}
