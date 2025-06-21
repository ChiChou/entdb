SRC_SCAN = src/scan.c
SRC_INDEX = src/db.c src/indexer.c

SCAN = ./bin/scan
INDEX = ./bin/index

CFLAGS = -Iinclude -Wall -Werror
LDFLAGS = -fmodules -pthread -lsqlite3

scan: md $(SRC_SCAN)
	cc $(SRC_SCAN) $(CFLAGS) $(LDFLAGS) -o $(SCAN)

indexer: md $(SRC_INDEX)
	cc $(SRC_INDEX) $(CFLAGS) $(LDFLAGS) -o $(INDEX)

md:
	mkdir -p bin

format:
	clang-format -i $(SRC_SCAN) $(SRC_INDEX)

all: scan indexer
