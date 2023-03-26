FROM python:3.7
WORKDIR /usr/src/app

RUN pip install --upgrade pip
RUN pip install pipenv

COPY Pipfile Pipfile.lock /usr/src/app/
RUN pipenv install --system


ADD . /usr/src/app/

ENTRYPOINT ["bash", "-c", "daphne -b 0.0.0.0 -p 80 ScheduleQ.asgi:application"]