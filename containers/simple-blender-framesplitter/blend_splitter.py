import bpy
import os
import json
import sys

print('argv ', sys.argv)

blendfile = sys.argv[6].rstrip(".blend")
pfs_source = sys.argv[7]
presplit = f'{pfs_source}/{blendfile}'

fstart = int(bpy.data.scenes["Scene"].frame_start)
fend = int(bpy.data.scenes["Scene"].frame_end)
act_x = (bpy.data.scenes["Scene"].render.resolution_percentage / 100) * bpy.data.scenes[
    "Scene"
].render.resolution_x
act_y = (bpy.data.scenes["Scene"].render.resolution_percentage / 100) * bpy.data.scenes[
    "Scene"
].render.resolution_y

frames = {}
for i in range(fstart, fend + 1):
    job_tiles_rqd = [{"jobId": blendfile, "frame": str(i), "outFilename": "f-######"}]
    frames[str(i)] = job_tiles_rqd

job_id = 0
for i, value in frames.items():
    for j in value:
        j["file"] = f'{presplit}.blend'
        if not os.path.exists(f"/pfs/out/{blendfile}"):
            os.makedirs(f"/pfs/out/{blendfile}")
        with open(f"/pfs/out/{blendfile}/" + "{:09d}".format(job_id), "w") as f:
            f.write(json.dumps(j, indent=4))
        job_id += 1
