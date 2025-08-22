from pathlib import Path
from multiprocessing import Pool
import subprocess


dbs = Path('sqlite')
dbs.mkdir(exist_ok=True)


def worker(f: Path):
    models, version, build, _ = f.name.split('_', 4)
    db_name = f'{version}_{build}.db'
    cmd = ['ipsw', 'ent', '--sqlite', str(dbs / db_name), '--ipsw', str(f)]
    subprocess.call(cmd)


def main():
    ipsw = Path('ipsw')

    with Pool() as pool:
        pool.map(worker, ipsw.glob("*.ipsw"))


if __name__ == "__main__":
    main()
