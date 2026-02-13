from django.db import models

from django.db import models
class Asset(models.Model):

    title = models.CharField(max_length=200, verbose_name="Название модели")

    file = models.FileField(upload_to='3d_assets/', verbose_name="3D Файл")
    image = models.ImageField(upload_to='thumbnails/', blank=True, null=True, 
verbose_name="Превью")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата загрузки")

    def __str__(self):
        return self.title
class Meta:
    verbose_name = "3D Модель"
    verbose_name_plural = "3D Модели"
