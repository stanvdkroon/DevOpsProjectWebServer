import django_eventstream
from django.urls import path, include

from . import availability_views
from . import project_views
from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("login_post", views.login_post, name="login_post"),
    path("register", views.register_view, name="register"),
    path("register_post", views.register_post, name="register_post"),
    path("get_login", views.get_login, name="get_login"),
    path("get_register", views.get_register, name="get_register"),
    path("logout", views.logout_view, name="logout"),
    path("save_project", project_views.save_project, name="save_project"),
    path("availability", availability_views.availability_view, name="availability"),
    path("get_project", project_views.get_project_json, name="get_project"),
    path("save_availability", availability_views.save_availability, name="save_availability"),
    path("get_availability_json", availability_views.get_availability_json, name="get_availability_json"),
    path("projects", project_views.projects_view, name="projects"),
    path("admin_project", project_views.admin_project_view, name="admin_project"),
    path("create_project", project_views.create_project, name="create_project"),
    path("add_assistant/<str:project_name>-<int:user_id>/<secret>/", views.add_assistant, name="add_assistant"),
    path("user_info", views.get_user_info, name="get_user_info"),
    path("save_period", views.save_period_count, name="save_period"),
    path("create_schedule", project_views.create_schedule, name="create_schedule"),
    path("update_schedule", project_views.update_schedule, name="update_schedule"),
    path("get_result_json", project_views.get_result_json, name="get_result"),
    path("get_personal_result_json", project_views.get_personal_result_json, name="get_personal_result"),
    path("create_project_statistics", project_views.create_project_statistics, name="create_project_statistics"),
    path("get_project_statistics", project_views.get_project_statistics, name="get_project_statistics"),
    path("get_messages", views.get_messages, name="get_messages")
]
