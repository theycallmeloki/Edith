import os
import sys
import json
import subprocess
import re

pfs_source_blends = f"/pfs/{sys.argv[1]}"
pfs_source_splitter = ""
try:
    pfs_source_splitter = f"/pfs/{sys.argv[2]}"
except:
    pass

def regexToJson(line):
    toJson = {}
    t = re.search("(Time[^\\s]+)", line)
    if t:
        traw = t.group(1)
        toJson["elapsed"] = traw.split("Time:")[1]
    r = re.search("(Remaining[^\\s]+)", line)
    if r:
        rraw = r.group(1)
        toJson["remaining"] = rraw.split("Remaining:")[1]
    f = re.search("(Fra[^\\s]+)", line)
    if f:
        fraw = f.group(1)
        toJson["frame"] = fraw.split("Fra:")[1]
    m = re.search("(Mem[^\\s]+)", line)
    if m:
        mraw = m.group(1)
        toJson["memory"] = mraw.split("Mem:")[1]
    p = re.search("(Peak[^\\s]+)", line)
    if p:
        praw = p.group(1)
        toJson["peak"] = praw.split("Peak:")[1]
    s = re.search("Rendered[\\s]\\d+[\\s\\S]\\d+[\\s]Tiles", line)
    if s:
        sraw = s.group()
        srawtile = sraw.split(" ")[1]
        toJson["progress"] = srawtile

    if (
        "elapsed" in toJson
        and "remaining" in toJson
        and "frame" in toJson
        and "memory" in toJson
        and "peak" in toJson
        and "progress" in toJson
    ):
        return toJson


def execute(cmd, tile_meta_data):
    print(cmd)
    popen = subprocess.Popen(cmd, stdout=subprocess.PIPE, universal_newlines=True)
    for stdout_line in iter(popen.stdout.readline, ""):
        yield stdout_line.rstrip("\n")
    popen.stdout.close()
    return_code = popen.wait()
    outfileloc_split = tile_meta_data["outfileloc"].split("/")
    outfile_split = outfileloc_split[4].split("-")
    outfile_split[1] = "{:06d}".format(int(tile_meta_data["frame"]))
    outfile = "-".join(outfile_split)
    outfileloc_split[4] = outfile
    if return_code:
        raise subprocess.CalledProcessError(return_code, cmd)

def render_blend(blend_source, job_source):
    print(sys.argv)
    print(job_source)
    frame_id = job_source.split("/")[4]
    print(frame_id)

    f = json.loads(open(job_source).read())
    job_id = f["jobId"]
    frame = f["frame"]
    out_filename = f["outFilename"]
    tile_meta = {
        "jobId": job_id,
        "frame": frame,
        "outfileloc": f"/pfs/out/{job_id}/{out_filename}",
    }

    for i in execute(["/bin/blender", "-b", blend_source, "-o", f"/pfs/out/{job_id}/{out_filename}", "-P", "blend_render.py", "-f", frame, "--", job_id, frame_id, pfs_source_blends, pfs_source_splitter], tile_meta):
        print(i)
        res = regexToJson(i)
        if res != None:
            res["jobId"] = job_id
            res["frame"] = frame
            print(res)


for dirpath, dirs, files in os.walk(pfs_source_splitter):
    for file in files:
        render_blend(
            f'{pfs_source_blends}/{os.listdir(pfs_source_blends)[0]}',
            os.path.join(dirpath, file),
        )