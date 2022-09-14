import requests
from lxml import html
import re
import json
import sys
import os

pfs_source = f"/pfs/{sys.argv[1]}"

def createPhObj(ph_file_url):
    sfname = ph_file_url.split('/')[-1].rstrip('.txt')
    print(sfname)
    for i in open(ph_file_url):
        fr = i.rstrip('\n')
        tw = {'sourceUrl': fr}
        print('fullurl', fr)
        # tw['sourceCategory'] = 'sfname'
        l = re.search("=.+", fr)
        fname = l.group()[1:]
        with open(f"/pfs/out/{fname}", "w") as f:
            f.write(json.dumps(tw, indent=4))
        
for dirpath, dirs, files in os.walk(pfs_source):
    for file in files:
        print(file)
        createPhObj(os.path.join(dirpath, file))