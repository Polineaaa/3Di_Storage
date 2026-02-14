from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('about/', views.about, name='about'),
    path('upload/', views.upload, name='upload'),
    path('regen-previews/', views.regen_previews, name='regen_previews'),
    path('save-preview/<int:asset_id>/', views.save_preview, name='save_preview'),
]
