import json
from urllib.parse import quote_plus, quote

from django.contrib.auth import authenticate, login, logout
from django.db.utils import IntegrityError
from django.http import HttpResponseRedirect, JsonResponse, Http404
from django.shortcuts import render
from django.urls import reverse
from django.utils.http import urlencode
from django.views.decorators.csrf import ensure_csrf_cookie

from .helpers import user_authenticated
from .models import Person, Project


@ensure_csrf_cookie
def index(request):
    return HttpResponseRedirect(reverse("projects"))


def login_view(request):
    return render(request, "scheduler/login.html")


def login_post(request):
    username = request.POST["username"]
    password = request.POST["password"]
    user = authenticate(request, username=username, password=password)

    context = {'redirect': request.POST.get('redirect')}

    if user is None:
        context.update({'message': "Invalid credentials."})
        return render(request, "scheduler/login.html", context)

    login(request, user)

    if request.POST.get("redirect"):
        return HttpResponseRedirect(request.POST.get("redirect"), context)

    return HttpResponseRedirect(reverse("index"))


def register_view(request):
    return render(request, "scheduler/register.html")


def register_post(request):
    username = request.POST["username"]
    email = request.POST["email"]
    password = request.POST["password"]
    password_confirm = request.POST["password_confirmation"]

    context = {'redirect': request.POST.get('redirect')}

    if password != password_confirm:
        context.update({"message": "Passwords do not match."})
        return render(request, "scheduler/register.html", context)

    try:
        user = Person.objects.create_user(username=username, password=password, email=email)
    except IntegrityError:
        context.update({"message": "User already exists."})
        return render(request, "scheduler/register.html", context)

    user.save()
    login(request, user)

    if request.POST.get("redirect") != 'None':
        return HttpResponseRedirect(request.POST.get("redirect"), context)

    return HttpResponseRedirect(reverse("index"))


def get_login(request):
    context = {'redirect': request.POST.get('redirect')}
    return render(request, "scheduler/login.html", context)

def get_register(request):
    context = {'redirect': request.POST.get('redirect')}
    return render(request, "scheduler/register.html", context)


@user_authenticated
def get_user_info(request):
    data = json.loads(request.GET.get('data'))
    project_id = data['project']
    project = request.user.owned_project.filter(id=project_id).first()

    if project is None:
        return JsonResponse({'status': "Failed", 'message': "No owned project found"}, status=200)

    if data.get('user_id') is '':
        return JsonResponse({'status': "Failed", 'message': "No user to look up"}, status=200)

    user = project.assistants.filter(id=data.get('user_id')).first()

    if not user:
        return JsonResponse({'status': "Failed"}, status=204)

    data = {'hours': user.commission_set.get(project=project).hours}

    return JsonResponse({'status': "Success", 'data': data}, status=200)


@user_authenticated
def save_period_count(request):
    data = json.loads(request.POST.get('data'))
    try:
        project = request.user.owned_project.get(name=data['name'])
    except:
        return JsonResponse({'status': "Failed"}, status=200)

    user = Person.objects.get(id=data['user'])

    commission = user.commission_set.get(project=project)
    commission.hours = data['period_count']
    commission.save()

    return JsonResponse({'status': "Success"}, status=200)

def add_assistant(request, project_name, user_id, secret):
    if not request.user.is_authenticated:
        return render(request, "scheduler/register.html", {"redirect": quote(request.path)})

    try:
        project = Project.objects.get(name=project_name, owner=user_id, secret=secret)
    except Project.DoesNotExist:
        raise Http404

    project.assistants.add(request.user, through_defaults={})

    return HttpResponseRedirect(f"{reverse('availability')}?project={project.id}")


@user_authenticated
def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("login"))

def get_messages(request):
    storage = messages.get_messages(request)
    return JsonResponse({'messages': storage, 'status': "Success"}, status=200)