import copy
import csv
import json
import os
import time

from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from django_eventstream import send_event
from django.contrib import messages

from .helpers import user_authenticated
from .models import Project
from .scheduler import run_scheduler, run_project_stats


@user_authenticated
def create_project(request):
    return render(request, "scheduler/create_project.html")


@user_authenticated
def save_project(request):
    data = json.loads(request.POST.get('data'))

    name = data['name']
    columns = data['columns']
    order = data['order']
    schedule = data['data']

    project = Project.objects.filter(name=name, owner=request.user).first()
    if not project:
        config = data['config']
        project = Project.objects.create(name=name, owner=request.user,
                                         default_hours=config['default_hours'], 
                                         columns = columns,
                                         rows = order,
                                         schedule=schedule)
        project.save()
    else:
        project.schedule = data['data']
        project.save()

    messages.success(request, 'Project was saved successfully.')
    return JsonResponse({'status': "Success"}, status=200)


@user_authenticated
def projects_view(request):
    projects = request.user.projects.all()
    admin_projects = request.user.owned_project.all()

    return render(request, 'scheduler/projects.html', context={'owned_projects': admin_projects, 'projects': projects})


@user_authenticated
def get_project_json(request):
    project = Project.objects.get(id=request.GET.get('project'))

    return JsonResponse({'status': "Success", 'data': project.schedule, 'columns': project.columns, 'rows': project.rows, 'name': project.name}, status=200)


@user_authenticated
def get_result_json(request):
    project = Project.objects.get(id=request.GET.get('project'))

    staff = [member.username for member in project.assistants.all()]

    return JsonResponse({'status': "Success", 'data': project.result, 'columns': project.columns, 'rows': project.rows, 'name': project.name, 'staff': staff,
                         'logs': ""},
                        status=200)

@user_authenticated
def get_personal_result_json(request):
    project = Project.objects.get(id=request.GET.get('project'))

    # staff = [member.username for member in project.assistants.all()]

    return JsonResponse({'status': "Success", 'data': project.result, 'columns': project.columns, 'rows': project.rows, 'name': project.name, 'staff': request.user.username,
                         'logs': ""},
                        status=200)

@user_authenticated
def get_project_statistics(request):
    project = Project.objects.get(id=request.GET.get('project'))


    return JsonResponse({'status': "Success", 'stats': project.status},
                        status=200)


@ensure_csrf_cookie
@user_authenticated
def admin_project_view(request):
    if request.GET.get('project') is None:
        return 404

    project = Project.objects.get(id=request.GET.get('project'))
    return render(request, "scheduler/admin_project.html",
                  context={'project': project, 'staff': project.assistants.all()})


@user_authenticated
def create_project_statistics(request):
    if request.GET.get('project') is None:
        return JsonResponse({'status': "Failed"}, status=500)

    project = Project.objects.get(id=request.GET.get('project'))

    return JsonResponse({'status': "Success"}, status=200)

@user_authenticated
def create_schedule(request):
    if request.GET.get('project') is None:
        return JsonResponse({'status': "Failed"}, status=500)

    project = Project.objects.get(id=request.GET.get('project'))

    if project.status == "scheduling":
        return JsonResponse({'status': "Success"}, status=200)
    
    project.status = "scheduling"
    project.save()

    result = run_scheduler(project)

    project.result = result.get('schedule')
    project.status = "scheduled"
    project.save()

    return JsonResponse({'status': "Success", 'data': result}, status=200)

@user_authenticated
def update_schedule(request):
    data = json.loads(request.POST.get('data'))

    name = data['name']
    columns = data['columns']
    rows = data['order']
    values = data['data']

    project = Project.objects.filter(name=name, owner=request.user).first()

    if not project:
        return JsonResponse({'status': "Failure"}, status=500)

    project.schedule = values
    project.columns = columns
    project.rows = rows
    project.save()

    return JsonResponse({'status': "Success"}, status=200)