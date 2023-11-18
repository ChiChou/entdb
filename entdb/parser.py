import mmap
import shutil
import subprocess

cli = shutil.which('codesign')
needle = b'Specifying \':\' in the path is deprecated and will not work in a future release'
cmd = ['codesign', '-d']

with open(cli, 'rb') as fp:
    mm = mmap.mmap(fp.fileno(), 0, prot=mmap.PROT_READ)
    idx = mm.find(needle)
    if idx > -1:
        cmd = cmd + ['--xml', '--entitlements', '-']
    else:
        cmd = cmd + ['--entitlements', ':-']
    mm.close()


def xml(path: str):
    try:
        return subprocess.check_output(cmd + [path]).strip(b'\x00')
    except subprocess.CalledProcessError:
        return b''
