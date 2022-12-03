from pathlib import Path
import sqlite3

cwd = Path(__file__).parent.parent
db = cwd / 'data.db'
conn = sqlite3.connect(db)


def init():
    sql = cwd / 'init.sql'
    with sql.open() as fp:
        conn.executescript(fp.read())

