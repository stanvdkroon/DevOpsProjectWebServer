from uuid import uuid4

from django.contrib.auth.models import AbstractUser
from django.contrib.postgres.fields import JSONField, ArrayField

from django.db import models

import os


class Project(models.Model):
    name = models.CharField(max_length=64, unique=True)
    owner = models.ForeignKey('Person', on_delete=models.CASCADE, related_name='owned_project')
    assistants = models.ManyToManyField('Person', through='Commission', related_name='projects')
    
    columns = ArrayField(models.CharField(max_length=16))
    rows = ArrayField(models.CharField(max_length=16))
    schedule = JSONField()
    result = JSONField(null=True, blank=True)

    secret = models.fields.UUIDField(default=uuid4)
    default_hours = models.IntegerField(default=0)
    status = models.CharField(max_length=16, blank=True)


    class Meta:
        unique_together = ('name', 'owner')

    def __str__(self):
        return f"{self.id}, {self.name}"


class Commission(models.Model):
    person = models.ForeignKey('Person', on_delete=models.CASCADE)
    project = models.ForeignKey('Project', on_delete=models.CASCADE)
    _hours = models.IntegerField(null=True)

    @property
    def hours(self):
        if self._hours is None or self._hours < 0:
            return self.project.default_hours
        return self._hours

    @hours.setter
    def hours(self, hours):
        self._hours = hours


class Availability(models.Model):
    name = models.CharField(max_length=64)
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    schedule = JSONField()
    count = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.id}, {self.name}"


class Config(models.Model):
    name = models.CharField(max_length=64)
    project = models.ForeignKey(Project, related_name='config', on_delete=models.CASCADE)
    file_path = models.CharField(max_length=64)

    def __str__(self):
        return f"{self.id}, {self.name}"


class Organization(models.Model):
    persons = models.ManyToManyField('Person', related_name='organizations')


class Person(AbstractUser):
    availability = models.ManyToManyField('Availability', related_name='person')
