#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mount.h>
#include <mach-o/fat.h>
#include <mach-o/loader.h>
#include <dispatch/dispatch.h>

#include <sqlite3.h>

_Bool is_mach_o(const char *);
int is_valid_mount(const char *);



/**
 * check if the file is a mach-o file
 * do not rely on execution bit because we need to include libraries
 */
_Bool is_mach_o(const char *path) {
    uint32_t magic;
    FILE *file;
    _Bool ret = false;

    // only check for same endianness, 
    // because we are running inside the host system
    uint32_t valid_values[] = {
        FAT_MAGIC,
        FAT_MAGIC_64,
        MH_MAGIC,
        MH_MAGIC_64,
    };

    file = fopen(path, "rb");
    if (file == NULL) return false;
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

int main() {
    return 0;
}
