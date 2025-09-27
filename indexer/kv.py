import json
from pathlib import Path


class KVStore:
    def __init__(self, records_path: Path, data_path: Path):
        self.records_path = records_path
        self.data_file = data_path.open("wb")
        self.cursor = 0

        self.records = []
        self.known_keys = set()

    def add(self, key: str, value: bytes):
        if key in self.known_keys:
            raise ValueError(f"Duplicate key {key}")

        self.records.append((key, self.cursor, len(value)))
        self.data_file.write(value)
        self.cursor += len(value)

    def close(self):
        with self.records_path.open("w") as fp:
            json.dump(self.records, fp, separators=(",", ":"))
        self.data_file.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.close()
