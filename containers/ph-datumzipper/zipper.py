import os
import shutil
import sys

pfs_source = "/pfs/" + sys.argv[1]

def make_archive(source, destination):
    base = os.path.basename(destination)
    name = base.split('.')[0]
    format = base.split('.')[1]
    archive_from = os.path.dirname(source)
    archive_to = os.path.basename(source.strip(os.sep))
    shutil.make_archive(name, format, archive_from, archive_to)
    shutil.move('%s.%s'%(name,format), destination)

make_archive(pfs_source, '/pfs/out/' + sys.argv[1] + '.zip')