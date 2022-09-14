FROM python:3.8-alpine

RUN python3 -m pip install --upgrade pip

RUN python3 -m pip install --upgrade setuptools

WORKDIR /app

ADD . /app

CMD ["python3", "/app/collector.py", "ghdatumindex"]
