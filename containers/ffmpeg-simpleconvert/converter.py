import ffmpeg
import os
import subprocess
from subprocess import PIPE


def convert_job(job):
    tail = os.path.split(job)[1].rstrip(".mp4")

    output = subprocess.run(
        ["ffmpeg", "-i", job, "-c:v", "copy", "-c:a", "copy", os.path.join("/pfs/out", tail + ".mkv")],
        stdout=PIPE,
        stderr=PIPE,
    )

for dirpath, dirs, files in os.walk("/pfs/videos"):
    for file in files:
        convert_job(os.path.join(dirpath, file))