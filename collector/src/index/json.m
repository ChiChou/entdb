#import "json.h"

#import <Foundation/Foundation.h>

char *to_json(CFDictionaryRef dict, size_t *size) {
  void *p;
  @autoreleasepool {
    NSError *error = nil;
    NSData *json = [NSJSONSerialization dataWithJSONObject:(__bridge NSDictionary *)dict
                                                   options:0 /* or NSJSONWritingPrettyPrinted */
                                                     error:&error];
    if (error) {
      return NULL;
    }

    p = malloc([json length]);
    memcpy(p, [json bytes], [json length]);
    *size = [json length];
  }
  return p;
}
