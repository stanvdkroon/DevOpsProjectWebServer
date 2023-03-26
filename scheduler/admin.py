from django.contrib import admin
from scheduler.models import Person, Project, Availability, Commission

# Register your models here.
admin.site.register(Person)
admin.site.register(Project)
admin.site.register(Availability)
admin.site.register(Commission)