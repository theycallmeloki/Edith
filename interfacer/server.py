import requests
from quart import Quart, request
import json
import copy
from datetime import datetime
import moment
import asyncio
import os
from time import sleep
import uuid
from quart_cors import cors
import python_pachyderm


#////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
#// Configuration
#////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

pachd_address = "" # usually it'll be the one that ends with 30650
dblend_image = "" # a container image that has all the dependencies for distributed blender (psst! new york times maintains one!)

#////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
#// Initializations
#////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app = Quart(__name__)
app = cors(app, allow_origin="*")
app.config["MAX_CONTENT_LENGTH"] = 100 * 1000 * 1000

client = python_pachyderm.Client.new_from_pachd_address(pachd_address)

@app.route("/uploadBlend", methods=["POST"])
async def uploadBlend():
    jobs = []
    for name, file in (await request.files).items():
        print("Filename: " + name)
        t = name.split(".")
        t.pop()
        prejobfilename = "".join(t) + ".blend"
        new_job_id = str(uuid.uuid4())
        jobs.append(new_job_id)
        new_job_filename = new_job_id + ".blend"
        print(new_job_id)
        actual_file = file.read()
        print("Size: " + str(len(actual_file)))
        with open("/var/www/html/blends/" + new_job_filename, "wb") as reader:
            reader.write(actual_file)

        blends = new_job_id + "-blends"
        splitter = new_job_id + "-splitter"
        renderer = new_job_id + "-renderer"
        merger = new_job_id + "-merger"
        watermarker = new_job_id + "-watermarker"
        unenczipper = new_job_id + "-unenczipper"
        enczipper = new_job_id + "-enczipper"
        megazipper = new_job_id + "-megazipper"
        client.create_repo(blends)

        with client.commit(blends, "master") as commit:
            client.put_file_bytes(
                commit,
                "/" + new_job_id,
                open("/var/www/html/blends/" + new_job_filename, "rb"),
            )
            os.remove("/var/www/html/blends/" + new_job_filename)

        client.create_repo(splitter)
        client.create_pipeline(
            splitter,
            transform=python_pachyderm.Transform(
                cmd=["python3", "/brorender.py", "split", blends],
                image=dblend_image,
                image_pull_secrets=["laneonekey"],
            ),
            input=python_pachyderm.Input(
                pfs=python_pachyderm.PFSInput(glob="/*", repo=blends)
            ),
        )

        client.create_repo(renderer)
        client.create_pipeline(
            renderer,
            transform=python_pachyderm.Transform(
                cmd=["python3", "/brorender.py", "render", blends, splitter],
                image=dblend_image,
                image_pull_secrets=["laneonekey"],
            ),
            input=python_pachyderm.Input(
                cross=[
                    python_pachyderm.Input(
                        pfs=python_pachyderm.PFSInput(glob="/*", repo=blends)
                    ),
                    python_pachyderm.Input(
                        pfs=python_pachyderm.PFSInput(glob="/*/*", repo=splitter)
                    ),
                ]
            ),
            parallelism_spec=python_pachyderm.ParallelismSpec(coefficient=1),
            resource_requests=python_pachyderm.ResourceSpec(cpu=2),
        )

        client.create_repo(merger)
        client.create_pipeline(
            merger,
            transform=python_pachyderm.Transform(
                cmd=["python3", "/brorender.py", "merge", renderer],
                image=dblend_image,
                image_pull_secrets=["laneonekey"],
            ),
            input=python_pachyderm.Input(
                pfs=python_pachyderm.PFSInput(glob="/*/", repo=renderer)
            ),
        )

        client.create_repo(enczipper)
        client.create_pipeline(
            enczipper,
            transform=python_pachyderm.Transform(
                cmd=["python3", "/brorender.py", "enczip", merger],
                image=dblend_image,
                image_pull_secrets=["laneonekey"],
            ),
            input=python_pachyderm.Input(
                pfs=python_pachyderm.PFSInput(glob="/*/", repo=merger)
            ),
        )

        client.create_repo(watermarker)
        client.create_pipeline(
            watermarker,
            transform=python_pachyderm.Transform(
                cmd=["python3", "/brorender.py", "watermark", merger],
                image=dblend_image,
                image_pull_secrets=["laneonekey"],
            ),
            input=python_pachyderm.Input(
                pfs=python_pachyderm.PFSInput(glob="/*/", repo=merger)
            ),
        )

        client.create_repo(unenczipper)
        client.create_pipeline(
            unenczipper,
            transform=python_pachyderm.Transform(
                cmd=["python3", "/brorender.py", "unenczip", watermarker],
                image=dblend_image,
                image_pull_secrets=["laneonekey"],
            ),
            input=python_pachyderm.Input(
                pfs=python_pachyderm.PFSInput(glob="/*/", repo=watermarker)
            ),
        )

        client.create_repo(megazipper)
        client.create_pipeline(
            megazipper,
            transform=python_pachyderm.Transform(
                cmd=["python3", "/brorender.py", "megazip", enczipper, unenczipper],
                image=dblend_image,
                image_pull_secrets=["laneonekey"],
            ),
            input=python_pachyderm.Input(
                join=[
                    python_pachyderm.Input(
                        pfs=python_pachyderm.PFSInput(
                            glob="/*", repo=unenczipper, branch="master"
                        )
                    ),
                    python_pachyderm.Input(
                        pfs=python_pachyderm.PFSInput(
                            glob="/*", repo=enczipper, branch="master"
                        )
                    ),
                ]
            ),
        )
    # return "Ack!"
    return json.dumps(jobs)


@app.route("/uploadZip", methods=["POST"])
async def uploadZip():
    for name, file in (await request.files).items():
        print("Filename: " + name)
        t = name.split(".")
        t.pop()
        prejobid = "".join(t)
        prejobfilename = "".join(t) + ".zip"
        actual_file = file.read()
        print("Size: " + str(len(actual_file)))
        with open("/var/www/html/zips/" + prejobfilename, "wb") as reader:
            reader.write(actual_file)

        blends = prejobid + "-blends"
        splitter = prejobid + "-splitter"
        renderer = prejobid + "-renderer"
        merger = prejobid + "-merger"
        watermarker = prejobid + "-watermarker"
        unenczipper = prejobid + "-unenczipper"
        enczipper = prejobid + "-enczipper"
        megazipper = prejobid + "-megazipper"

        client.delete_repo(megazipper)
        client.delete_pipeline(megazipper)

        client.delete_repo(unenczipper)
        client.delete_pipeline(unenczipper)

        client.delete_repo(watermarker)
        client.delete_pipeline(watermarker)

        client.delete_repo(enczipper)
        client.delete_pipeline(enczipper)

        client.delete_repo(merger)
        client.delete_pipeline(merger)

        client.delete_repo(renderer)
        client.delete_pipeline(renderer)

        client.delete_repo(splitter)
        client.delete_pipeline(splitter)

        client.delete_repo(blends)
        print("Cleaned up job " + prejobid)

    return "Ack!"


app.run(host="0.0.0.0", ssl_context=("adhoc"))