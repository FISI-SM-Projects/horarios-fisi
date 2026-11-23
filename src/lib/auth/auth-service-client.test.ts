import { describe, expect, it } from "bun:test";
import {
  AuthServiceError,
  decodeJwtPayload,
  fetchInstitutionalUserInfo,
  getKeycloakLogoutEndpoint,
  getKeycloakTokenEndpoint,
  getKeycloakUserInfoEndpoint,
  loginWithInstitutionalCredentials,
  logoutInstitutionalSession,
  normalizeLdapUsername,
  refreshInstitutionalTokens,
} from "./auth-service-client";

function createMockJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" }),
  ).toString("base64url");
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${data}.mock-sig`;
}

describe("normalizeLdapUsername", () => {
  it("extracts username from institutional email", () => {
    expect(normalizeLdapUsername("lmotaa@unmsm.edu.pe")).toBe("lmotaa");
    expect(normalizeLdapUsername("  LMOTAA@UNMSM.EDU.PE  ")).toBe("lmotaa");
    expect(normalizeLdapUsername("hpaucarc@unmsm.edu.pe")).toBe("hpaucarc");
  });

  it("preserves bare username and lowercases", () => {
    expect(normalizeLdapUsername("lmotaa")).toBe("lmotaa");
    expect(normalizeLdapUsername("  LMotaA  ")).toBe("lmotaa");
  });

  it("handles empty or falsy string", () => {
    expect(normalizeLdapUsername("")).toBe("");
  });
});

describe("decodeJwtPayload", () => {
  it("decodes a standard JWT payload with UTF-8 support", () => {
    const payload = {
      sub: "86c704d1-18d2-45e7-815a-47b0ae2d9b74",
      preferred_username: "hpaucarc",
      name: "HERMINIO PAÚCAR CÚRASMA",
      roles: ["DOCENTE"],
    };
    const jwt = createMockJwt(payload);
    const decoded = decodeJwtPayload<typeof payload>(jwt);

    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.preferred_username).toBe("hpaucarc");
    expect(decoded.name).toBe("HERMINIO PAÚCAR CÚRASMA");
    expect(decoded.roles).toEqual(["DOCENTE"]);
  });

  it("throws AuthServiceError for malformed tokens", () => {
    expect(() => decodeJwtPayload("invalid-token")).toThrow(AuthServiceError);
    expect(() => decodeJwtPayload("part1.part2")).toThrow(AuthServiceError);
  });
});

describe("OIDC Endpoint Helpers", () => {
  it("builds correct Keycloak endpoints from base URL and realm", () => {
    const baseUrl = "http://aulavirtual.local/auth";
    const realm = "aula-virtual-fisi-pregrado-dev";

    expect(getKeycloakTokenEndpoint(baseUrl, realm)).toBe(
      "http://aulavirtual.local/auth/realms/aula-virtual-fisi-pregrado-dev/protocol/openid-connect/token",
    );
    expect(getKeycloakUserInfoEndpoint(baseUrl, realm)).toBe(
      "http://aulavirtual.local/auth/realms/aula-virtual-fisi-pregrado-dev/protocol/openid-connect/userinfo",
    );
    expect(getKeycloakLogoutEndpoint(baseUrl, realm)).toBe(
      "http://aulavirtual.local/auth/realms/aula-virtual-fisi-pregrado-dev/protocol/openid-connect/logout",
    );
  });
});

describe("loginWithInstitutionalCredentials", () => {
  it("authenticates successfully against Keycloak OIDC token endpoint and parses tokens", async () => {
    const mockAccessToken = createMockJwt({
      sub: "86c704d1-18d2-45e7-815a-47b0ae2d9b74",
      preferred_username: "hpaucarc",
      given_name: "HERMINIO",
      family_name: "PAUCAR CURASMA",
      email: "hpaucarc@unmsm.edu.pe",
      roles: ["DOCENTE", "offline_access"],
      code: "0A5292",
      dpto: "SW",
      resource_access: {
        "sagd-horario-docentes": {
          roles: ["ACCESS"],
        },
      },
    });

    const mockIdToken = createMockJwt({
      sub: "86c704d1-18d2-45e7-815a-47b0ae2d9b74",
      preferred_username: "hpaucarc",
      given_name: "HERMINIO",
      family_name: "PAUCAR CURASMA",
      name: "HERMINIO PAUCAR CURASMA",
      email: "hpaucarc@unmsm.edu.pe",
      code: "0A5292",
      dpto: "SW",
      roles: ["DOCENTE"],
    });

    const mockFetch = (async (
      url: string | URL | Request,
      init?: RequestInit,
    ) => {
      expect(String(url)).toBe(
        "http://aulavirtual.local/auth/realms/aula-virtual-fisi-pregrado-dev/protocol/openid-connect/token",
      );
      expect(init?.headers).toEqual({
        "Content-Type": "application/x-www-form-urlencoded",
      });

      const params = new URLSearchParams(init?.body as string);
      expect(params.get("grant_type")).toBe("password");
      expect(params.get("client_id")).toBe("sagd-horario-docentes");
      expect(params.get("client_secret")).toBe("secret-123");
      expect(params.get("username")).toBe("hpaucarc");
      expect(params.get("password")).toBe("hpaucarc");

      return new Response(
        JSON.stringify({
          access_token: mockAccessToken,
          refresh_token: "mock-refresh-token",
          id_token: mockIdToken,
          token_type: "Bearer",
          expires_in: 300,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    const result = await loginWithInstitutionalCredentials({
      username: "hpaucarc@unmsm.edu.pe",
      password: "hpaucarc",
      baseUrl: "http://aulavirtual.local/auth",
      realm: "aula-virtual-fisi-pregrado-dev",
      clientId: "sagd-horario-docentes",
      clientSecret: "secret-123",
      fetchFn: mockFetch,
    });

    expect(result.accessToken).toBe(mockAccessToken);
    expect(result.refreshToken).toBe("mock-refresh-token");
    expect(result.expiresIn).toBe(300);
    expect(result.user.ldapUid).toBe("hpaucarc");
    expect(result.user.email).toBe("hpaucarc@unmsm.edu.pe");
    expect(result.user.firstName).toBe("HERMINIO");
    expect(result.user.lastName).toBe("PAUCAR CURASMA");
    expect(result.user.code).toBe("0A5292");
    expect(result.user.department).toBe("SW");
    expect(result.user.roles).toContain("DOCENTE");
  });

  it("throws 400 when username or password are empty", async () => {
    await expect(
      loginWithInstitutionalCredentials({
        username: "",
        password: "password",
      }),
    ).rejects.toThrow(AuthServiceError);

    await expect(
      loginWithInstitutionalCredentials({
        username: "user",
        password: "",
      }),
    ).rejects.toThrow(AuthServiceError);
  });

  it("throws 401 when Keycloak reports invalid credentials (invalid_grant)", async () => {
    const mockFetch = (async () => {
      return new Response(
        JSON.stringify({
          error: "invalid_grant",
          error_description: "Invalid user credentials",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    await expect(
      loginWithInstitutionalCredentials({
        username: "baduser",
        password: "badpassword",
        fetchFn: mockFetch,
      }),
    ).rejects.toThrow("Credenciales institucionales incorrectas.");
  });

  it("throws 403 when user lacks client role ACCESS in resource_access", async () => {
    const mockAccessToken = createMockJwt({
      sub: "user-without-access",
      preferred_username: "user.noaccess",
      roles: ["DOCENTE"],
      resource_access: {
        account: {
          roles: ["manage-account"],
        },
      },
    });

    const mockFetch = (async () => {
      return new Response(
        JSON.stringify({
          access_token: mockAccessToken,
          refresh_token: "refresh-no-access",
          token_type: "Bearer",
          expires_in: 300,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    await expect(
      loginWithInstitutionalCredentials({
        username: "user.noaccess",
        password: "password",
        clientId: "sagd-horario-docentes",
        fetchFn: mockFetch,
      }),
    ).rejects.toThrow("El usuario no cuenta con roles asignados");
  });

  it("throws 403 when user role is not supported (e.g. ALUMNO)", async () => {
    const mockAccessToken = createMockJwt({
      sub: "student-sub",
      preferred_username: "richard.torres4",
      email: "richard.torres4@unmsm.edu.pe",
      roles: ["ALUMNO", "offline_access"],
      resource_access: {
        account: {
          roles: ["manage-account"],
        },
      },
    });

    const mockFetch = (async () => {
      return new Response(
        JSON.stringify({
          access_token: mockAccessToken,
          refresh_token: "refresh-student",
          token_type: "Bearer",
          expires_in: 300,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    await expect(
      loginWithInstitutionalCredentials({
        username: "richard.torres4",
        password: "password",
        clientId: "sagd-horario-docentes",
        fetchFn: mockFetch,
      }),
    ).rejects.toThrow("El usuario no cuenta con roles asignados");
  });
});

describe("refreshInstitutionalTokens", () => {
  it("renews tokens successfully against Keycloak token endpoint", async () => {
    const mockFetch = (async (
      url: string | URL | Request,
      init?: RequestInit,
    ) => {
      expect(String(url)).toBe(
        "http://aulavirtual.local/auth/realms/aula-virtual-fisi-pregrado-dev/protocol/openid-connect/token",
      );
      const params = new URLSearchParams(init?.body as string);
      expect(params.get("grant_type")).toBe("refresh_token");
      expect(params.get("client_id")).toBe("sagd-horario-docentes");
      expect(params.get("refresh_token")).toBe("valid-keycloak-refresh-token");

      return new Response(
        JSON.stringify({
          access_token: "new-access-token",
          refresh_token: "new-rotated-refresh-token",
          token_type: "Bearer",
          expires_in: 300,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    const data = await refreshInstitutionalTokens({
      refreshToken: "valid-keycloak-refresh-token",
      baseUrl: "http://aulavirtual.local/auth",
      realm: "aula-virtual-fisi-pregrado-dev",
      clientId: "sagd-horario-docentes",
      fetchFn: mockFetch,
    });

    expect(data.accessToken).toBe("new-access-token");
    expect(data.refreshToken).toBe("new-rotated-refresh-token");
    expect(data.expiresIn).toBe(300);
  });

  it("throws 401 when refresh token is missing", async () => {
    await expect(
      refreshInstitutionalTokens({
        refreshToken: "",
      }),
    ).rejects.toThrow("Refresh token no proporcionado.");
  });

  it("throws 401 when Keycloak reports expired or invalid refresh token", async () => {
    const mockFetch = (async () => {
      return new Response(
        JSON.stringify({
          error: "invalid_grant",
          error_description: "Invalid refresh token",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    await expect(
      refreshInstitutionalTokens({
        refreshToken: "expired-refresh-token",
        fetchFn: mockFetch,
      }),
    ).rejects.toThrow("Invalid refresh token");
  });
});

describe("logoutInstitutionalSession", () => {
  it("calls Keycloak logout endpoint with client credentials and refresh token", async () => {
    let called = false;
    const mockFetch = (async (
      url: string | URL | Request,
      init?: RequestInit,
    ) => {
      expect(String(url)).toBe(
        "http://aulavirtual.local/auth/realms/aula-virtual-fisi-pregrado-dev/protocol/openid-connect/logout",
      );
      const headers = init?.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
      expect(headers.Authorization).toBe("Bearer test-access-token");

      const params = new URLSearchParams(init?.body as string);
      expect(params.get("client_id")).toBe("sagd-horario-docentes");
      expect(params.get("refresh_token")).toBe("test-refresh-token");

      called = true;
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;

    await logoutInstitutionalSession({
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      baseUrl: "http://aulavirtual.local/auth",
      realm: "aula-virtual-fisi-pregrado-dev",
      clientId: "sagd-horario-docentes",
      fetchFn: mockFetch,
    });

    expect(called).toBe(true);
  });
});

describe("fetchInstitutionalUserInfo", () => {
  it("calls Keycloak UserInfo endpoint with Bearer authorization", async () => {
    const mockFetch = (async (
      url: string | URL | Request,
      init?: RequestInit,
    ) => {
      expect(String(url)).toBe(
        "http://aulavirtual.local/auth/realms/aula-virtual-fisi-pregrado-dev/protocol/openid-connect/userinfo",
      );
      const headers = init?.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer valid-access-token");

      return new Response(
        JSON.stringify({
          sub: "86c704d1-18d2-45e7-815a-47b0ae2d9b74",
          preferred_username: "hpaucarc",
          email: "hpaucarc@unmsm.edu.pe",
          roles: ["DOCENTE"],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    const data = await fetchInstitutionalUserInfo({
      accessToken: "valid-access-token",
      baseUrl: "http://aulavirtual.local/auth",
      realm: "aula-virtual-fisi-pregrado-dev",
      fetchFn: mockFetch,
    });

    expect(data.preferred_username).toBe("hpaucarc");
    expect(data.roles).toEqual(["DOCENTE"]);
  });
});
