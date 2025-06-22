#include <sqlite3.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/syslimits.h>

#include "db.h"

int db_init(context_t *ctx);

context_t *db_open(const char *path) {
  int rc;

  if (!sqlite3_threadsafe()) {
    fprintf(stderr, "SQLite is not threadsafe\n");
    return NULL;
  }

  if (!path)
    return NULL;

  context_t *ctx = malloc(sizeof(context_t));
  if (!ctx)
    return NULL;

  ctx->path = strdup(path);
  rc = sqlite3_open(path, &ctx->db);
  if (rc != SQLITE_OK || db_init(ctx) != 0) {
    free(ctx->path);
    free(ctx);
    return NULL;
  }

  return ctx;
}

void db_close(context_t *ctx) {
  if (ctx) {
    if (ctx->db) {
      sqlite3_close(ctx->db);
    }
    free(ctx->path);
    free(ctx);
  }
}

int db_init(context_t *ctx) {
  const char *sql = "CREATE TABLE IF NOT EXISTS os ("
                    "  id INTEGER PRIMARY KEY AUTOINCREMENT,"
                    "  udid TEXT NOT NULL,"
                    "  build TEXT NOT NULL,"
                    "  name TEXT NOT NULL,"
                    "  version TEXT NOT NULL"
                    ");"

                    "CREATE TABLE IF NOT EXISTS bin ("
                    "  id INTEGER PRIMARY KEY AUTOINCREMENT,"
                    "  os_id INTEGER NOT NULL,"
                    "  path TEXT NOT NULL,"
                    "  path_segments TEXT,"
                    "  xml TEXT,"
                    "  json TEXT,"
                    "  FOREIGN KEY (os_id) REFERENCES os(id)"
                    ");"

                    "CREATE TABLE IF NOT EXISTS pair ("
                    "  id INTEGER PRIMARY KEY AUTOINCREMENT,"
                    "  binary_id INTEGER NOT NULL,"
                    "  key TEXT NOT NULL,"
                    "  value TEXT,"
                    "  FOREIGN KEY (binary_id) REFERENCES bin(id)"
                    ");";

  char *err_msg = 0;
  int rc = sqlite3_exec(ctx->db, sql, 0, 0, &err_msg);

  if (rc != SQLITE_OK) {
    fprintf(stderr, "SQL error: %s\n", err_msg);
    sqlite3_free(err_msg);
    return -1;
  }

  return 0;
}

sqlite3_int64 db_insert_os(context_t *ctx, os_meta_t *md) {
  const char *sql = "INSERT INTO os (udid, name, version, build) VALUES (?, ?, ?, ?)";
  sqlite3_stmt *stmt;
  sqlite3_int64 id;

  int rc = sqlite3_prepare_v2(ctx->db, sql, -1, &stmt, NULL);
  if (rc != SQLITE_OK)
    return -1;

  sqlite3_bind_text(stmt, 1, md->udid, -1, SQLITE_STATIC);
  sqlite3_bind_text(stmt, 2, md->name, -1, SQLITE_STATIC);
  sqlite3_bind_text(stmt, 3, md->version, -1, SQLITE_STATIC);
  sqlite3_bind_text(stmt, 4, md->build, -1, SQLITE_STATIC);

  rc = sqlite3_step(stmt);
  sqlite3_finalize(stmt);

  if (rc == SQLITE_DONE)
    id = sqlite3_last_insert_rowid(ctx->db);
  else
    id = -1;

  return id;
}

sqlite3_int64 db_insert_bin(context_t *ctx, sqlite3_int64 os_id, bin_meta_t *info) {
  const char *sql = "INSERT INTO bin (os_id, path, path_segments, xml, json) VALUES (?, ?, ?, ?, ?)";
  sqlite3_stmt *stmt;
  sqlite3_int64 id;

  int rc = sqlite3_prepare_v2(ctx->db, sql, -1, &stmt, NULL);
  if (rc != SQLITE_OK)
    return -1;

  // split path into segments by '/'
  char segments[PATH_MAX];
  char *token;
  char *path = strdup(info->path);

  size_t json_len = 0;
  segments[json_len++] = '[';
  while ((token = strsep(&path, "/"))) {
    segments[json_len++] = '"';
    size_t token_len = strlen(token);
    if (token_len) {
      memcpy(segments + json_len, token, token_len);
      json_len += token_len;
    }
    segments[json_len++] = '"';
    segments[json_len++] = ',';
  }

  free(path);

  if (json_len > 1) {
    // remove last comma
    json_len--;
  }

  segments[json_len++] = ']';
  segments[json_len] = '\0';

  sqlite3_bind_int64(stmt, 1, os_id);
  sqlite3_bind_text(stmt, 2, info->path, -1, SQLITE_STATIC);
  sqlite3_bind_text(stmt, 3, segments, -1, SQLITE_STATIC);
  sqlite3_bind_text(stmt, 4, info->xml, -1, SQLITE_STATIC);
  sqlite3_bind_text(stmt, 5, info->json, -1, SQLITE_STATIC);

  rc = sqlite3_step(stmt);
  sqlite3_finalize(stmt);

  if (rc == SQLITE_DONE)
    id = sqlite3_last_insert_rowid(ctx->db);
  else
    id = -1;

  return id;
}

_Bool db_insert_pair(context_t *ctx, sqlite3_int64 binary_id, const char *key, const char *value) {
  const char *sql = "INSERT INTO pair (binary_id, key, value) VALUES (?, ?, ?)";
  sqlite3_stmt *stmt;

  int rc = sqlite3_prepare_v2(ctx->db, sql, -1, &stmt, NULL);
  if (rc != SQLITE_OK)
    return false;

  sqlite3_bind_int64(stmt, 1, binary_id);
  sqlite3_bind_text(stmt, 2, key, -1, SQLITE_STATIC);
  sqlite3_bind_text(stmt, 3, value, -1, SQLITE_STATIC);

  rc = sqlite3_step(stmt);
  sqlite3_finalize(stmt);

  return rc == SQLITE_DONE;
}
