DROP TABLE IF EXISTS "os";
DROP TABLE IF EXISTS "bin";
DROP TABLE IF EXISTS "bin_osid";
DROP TABLE IF EXISTS "pair";
DROP TABLE IF EXISTS "pair_binid";

CREATE TABLE "os" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "name" VARCHAR(32) NOT NULL,
    "build" VARCHAR(32) NOT NULL,
    "devices" TEXT,
    "version" VARCHAR(32) NOT NULL);

CREATE TABLE "bin" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "osid" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "xml" TEXT NOT NULL,
    "json" TEXT NOT NULL,
    UNIQUE("osid", "path") ON CONFLICT REPLACE
    FOREIGN KEY ("osid") REFERENCES "os" ("id"));

CREATE INDEX "bin_osid" ON "bin" ("osid");

CREATE TABLE "pair" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "binid" INTEGER NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "value" TEXT NOT NULL,
    UNIQUE("binid", "key") ON CONFLICT REPLACE
    FOREIGN KEY ("binid") REFERENCES "bin" ("id"));

CREATE INDEX "pair_binid" ON "pair" ("binid");
