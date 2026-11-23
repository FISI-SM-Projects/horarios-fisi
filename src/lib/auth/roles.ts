import type { AppRole } from "@/lib/domain/types";

export const SAGD_CLIENT_ROLE_ACCESS = "ACCESS";

export function isAppRole(value: unknown): value is AppRole {
  return value === "docente" || value === "direccion" || value === "admin";
}

/**
 * Validates if the client roles array contains the required ACCESS role for SAGD.
 */
export function hasRequiredClientAccess(
  clientRoles: string[] = [],
  requiredRole = SAGD_CLIENT_ROLE_ACCESS,
): boolean {
  if (!Array.isArray(clientRoles) || clientRoles.length === 0) {
    return false;
  }
  const normalized = clientRoles.map((r) => r.trim().toUpperCase());
  return normalized.includes(requiredRole.toUpperCase());
}

/**
 * Maps the array of institutional roles for HORARIOS_FISI into the local application AppRole
 * based on the strict hierarchy:
 * 1. ADMIN -> "admin"
 * 2. DIRECTOR_ESCUELA or DEPARTAMENTO -> "direccion"
 * 3. DOCENTE -> "docente"
 * If no supported role is found, returns null.
 */
export function resolveEffectiveRole(
  institutionalRoles: string[] = [],
): AppRole | null {
  if (!Array.isArray(institutionalRoles) || institutionalRoles.length === 0) {
    return null;
  }

  const normalized = institutionalRoles.map((r) => r.trim().toUpperCase());

  if (normalized.includes("ADMIN")) {
    return "admin";
  }

  if (
    normalized.includes("DIRECTOR_ESCUELA") ||
    normalized.includes("DEPARTAMENTO")
  ) {
    return "direccion";
  }

  if (normalized.includes("DOCENTE")) {
    return "docente";
  }

  return null;
}

/**
 * Checks whether the institutional roles qualify for access to Horarios FISI,
 * optionally verifying the client-level ACCESS role in Keycloak.
 */
export function canAccessHorariosFisi(
  institutionalRoles: string[] = [],
  clientRoles?: string[],
): boolean {
  if (clientRoles !== undefined && !hasRequiredClientAccess(clientRoles)) {
    return false;
  }
  return resolveEffectiveRole(institutionalRoles) !== null;
}
