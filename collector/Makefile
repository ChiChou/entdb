SRC_DIR = src
BIN_DIR = bin

SRC_SCAN = $(SRC_DIR)/scan/scan.c
SRC_INDEX = $(SRC_DIR)/index/*.c $(SRC_DIR)/index/*.m

SCAN = $(BIN_DIR)/scan
INDEX = $(BIN_DIR)/index

# 设置最低部署目标为macOS 10.13
MACOSX_DEPLOYMENT_TARGET = 10.13

CFLAGS = -Iinclude -Wall -Werror
LDFLAGS = -fmodules -mmacosx-version-min=$(MACOSX_DEPLOYMENT_TARGET)

# 为indexer添加必要的框架
FRAMEWORKS = -framework CoreFoundation -framework Security

.PHONY: all clean format md
.DEFAULT_GOAL := all

scan: md $(SRC_SCAN)
	cc $(SRC_SCAN) $(CFLAGS) $(LDFLAGS) -o $(SCAN)

indexer: md $(SRC_INDEX)
	cc $(SRC_INDEX) $(CFLAGS) $(LDFLAGS) -o $(INDEX) -lsqlite3 $(FRAMEWORKS)

md:
	mkdir -p $(BIN_DIR)

format:
	clang-format -i $(SRC_SCAN) $(SRC_INDEX) $(SRC_COMMON)

all: scan indexer

test-index: all
	echo /usr/libexec/amfid | $(INDEX)
