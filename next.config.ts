import type { NextConfig } from "next";

const basePath = "/sagd-horario-docentes";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["aulavirtual.local"],
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/docente",
        destination: "/teacher",
        permanent: false,
      },
      {
        source: "/docente/:path*",
        destination: "/teacher/:path*",
        permanent: false,
      },
      {
        source: "/direccion",
        destination: "/direction",
        permanent: false,
      },
      {
        source: "/direccion/usuarios",
        destination: "/direction/users",
        permanent: false,
      },
      {
        source: "/direccion/auditoria",
        destination: "/direction/audit",
        permanent: false,
      },
      {
        source: "/direccion/configuracion",
        destination: "/direction/settings",
        permanent: false,
      },
      {
        source: "/direccion/:path*",
        destination: "/direction/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
