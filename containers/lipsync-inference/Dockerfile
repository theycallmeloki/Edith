FROM ubuntu:18.04

RUN export DEBIAN_FRONTEND=noninteractive RUNLEVEL=1 ; \
     apt-get update && apt-get install -y --no-install-recommends \
          build-essential cmake git curl ca-certificates \
          vim \
          python3-pip python3-dev python3-wheel \
          libglib2.0-0 libxrender1 python3-soundfile \
          ffmpeg && \
	rm -rf /var/lib/apt/lists/* && \
     pip3 install --upgrade setuptools

WORKDIR /app
RUN chmod -R a+w /app

RUN python3 -m pip install --upgrade pip

RUN python3 -v -m pip install librosa==0.7.0 numpy==1.17.1 opencv-contrib-python>=4.2.0.34 opencv-python==4.1.0.25 torch==1.1.0 torchvision==0.3.0 tqdm==4.45.0 numba==0.48

RUN mkdir -p /app/face_detection/detection/sfd

RUN curl -o /app/face_detection/detection/sfd/s3fd.pth https://www.adrianbulat.com/downloads/python-fan/s3fd-619a316812.pth

# RUN export DEBIAN_FRONTEND=noninteractive RUNLEVEL=1 ; \
# 	apt-get update && apt-get install -y --no-install-recommends \
#           nvidia-driver-450 mesa-utils && \
# 	rm -rf /var/lib/apt/lists/*

ADD inference.py /app/inference.py


