"""
ASGI entrypoint. Configures Django and then runs the application
defined in the ASGI_APPLICATION setting.
"""

import os

from django.conf.urls import url
from django.core.asgi import get_asgi_application

# Fetch Django ASGI application early to ensure AppRegistry is populated
# before importing consumers and AuthMiddlewareStack that may import ORM
# models.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ScheduleQ.settings")
django_asgi_app = get_asgi_application()


import django
from channels.routing import ProtocolTypeRouter, URLRouter
import django_eventstream
from channels.auth import AuthMiddlewareStack
import ScheduleQ.routing


application = ProtocolTypeRouter({
    'http': URLRouter([
        url(r'^events/', AuthMiddlewareStack(
            URLRouter(django_eventstream.routing.urlpatterns)
        ), { 'channels': ['test'] }),
        url(r'', django_asgi_app),
    ]),
})