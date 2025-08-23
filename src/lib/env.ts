export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function addBasePath(path: string) {
  let prefixed = path;
  if (!prefixed.startsWith("/")) prefixed = `/${prefixed}`;
  return basePath + prefixed;
}
