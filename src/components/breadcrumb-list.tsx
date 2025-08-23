import { addBasePath } from "@/lib/env";

import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "./ui/breadcrumb";

interface Props {
  os: string;
  children?: React.ReactNode;
}

export function Breadcrumbs({ os, children }: Props) {
  return (
    <header className="mb-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={addBasePath(`/os?os=${os}`)}>
              {os}
            </BreadcrumbLink>
          </BreadcrumbItem>
          {children && <BreadcrumbSeparator />}
          {children && (
            <BreadcrumbItem>
              <BreadcrumbPage>{children}</BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
