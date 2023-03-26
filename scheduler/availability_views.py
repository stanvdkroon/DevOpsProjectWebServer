import csv
import json
import os

from django.http import JsonResponse
from django.shortcuts import render

from scheduler.helpers import user_authenticated
from scheduler.models import Project, Availability


@user_authenticated
def availability_view(request):
    if request.GET.get('project') is None:
        return 404

    project = Project.objects.get(id=request.GET.get('project'))
    return render(request, "scheduler/availability.html", context={'project': project})


@user_authenticated
def save_availability(request):
    data = json.loads(request.POST.get('data'))

    name = data['name']
    columns = data['columns']
    project = Project.objects.get(id=data['project_id'])

    availability = request.user.availability.filter(name=project.name).first()
    
    if not availability:
        availability = Availability.objects.create(name=name, project=project, schedule=data['data'])
        availability.person.add(request.user)
    else:
        availability.schedule = data['data']

    availability.save()

    return JsonResponse({'status': "Success"}, status=200)


@user_authenticated
def get_availability_json(request):
    data = json.loads(request.GET.get('data'))
    project_id = data['project']

    # Only admins should pass a different user_id from their own.
    if data.get('user_id'):
        project = request.user.owned_project.filter(id=project_id).first()

        if project is None:
            return JsonResponse({'status': "Failed", 'message': "No owned project for user"}, status=200)

        user = project.assistants.filter(id=data.get('user_id')).first()
    else:
        project = request.user.projects.filter(id=project_id).first()

        if project is None:
            return JsonResponse({'status': "Failed", 'message': "No project for user"}, status=200)

        user = request.user

    if not user:
        return JsonResponse({'status': "Failed", 'message': "No availability available"}, status=200)

    availability = user.availability.filter(name=project.name).first()

    if availability is None:
        return JsonResponse({'status': "Failed", 'message': "No availability available"}, status=200)

    return JsonResponse({'status': "Success", 'data': availability.schedule, 'columns': project.columns, 'rows': project.rows, 'name': availability.name}, status=200)
