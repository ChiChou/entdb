export interface OS {
  name: string; // product name
  build: string;
  version: string;
  devices: string[];
}

export interface Group {
  name: string;
  list: OS[];
}
