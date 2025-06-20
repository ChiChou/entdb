#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <dirent.h>
#include <errno.h>
#include <sys/stat.h>
#include <sys/mount.h>


#ifndef MAXPATHLEN
#define MAXPATHLEN 4096
#endif

int is_valid_mount(const char *);
void visit(const char *);
int is_macho(const char *);

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

        if (S_ISDIR(statbuf.st_mode)) {
            if (is_valid_mount(path)) {
                visit(path);
            } else {
                fprintf(stderr, "\033[33mSkipping non-root mount point: %s\033[0m\n", path);
            }
        }

        if (S_ISREG(statbuf.st_mode) && is_macho(path)) {
            puts(path);
        }
    }

    free(base);
    closedir(dir);
}

int is_macho(const char *path) {
    uint32_t known_magic[] = {
        0xfeedface,
        0xfeedfacf,
        0xcefaedfe,
        0xcffaedfe,

        // fat
        0xcafebabe,
        0xbebafeca,
        0xcafeface,
        0xbebafeca
    };

    FILE *file = fopen(path, "rb");
    if (!file) {
        fprintf(stderr, "Error opening file '%s': %s\n", path, strerror(errno));
        return 0;
    }

    unsigned char magic[4];
    if (fread(magic, 1, sizeof(magic), file) != sizeof(magic)) {
        fclose(file);
        return 0;
    }

    fclose(file);

    uint32_t value = *(uint32_t *)magic;
    for (size_t i = 0; i < sizeof(known_magic) / sizeof(known_magic[0]); ++i)
        if (value == known_magic[i])
            return 1;

    return 0;
}

int is_valid_mount(const char *path) {
    struct statfs fs_info;
    if (statfs(path, &fs_info) == -1)
        return 0;

    if (strcmp(fs_info.f_mntonname, "/") == 0)
        return 1;

    return 0;
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <directory_path>\n", argv[0]);
        return EXIT_FAILURE;
    }

    visit(argv[1]);

    return EXIT_SUCCESS;
}
