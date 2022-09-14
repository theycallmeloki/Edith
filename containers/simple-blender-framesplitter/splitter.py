import os
import subprocess
import sys

pfs_source = f"/pfs/{sys.argv[1]}"

print('pfs_source ', pfs_source)

def split_blend(source):
    print(source)
    job_id = source.split("/")[-1]

    subprocess.run(
        [
            "/bin/blender",
            "-b",
            source,
            "-P",
            "blend_splitter.py",
            "--",
            job_id,
            pfs_source,
        ]
    )

for dirpath, dirs, files in os.walk(pfs_source):
    for file in files:
        print(os.path.join(dirpath, file))
        split_blend(os.path.join(dirpath, file))