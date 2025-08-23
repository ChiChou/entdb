function getBasePath() {
  if ("NEXT_PUBLIC_BASE_PATH" in process.env) {
    return process.env.NEXT_PUBLIC_BASE_PATH;
  }

  return "";
}

export const basePath = getBasePath();

export function addBasePath(path: string) {
  let prefixed = path;
  if (!prefixed.startsWith("/")) prefixed = `/${prefixed}`;
  return basePath + prefixed;
}
