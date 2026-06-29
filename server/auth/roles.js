const HUB_ADMIN_ROLES = ["admin", "boss", "developer"];

export function mapExpertHubRolesToIsAdmin(ssoRoles) {
  let roles = ssoRoles ?? [];
  if (!Array.isArray(roles)) roles = [roles];
  const normalized = roles
    .filter((r) => typeof r === "string" && r.length > 0)
    .map((r) => r.toLowerCase());
  return HUB_ADMIN_ROLES.some((hubRole) => normalized.includes(hubRole));
}
