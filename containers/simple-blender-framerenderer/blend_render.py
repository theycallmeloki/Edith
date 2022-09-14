import bpy
import sys
import json

job_id = sys.argv[10]
frame_id = sys.argv[11]
pfs_source_blends = sys.argv[12]
pfs_source_splitter = sys.argv[13]

f = json.loads(open(f'{pfs_source_splitter}/{job_id}/{frame_id}').read())

act_x = (bpy.data.scenes["Scene"].render.resolution_percentage / 100) * bpy.data.scenes[
    "Scene"
].render.resolution_x
act_y = (bpy.data.scenes["Scene"].render.resolution_percentage / 100) * bpy.data.scenes[
    "Scene"
].render.resolution_y
