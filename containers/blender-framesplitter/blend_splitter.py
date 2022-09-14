import bpy
import os
import json
import sys

blendfile = sys.argv[6].rstrip(".blend")
pfs_source = sys.argv[7]
presplit = f'{pfs_source}/{blendfile}'

blend_params = {
    "preffered_X_tile": 256,
    "preffered_Y_tile": 256,
}

pref_tile_x = blend_params["preffered_X_tile"]
pref_tile_y = blend_params["preffered_Y_tile"]


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
    job_tiles_rqd = []
    x_index = 0
    y_index = 0
    startx = 0
    starty = 0
    while starty < act_y:
        interim_y_index = y_index
        interim_y = starty
        starty += pref_tile_y
        y_index += 1
        if starty > act_y:
            starty = int(act_y)
        startx = 0
        x_index = 0
        while startx < act_x:
            interim_x = startx
            interim_x_index = x_index
            startx += pref_tile_x
            x_index += 1
            if startx > act_x:
                startx = int(act_x)
            job_tiles_rqd.append(
                {
                    "jobId": blendfile,
                    "frame": str(i),
                    "startX": interim_x,
                    "startY": interim_y,
                    "endX": startx,
                    "endY": starty,
                    "outFilename": "f-######-x-"
                    + str(interim_x_index)
                    + "-y-"
                    + str(interim_y_index),
                    "locX": str(interim_x_index),
                    "locY": str(interim_y_index),
                }
            )
    frames[str(i)] = {"tiles": job_tiles_rqd}


job_id = 0
for value in frames.values():
    for j in value["tiles"]:
        j["file"] = presplit
        if not os.path.exists(f"/pfs/out/{blendfile}"):
            os.makedirs(f"/pfs/out/{blendfile}")
        with open(f"/pfs/out/{blendfile}/" + "{:09d}".format(job_id), "w") as f:
            f.write(json.dumps(j, indent=4))
        job_id += 1