from django.test import TestCase
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.db.utils import IntegrityError

from scheduler.views import get_project_json

# Create your tests here.
class UserTest(TestCase):
    def setUp(self):
        self.username = "test"
        self.email = "test@test.nl"
        self.password = "test"

        self.user = User.objects.create_user(self.username, self.email, self.password)

    def test_login_user(self):
        user = authenticate(username=self.username, password=self.password)
        self.assertEqual(user, self.user)

    def test_login_incorrect_password(self):
        user = authenticate(username=self.username, password="not_test")
        self.assertEqual(user, None)

    def test_register_duplicate_user(self):
        try:
            user = User.objects.create_user(self.username, self.email, self.password)
        except Exception as e:
            error = e
        self.assertEqual(type(error), IntegrityError)


class APITest(TestCase):
    def setUp(self):
        for fixture in ['categories.json', 'condiments.json', 'toppings.json', 'sizes.json', 'products.json']:
            management.call_command('loaddata', fixture, verbosity=0)

    def test_post(self):
        c = Client()
        response = c.post('/api/', {'item_id': '1'})

        self.assertEqual(response.status_code, 200)
        print(response.content)