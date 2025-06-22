#ifndef COLLECTOR_ENT_H
#define COLLECTOR_ENT_H

#include <CoreFoundation/CFDictionary.h>

CFDictionaryRef entitlements(const char *path);
char *entitlements_xml(const char *path, size_t *size);

#endif
