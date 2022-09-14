from __future__ import unicode_literals
import youtube_dl
import sys
import json
import os

pfs_source = '/pfs/' + sys.argv[1]

ydl_opts = {
    'simulate': True,
    'quiet': True,
    'no_warnings': True,
}

def enrichMetaPhObj(file_loc, ph_file):
    ph_obj = json.loads(open(os.path.join(file_loc, ph_file)).read())
    try:
        with youtube_dl.YoutubeDL(ydl_opts) as ydl:
            j = ydl.extract_info(ph_obj['sourceUrl'])
            ph_obj['id'] = j['id']
            ph_obj['title'] = j['title']
            ph_obj['duration'] = j['duration']
            ph_obj['tags'] = j['tags']
            ph_obj['category'] = j['categories']
            print(json.dumps(ph_obj, indent=4))
            f = open("/pfs/out/" + ph_file, "w")
            f.write(json.dumps(ph_obj, indent=4))
            f.close()
    except:
        f = open("/pfs/out/" + ph_file, "w")
        f.write(json.dumps(ph_obj, indent=4))
        f.close()

for dirpath, dirs, files in os.walk(pfs_source):
    for file in files:
        print('enriching ' + file + ' with metadata')
        enrichMetaPhObj(dirpath, file)