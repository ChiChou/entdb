export interface OS {
  name: string;
  build: string;
  version: string;
  devices: string[];
  beta?: boolean;
}

export interface Group {
  name: string;
  list: OS[];
}
