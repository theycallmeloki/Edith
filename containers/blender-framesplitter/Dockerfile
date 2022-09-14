FROM nytimes/blender:2.92-cpu-ubuntu18.04

RUN apt-get update

RUN apt-get install -y python3 curl python3-pip 

RUN pip3 install --upgrade pip

RUN pip3 install opencv-python requests imutils numpy pyminizip

ADD blend_splitter.py /blend_splitter.py

ADD splitter.py /splitter.py