import requests
from lxml import html
import re
import json
import sys
import os
import glob
import shutil

try:
    pfs_source_1 = "/pfs/" + sys.argv[1]
    pfs_source_2 = "/pfs/" + sys.argv[2]

    insights_path = glob.glob(os.path.join("/pfs/" + sys.argv[1], "*"))[0]
    meta_path = glob.glob(os.path.join("/pfs/" + sys.argv[2], "*"))[0]

    ip = json.loads(open(insights_path).read())
    mp = json.loads(open(meta_path).read())
    merged = dict()
    merged.update(ip)
    merged.update(mp)
    
    print(json.dumps(merged))

    fn = ""
    for i in os.listdir(pfs_source_1):
        fn = i
    f = open("/pfs/out/" + fn, "w")
    f.write(json.dumps(merged, indent=4))
    f.close()

    for dirpath, dirs, files in os.walk(pfs_source_1):
        for file in files:
            # print('enriching ' + file + ' with hotspot insight')
            # enrichInsightPhObj(dirpath, file)
            print(os.path.join(dirpath, file))

    for dirpath, dirs, files in os.walk(pfs_source_2):
        for file in files:
            # print('enriching ' + file + ' with hotspot insight')
            # enrichInsightPhObj(dirpath, file)
            print(os.path.join(dirpath, file))

except:
    pass