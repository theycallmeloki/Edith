FROM python:3.8-alpine

WORKDIR /app

ADD . /app

RUN apk add g++ python3-dev libffi-dev openssl-dev py3-wheel

RUN python3 -m pip install --upgrade pip

RUN python3 -m pip install --upgrade setuptools

RUN python3 -m pip install requests quart quart-cors moment python_pachyderm

CMD ["python3" ,"/app/server.py"]