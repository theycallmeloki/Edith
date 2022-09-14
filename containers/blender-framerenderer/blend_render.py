import bpy
import sys
import json

job_id = sys.argv[10]
tile_id = sys.argv[11]
pfs_source_blends = sys.argv[12]
pfs_source_splitter = sys.argv[13]

f = json.loads(open(f'{pfs_source_splitter}/{job_id}/{tile_id}').read())
start_x = float(f["startX"])
start_y = float(f["startY"])
end_x = float(f["endX"])
end_y = float(f["endY"])

act_x = (bpy.data.scenes["Scene"].render.resolution_percentage / 100) * bpy.data.scenes[
    "Scene"
].render.resolution_x
act_y = (bpy.data.scenes["Scene"].render.resolution_percentage / 100) * bpy.data.scenes[
    "Scene"
].render.resolution_y

bpy.data.scenes["Scene"].render.use_border = True
bpy.data.scenes["Scene"].render.use_crop_to_border = True
bpy.data.scenes["Scene"].render.tile_x = 32
bpy.data.scenes["Scene"].render.tile_y = 32


bpy.data.scenes["Scene"].render.border_min_x = start_x / act_x
bpy.data.scenes["Scene"].render.border_min_y = start_y / act_y
bpy.data.scenes["Scene"].render.border_max_x = end_x / act_x
bpy.data.scenes["Scene"].render.border_max_y = end_y / act_y

# Comment the following block to turn on compositing
# Caveat: You need to stitch the tiles together manually using blenders compositor

bpy.data.scenes["Scene"].use_nodes = False