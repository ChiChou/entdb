export interface OS {
  name: string;
  version: string;
  build: string;
  udid: string;
}

export interface Binary {
  name: string;
  path: string;
  xml: string;
  json: string;
}
