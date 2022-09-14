FROM jrottenberg/ffmpeg:4.1

RUN apt-get update

RUN apt-get install -y python3

RUN apt-get install -y python3-pip

RUN pip3 install ffmpeg-python

ADD converter.py /converter.py