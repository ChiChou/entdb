#include <CoreFoundation/CoreFoundation.h>

#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include "db.h"
#include "ent.h"
#include "json.h"

#define SYSVER_PLIST CFSTR("file:///System/Library/CoreServices/SystemVersion.plist")

static _Bool debug = false;

os_meta_t *get_os_meta() {
  os_meta_t *md = malloc(sizeof(os_meta_t));
  if (!md)
    return NULL;

  CFURLRef url = CFURLCreateWithString(kCFAllocatorDefault, SYSVER_PLIST, NULL);
  CFReadStreamRef stream = CFReadStreamCreateWithFile(kCFAllocatorDefault, url);
  if (stream) {
    CFReadStreamOpen(stream);
    CFErrorRef error = NULL;
    CFPropertyListRef plist =
        CFPropertyListCreateWithStream(kCFAllocatorDefault, stream, 0, kCFPropertyListImmutable, NULL, &error);
    if (plist) {

      if (debug)
        CFShow(plist);

      char *cp;
      CFIndex size;
      CFStringRef cfstr;

#define ASSIGN_OS_META(member, key)                                                                                    \
  cfstr = CFDictionaryGetValue(plist, CFSTR(key));                                                                     \
  size = CFStringGetMaximumSizeForEncoding(CFStringGetLength(cfstr), kCFStringEncodingUTF8) + 1;                       \
  cp = malloc(size);                                                                                                   \
  if (!cp) {                                                                                                           \
    fprintf(stderr, "Memory allocation failed for %s\n", key);                                                         \
    abort();                                                                                                           \
  }                                                                                                                    \
  CFStringGetCString(cfstr, cp, size, kCFStringEncodingUTF8);                                                          \
  md->member = cp;

      ASSIGN_OS_META(udid, "BuildID");
      ASSIGN_OS_META(build, "ProductBuildVersion");
      ASSIGN_OS_META(name, "ProductName");
      ASSIGN_OS_META(version, "ProductVersion");

      CFRelease(plist);
    }

    if (error) {
      CFShow(error);
      CFRelease(error);
    }
  }
  CFReadStreamClose(stream);
  CFRelease(stream);
  CFRelease(url);

  return md;
}

static void handle(context_t *ctx, sqlite3_int64 os_id, const char *path) {
  CFDictionaryRef dict = entitlements(path);
  if (!dict)
    return; // do not report

  if (debug)
    CFShow(dict);

  char *xml = entitlements_xml(path, NULL);
  bin_meta_t info = {.path = strdup(path), .xml = NULL, .json = NULL};

  if (xml) {
    if (debug)
      fprintf(stderr, "Entitlements as xml:\n%s\n", xml);

    info.xml = xml;
  }

  size_t size;
  char *json = to_json(dict, &size);
  if (json) {
    if (debug)
      fprintf(stderr, "Entitlements as json:\n%s\n", json);

    info.json = json;
  }

  /* sqlite3_int64 bin_id = */
  db_insert_bin(ctx, os_id, &info);

  free(info.path);
  free(info.xml);
  free(info.json);

  CFRelease(dict);
}

int main(int argc, char *argv[]) {
  if (getenv("DEBUG"))
    debug = true;

  if (argc < 2) {
    fprintf(stderr, "Usage: %s <db>\n", argv[0]);
    return EXIT_FAILURE;
  }

  context_t *ctx = db_open(argv[1]);
  if (!ctx) {
    fprintf(stderr, "Failed to open database: %s\n", argv[1]);
    return EXIT_FAILURE;
  }

  int exit_code = EXIT_SUCCESS;
  sqlite3_int64 os_id;
  os_meta_t *os_meta = get_os_meta();
  if (os_meta) {
    os_id = db_insert_os(ctx, os_meta);
    {
      free(os_meta->name);
      free(os_meta->build);
      free(os_meta->udid);
      free(os_meta->version);
    }

    if (os_id != -1) {
      char *line = NULL;
      size_t len = 0;
      while (getline(&line, &len, stdin) != -1) {
        char *p = strstr(line, "\n");
        if (p)
          *p = '\0';

        handle(ctx, os_id, line);
      }
      free(line);
    } else {
      fprintf(stderr, "Failed to write to database.\n");
      exit_code = EXIT_FAILURE;
    }
  }

  db_close(ctx);
  return exit_code;
}
