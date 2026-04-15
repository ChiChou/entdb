export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const dataURL = process.env.NEXT_PUBLIC_DATA_URL || `${basePath}/data`;

export const withBase = (path: string) =>
  basePath + (path.startsWith("/") ? path : `/${path}`);
