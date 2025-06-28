#include <dirent.h>
#include <errno.h>
#include <mach-o/fat.h>
#include <mach-o/loader.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mount.h>
#include <sys/stat.h>

_Bool is_mach_o(const char *);
int is_valid_mount(const char *);

void visit(const char *path);

void visit(const char *parent) {
  char path[MAXPATHLEN];
  char *base;
  size_t len;

  struct dirent *dp;
  DIR *dir;

  dir = opendir(parent);
  if (dir == NULL) {
    fprintf(stderr, "\033[33mError: Could not open directory '%s': %s\033[0m\n", parent, strerror(errno));
    return;
  }

  len = strlen(parent);
  base = strdup(parent);

  if (base[len - 1] == '/') {
    base[len - 1] = '\0';
  }

  while ((dp = readdir(dir)) != NULL) {
    if (strcmp(dp->d_name, ".") == 0 || strcmp(dp->d_name, "..") == 0) {
      continue;
    }

    snprintf(path, sizeof(path), "%s/%s", base, dp->d_name);

    struct stat statbuf;
    if (stat(path, &statbuf) == -1) {
      if (errno != ENOENT) { // mute ENOENT for non-existing files
        fprintf(stderr, "\033[31mError: Could not get status of '%s': %s\033[0m\n", path, strerror(errno));
      }
      continue;
    }

    if (S_ISLNK(statbuf.st_mode)) {
      // skip symlinks
      continue;
    }

    if (S_ISDIR(statbuf.st_mode)) {
      if (is_valid_mount(path)) {
        visit(path);
      } else {
        fprintf(stderr, "\033[33mSkipping non-root mount point: %s\033[0m\n", path);
      }
    }

    if (S_ISREG(statbuf.st_mode) && is_mach_o(path)) {
      puts(path);
    }
  }

  free(base);
  closedir(dir);
}

/**
 * check if the file is a mach-o file
 * do not rely on execution bit because we need to include libraries
 */
_Bool is_mach_o(const char *path) {
  uint32_t magic;
  FILE *file;
  _Bool ret = false;

  uint32_t valid_values[] = {
      FAT_MAGIC,
      FAT_MAGIC_64,
      FAT_CIGAM,
      FAT_CIGAM_64,

      MH_MAGIC,
      MH_MAGIC_64,
      MH_CIGAM,
      MH_CIGAM_64
  };

  file = fopen(path, "rb");
  if (file == NULL)
    return false;

  if (fread(&magic, sizeof(magic), 1, file) != 1) {
    ret = false;
    goto done;
  }

  for (int i = 0; i < sizeof(valid_values) / sizeof(valid_values[0]); i++) {
    if (magic == valid_values[i]) {
      ret = true;
      goto done;
    }
  }

done:
  fclose(file);
  return ret;
}

/**
 * on macOS, the preinstalled binaries are mounted on sealed volumes
 * we use this trick to ignore all 3rd party apps thus accerate the scan
 */
int is_valid_mount(const char *path) {
  struct statfs fs_info;
  if (statfs(path, &fs_info) == -1)
    return 0;

  if (strcmp(fs_info.f_mntonname, "/") == 0)
    return 1;

  return 0;
}

int main(int argc, char *argv[]) {
  visit("/");
  return 0;
}
