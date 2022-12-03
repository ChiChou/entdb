import platform

os = platform.system()

if os != 'Darwin':
    raise RuntimeError('Unsupported OS %s' % os)
