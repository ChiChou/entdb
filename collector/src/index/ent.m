#import <CoreFoundation/CoreFoundation.h>
#import <Security/Security.h>

#include "ent.h"

CFDictionaryRef entitlements(const char *path) {
  SecStaticCodeRef code = NULL;
  CFDictionaryRef signingInfo = NULL;
  CFTypeRef dict = NULL;

  CFStringRef pathRef = CFStringCreateWithCString(kCFAllocatorDefault, path, kCFStringEncodingUTF8);
  if (pathRef) {
    CFURLRef urlRef = CFURLCreateWithFileSystemPath(kCFAllocatorDefault, pathRef, kCFURLPOSIXPathStyle, true);
    if (urlRef) {
      if (SecStaticCodeCreateWithPath(urlRef, kSecCSDefaultFlags, &code) == errSecSuccess) {
        if (SecCodeCopySigningInformation(code, kSecCSSigningInformation, &signingInfo) == errSecSuccess) {
          if (CFDictionaryGetValueIfPresent(signingInfo, kSecCodeInfoEntitlementsDict, &dict)) {
            CFRetain(dict);
          }
          CFRelease(signingInfo);
        }
        CFRelease(code);
      }
      CFRelease(urlRef);
    }
    CFRelease(pathRef);
  }

  return (CFDictionaryRef)dict;
}

char *entitlements_xml(const char *path, size_t *size) {
  char *p = NULL;
  CFDictionaryRef dict = entitlements(path);
  if (!dict)
    return NULL;
  CFDataRef data = CFPropertyListCreateData(kCFAllocatorDefault, dict, kCFPropertyListXMLFormat_v1_0, 0, NULL);
  if (data) {
    size_t len = CFDataGetLength(data);
    p = malloc(len + 1);
    if (p) {
      memcpy(p, CFDataGetBytePtr(data), len);
      p[len] = '\0';
      if (size)
        *size = len;
    }
    CFRelease(data);
  }
  CFRelease(dict);
  return p;
}
