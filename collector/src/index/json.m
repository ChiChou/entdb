#import "json.h"

#import <Foundation/Foundation.h>

char *to_json(CFDictionaryRef dict, size_t *size) {
  char *p = NULL;
  @autoreleasepool {
    NSError *error = nil;
    NSData *json = [NSJSONSerialization dataWithJSONObject:(__bridge NSDictionary *)dict
                                                   options:0 /* or NSJSONWritingPrettyPrinted */
                                                     error:&error];
    if (error) {
      return NULL;
    }

    size_t len = [json length];
    p = malloc(len + 1);
    if (p) {
      memcpy(p, [json bytes], len);
      p[len] = '\0';
      if (size)
        *size = len;
    }
  }
  return p;
}
