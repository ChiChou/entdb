import plistlib
import json
import sqlite3

from pathlib import Path


class Writer:
    def __init__(
        self,
        path: str,
        name: str,
        build: str,
        version: str,
        devices: list[str] | None = None,
    ):
        self.path = path
        self.devices = devices or []
        self.conn = sqlite3.connect(self.path)

        self.create_tables()
        self.osid = self._insert_os(name, build, version)

    def create_tables(self):
        sql_file = Path(__file__).parent / "schema.sql"

        with open(sql_file, "r") as fp:
            sql_script = fp.read()

        self.conn.executescript(sql_script)
        self.conn.commit()

    def _insert_os(self, name: str, version: str, build: str) -> int:
        cursor = self.conn.execute(
            "SELECT id FROM os WHERE name=? AND version=? AND build=?",
            (name, version, build),
        )
        row = cursor.fetchone()
        if row:
            osid, *_ = row
            return osid

        cursor = self.conn.execute(
            "INSERT INTO os (name, version, build, devices) VALUES (?, ?, ?, ?)",
            (name, version, build, json.dumps(self.devices)),
        )
        self.conn.commit()
        osid = cursor.lastrowid
        assert osid is not None, "Failed to insert OS entry"
        return osid

    def insert(self, path: str, xml: bytes):
        if not len(xml):
            return

        d = plistlib.loads(xml)
        j = json.dumps(d)

        cursor = self.conn.execute(
            "INSERT INTO bin (osid, path, xml, json) VALUES (?, ?, ?, ?)",
            (self.osid, path, xml, j),
        )

        binid = cursor.lastrowid
        assert binid is not None, "failed to insert row for path {path}"

        for key, val in d.items():
            self.conn.execute(
                "INSERT INTO pair (binid, key, value) VALUES (?, ?, ?)",
                (binid, key, json.dumps(val)),
            )

        self.conn.commit()


class Reader:
    def __init__(self, path: str):
        self.path = path
        self.conn = sqlite3.connect(self.path)

    def metadata(self, build: str):
        cursor = self.conn.execute(
            "SELECT name, version, devices FROM os WHERE build=?", (build,)
        )
        name, version, devices = cursor.fetchone()
        return dict(name=name, build=build, version=version, devices=json.loads(devices))

    def paths(self, build: str) -> list[str]:
        cursor = self.conn.execute(
            """
            SELECT path FROM bin JOIN os ON bin.osid=os.id
            WHERE os.build=?""",
            (build,),
        )
        return [row[0] for row in cursor.fetchall()]

    def keys(self, build: str):
        cursor = self.conn.execute(
            """
            SELECT distinct key FROM pair JOIN bin ON pair.binid=bin.id
            JOIN os ON bin.osid=os.id WHERE os.build=?""",
            (build,),
        )
        return [row[0] for row in cursor.fetchall()]
