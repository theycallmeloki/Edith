FROM python:3.8-alpine

RUN apk add g++ python3-dev libffi-dev openssl-dev py3-wheel gcc libxslt-dev

RUN python3 -m pip install --upgrade pip

RUN python3 -m pip install --upgrade setuptools wheel

RUN python3 -m pip install requests quart quart-cors moment lxml

WORKDIR /app

ADD . /app

CMD ["python3", "/app/merger.py", "phmeta", "phinsights"]
