from django.shortcuts import render
from .models import Asset
def home(request):
    # ORM Запрос: "Дай мне все объекты Asset из базы"
    assets = Asset.objects.all()
    context_data = {
        'page_title': 'Главная Галерея',
        'assets': assets, # Передаем реальный QuerySet (список)
    }
    return render(request, 'gallery/index.html', context_data)

def about(request):
    return render(request, 'gallery/about.html')