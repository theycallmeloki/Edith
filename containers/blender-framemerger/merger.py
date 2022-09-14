import os
import sys
import re
import cv2

pfs_source_renderer = f"/pfs/{sys.argv[1]}"

def getXList(tiles):
    mergeFrame = {}

    for i in tiles:
        if i["x"] not in mergeFrame:
            mergeFrame[i["x"]] = []

        mergeFrame[i["x"]].append(i["file"])

    return mergeFrame


def getYList(xs):
    return [sorted(xs[j], reverse=True) for j in xs.keys()]


def verticalImageMerger(xList, job_id):
    vmerge = [cv2.imread(f'{pfs_source_renderer}/{job_id}/{i}') for i in xList]
    return cv2.vconcat(vmerge)


def horizontalImageMerger(yList):
    hmerge = list(yList)
    return cv2.hconcat(hmerge)


def positionDeterminer(f):
    toJson = {"file": f}
    r = re.search("f-\\d+", f)
    if r:
        rraw = r.group()
        toJson["frame"] = rraw.split("f-")[1]
    x = re.search("x-\\d+", f)
    if x:
        xraw = x.group()
        toJson["x"] = xraw.split("x-")[1]
    y = re.search("y-\\d+", f)
    if y:
        yraw = y.group()
        toJson["y"] = yraw.split("y-")[1]
    e = f.split(".")[1]
    if e:
        toJson["ext"] = e

    return toJson

def frameMerger(dirlist):
    merges = {}
    for i in sorted(dirlist):
        res = positionDeterminer(i)

        if res["frame"] not in merges:
            merges[res["frame"]] = {}

        if "tiles" not in merges[res["frame"]]:
            merges[res["frame"]]["tiles"] = []

        if "ext" not in merges[res["frame"]]:
            merges[res["frame"]]["ext"] = res["ext"]

        interimres = {"x": res["x"], "y": res["y"], "file": res["file"]}
        merges[res["frame"]]["tiles"].append(interimres)

    return merges

def merge_tiles(merge_folder, job_id):
    if not os.path.exists(f"/pfs/out/{job_id}"):
        os.makedirs(os.path.join("/pfs/out", job_id))
    fm = frameMerger(merge_folder)
    for i in fm.keys():
        print(f"Merged {i}")
        print("To: " + "/pfs/out/" + job_id + "/" + i + "." + fm[i]["ext"])
        xs = getXList(fm[i]["tiles"])
        rxs = getYList(xs)

        vheld = [verticalImageMerger(j, job_id) for j in rxs]
        full_img = horizontalImageMerger(vheld)
        cv2.imwrite(f"/pfs/out/{job_id}/{i}." + fm[i]["ext"], full_img)

for i in os.listdir(pfs_source_renderer):
    if os.path.isdir(f'{pfs_source_renderer}/{i}'):
        merge_tiles(os.listdir(f'{pfs_source_renderer}/{i}'), i)
