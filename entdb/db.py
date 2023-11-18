from pathlib import Path
import sqlite3

cwd = Path(__file__).parent.parent


def connect(name: str = 'data.db') -> sqlite3.Connection:
    return sqlite3.connect(name)


def init(name: Path | None):
    sql = cwd / 'init.sql'
    conn = connect(name)
    with sql.open() as fp:
        conn.executescript(fp.read())
