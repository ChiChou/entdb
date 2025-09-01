#!/bin/bash
# 512MB ramdisk, apfs formatted
diskutil erasevolume APFS RAMDisk $(hdiutil attach -nomount ram://1048576)
