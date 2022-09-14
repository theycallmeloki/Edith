FROM python:3.5

WORKDIR /

RUN apt-get update && apt install -y libgl1-mesa-glx build-essential gcc make

RUN python -m pip install pip --upgrade

RUN python -m pip install numpy --upgrade

RUN python -m pip install wheel

RUN python -m pip install setuptools==49.6.0

ENV GRPC_PYTHON_BUILD_SYSTEM_ZLIB true

RUN python3 -m pip install --no-cache-dir  --force-reinstall -Iv grpcio==1.36.1

RUN python -m pip uninstall tensorboard-data-server

RUN python -m pip install tqdm>=4.2

RUN python -m pip install tensorflow==1.15.4

RUN python -m pip install opencv-python>=3.1.0

ADD ./ ./

RUN wget http://ndd.iti.gr/visil/ckpt.zip

RUN unzip ckpt.zip
