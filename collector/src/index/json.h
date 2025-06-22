#ifndef COLLECTOR_JSON_H
#define COLLECTOR_JSON_H

#import <CoreFoundation/CFDictionary.h>

char *to_json(CFDictionaryRef dict, size_t *size);

#endif

