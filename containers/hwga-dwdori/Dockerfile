FROM python:3.6-alpine

COPY . /app
WORKDIR /app

RUN python3 -m pip install --upgrade pip

RUN apk add build-base python3-dev py-pip jpeg-dev zlib-dev

ENV LIBRARY_PATH=/lib:/usr/lib

RUN python3 -m pip install flask flask_appbuilder python-dotenv flask_babelpkg werkzeug==0.16.1 flask_migrate Authlib requests boto3

EXPOSE 8080

CMD ["python3", "/app/run.py"]