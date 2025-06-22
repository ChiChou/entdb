#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <CoreFoundation/CoreFoundation.h>
#include <unistd.h>

#include "ent.h"
#include "db.h"
#include "json.h"

void handle(const char *path) {
  CFDictionaryRef dict = NULL;
  dict = entitlements(path);
  if (dict) {
    CFShow(dict);

    size_t size;
    char *xml = entitlements_xml(path, &size);
    if (xml) {
        write(STDOUT_FILENO, xml, size);
        free(xml);
    }

    char *json = to_json(dict, &size);
    if (json) {
      write(STDOUT_FILENO, json, size);
      free(json);
    }

    CFRelease(dict);
  } else {
    fprintf(stderr, "Failed to parse entitlements for: %s\n", path);
  }
}

int main(int argc, char *argv[]) {
  char *line = NULL;
  size_t len = 0;
  char *p;

  while (getline(&line, &len, stdin) != -1) {
    p = strstr(line, "\n");
    if (p)
      *p = '\0';

    handle(line);
  }

  return EXIT_SUCCESS;
}
