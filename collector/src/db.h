#ifndef COLLECTOR_DB_H
#define COLLECTOR_DB_H

#include <sqlite3.h>
#include <stdbool.h>

typedef struct {
  sqlite3 *db;
  char *path;
} context_t;

context_t *db_open(const char *);
void db_close(context_t *);

// os metadata
typedef struct {
  char *udid;    // BuildID
  char *build;   // ProductBuildVersion
  char *name;    // ProductName
  char *version; // ProductVersion
} os_meta_t;

sqlite3_int64 db_insert_os(context_t *ctx, os_meta_t *md);

typedef struct {
  sqlite3_int64 os_id;
  char *path; // stored as json array, splitted by "/"
  char *xml;  // plist as xml string
  char *json; // convert to json for easy query,
              // be careful that JSON values are
              // not fully compatible with plist
} bin_meta_t;

_Bool db_insert_bin(context_t *ctx, sqlite3_int64 os, bin_meta_t *info);
_Bool db_insert_pair(context_t *ctx, sqlite3_int64 binary_id, const char *key, const char *value);

#endif
