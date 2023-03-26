from functools import wraps

from django.http import JsonResponse
from django.shortcuts import render


def user_authenticated(f):
    """
    Decorate routes to require login.

    http://flask.pocoo.org/docs/0.12/patterns/viewdecorators/
    """

    @wraps(f)
    def decorated_function(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return render(request, "scheduler/login.html", {"message": None})
        return f(request, *args, **kwargs)

    return decorated_function


def staff_member_required_json(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if request.user.is_staff:
            return view_func(request, *args, **kwargs)

        return JsonResponse([], safe=False, status=401)

    return wrapper
