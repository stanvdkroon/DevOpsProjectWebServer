import json
import os

import requests


def run_scheduler(project):
    config = {
        "staff": [ 
            {
                "name": member.get_username(),
                "id": member.id,
                "periods": member.commission_set.get(project=project).hours,
                "schedule": member.availability.get(person=member, project=project).schedule
            } for member in project.assistants.all()
        ], 
        "project": {
            "rows": project.rows,
            "columns": project.columns,
            "schedule": project.schedule
        }
    }

    r = requests.post(os.environ.get('AZURE_FUNCTION'), data=json.dumps(config))

    return r.json()


def run_project_stats(project):
    config = {"staff": {}, "owner_id": project.owner_id, "project_name": project.name}

    for member in project.assistants.all():
        config["staff"][member.id] = {
            "name": member.get_username(),
            "periods": member.commission_set.get(project=project).hours,
        }

    with open(project.dir_path + "config.json", "w") as config_file:
        config_file.write(json.dumps(config))

    client = docker.from_env()
    volume = client.volumes.get("scheduleq_scheduleQ_data").name
    volumes = {volume: {"bind": "/data", "mode": "rw"}}

    container = client.containers.run(
        "scheduler",
        remove=True,
        volumes=volumes,
        detach=True,
        command=f"python get_statistics.py '{project.name}' {project.owner_id}",
    )
    try:
        container.wait()
    except JobTimeoutException as e:
        container.stop()
        raise e

    return True
