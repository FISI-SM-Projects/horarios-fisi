export const BASE_PATH =
  process.env.NEXT_PUBLIC_BASE_PATH || "/sagd-horario-docentes";

export function withBasePath(path: string): string {
  if (!BASE_PATH) return path;
  if (path.startsWith(BASE_PATH)) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${cleanPath}`;
}
