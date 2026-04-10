export interface OS {
  name: string;
  build: string;
  version: string;
  devices: string[];
}

export interface Group {
  name: string;
  list: OS[];
}
