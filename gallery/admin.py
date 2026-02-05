from django.contrib import admin

from django.contrib import admin
from .models import Asset # Импортируем наш класс
# Регистрируем
admin.site.register(Asset)
