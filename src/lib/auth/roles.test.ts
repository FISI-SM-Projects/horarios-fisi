import { describe, expect, it } from "bun:test";
import {
  canAccessHorariosFisi,
  hasRequiredClientAccess,
  isAppRole,
  resolveEffectiveRole,
} from "./roles";

describe("isAppRole", () => {
  it("validates valid application roles", () => {
    expect(isAppRole("admin")).toBe(true);
    expect(isAppRole("direccion")).toBe(true);
    expect(isAppRole("docente")).toBe(true);
  });

  it("rejects invalid role strings and types", () => {
    expect(isAppRole("ADMIN")).toBe(false);
    expect(isAppRole("alumno")).toBe(false);
    expect(isAppRole(null)).toBe(false);
    expect(isAppRole(undefined)).toBe(false);
    expect(isAppRole(123)).toBe(false);
  });
});

describe("hasRequiredClientAccess", () => {
  it("validates when ACCESS client role is present", () => {
    expect(hasRequiredClientAccess(["ACCESS"])).toBe(true);
    expect(hasRequiredClientAccess(["access"])).toBe(true);
    expect(hasRequiredClientAccess(["other", "ACCESS"])).toBe(true);
  });

  it("rejects when ACCESS role is absent or invalid", () => {
    expect(hasRequiredClientAccess([])).toBe(false);
    expect(hasRequiredClientAccess(["other", "manage-account"])).toBe(false);
    expect(hasRequiredClientAccess(undefined as unknown as string[])).toBe(
      false,
    );
  });
});

describe("resolveEffectiveRole", () => {
  it("resolves single roles according to mapping", () => {
    expect(resolveEffectiveRole(["ADMIN"])).toBe("admin");
    expect(resolveEffectiveRole(["DIRECTOR_ESCUELA"])).toBe("direccion");
    expect(resolveEffectiveRole(["DEPARTAMENTO"])).toBe("direccion");
    expect(resolveEffectiveRole(["DOCENTE"])).toBe("docente");
  });

  it("resolves multiple roles honoring hierarchy: ADMIN > direccion > docente", () => {
    expect(resolveEffectiveRole(["DOCENTE", "ADMIN"])).toBe("admin");
    expect(resolveEffectiveRole(["ADMIN", "DOCENTE", "DIRECTOR_ESCUELA"])).toBe(
      "admin",
    );
    expect(resolveEffectiveRole(["DOCENTE", "DIRECTOR_ESCUELA"])).toBe(
      "direccion",
    );
    expect(resolveEffectiveRole(["DOCENTE", "DEPARTAMENTO"])).toBe("direccion");
    expect(resolveEffectiveRole(["DEPARTAMENTO", "DIRECTOR_ESCUELA"])).toBe(
      "direccion",
    );
  });

  it("handles case-insensitivity and whitespace", () => {
    expect(resolveEffectiveRole([" admin "])).toBe("admin");
    expect(resolveEffectiveRole(["director_escuela"])).toBe("direccion");
    expect(resolveEffectiveRole(["docente"])).toBe("docente");
  });

  it("returns null for unsupported roles (ALUMNO, INVITADO, empty)", () => {
    expect(resolveEffectiveRole(["ALUMNO"])).toBeNull();
    expect(resolveEffectiveRole(["INVITADO"])).toBeNull();
    expect(resolveEffectiveRole(["ALUMNO", "INVITADO"])).toBeNull();
    expect(resolveEffectiveRole([])).toBeNull();
  });
});

describe("canAccessHorariosFisi", () => {
  it("returns true for authorized roles and false for unsupported", () => {
    expect(canAccessHorariosFisi(["DOCENTE"])).toBe(true);
    expect(canAccessHorariosFisi(["ADMIN"])).toBe(true);
    expect(canAccessHorariosFisi(["ALUMNO"])).toBe(false);
    expect(canAccessHorariosFisi([])).toBe(false);
  });

  it("evaluates both institutional roles and client roles when provided", () => {
    expect(canAccessHorariosFisi(["DOCENTE"], ["ACCESS"])).toBe(true);
    expect(canAccessHorariosFisi(["ADMIN"], ["ACCESS"])).toBe(true);
    expect(canAccessHorariosFisi(["DEPARTAMENTO"], ["ACCESS"])).toBe(true);
    expect(canAccessHorariosFisi(["DOCENTE"], [])).toBe(false);
    expect(canAccessHorariosFisi(["DOCENTE"], ["other_role"])).toBe(false);
    expect(canAccessHorariosFisi(["ALUMNO"], ["ACCESS"])).toBe(false);
  });
});
