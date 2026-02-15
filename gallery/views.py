from django.shortcuts import render, redirect
from .models import Asset
from .forms import AssetForm
import base64
from django.http import JsonResponse
from django.core.files.base import ContentFile 
from django.views.decorators.http import require_POST
from django.contrib.admin.views.decorators import staff_member_required
from django.utils import timezone
from datetime import timedelta
from django.core.paginator import Paginator
from django.contrib import messages 

def home(request):
    # 1. Получаем параметры из URL (GET-запроса)
    # Если параметра нет, вернет None (или пустую строку, если мы так настроили)
    search_query = request.GET.get('q', '')
    ordering = request.GET.get('ordering', 'new') # По умолчанию 'new'
    # 2. Базовый запрос: Берем ВСЕ
    assets = Asset.objects.all()
    # 3. Применяем поиск (если пользователь что-то ввел)
    if search_query:
  
        assets = assets.filter(title__icontains=search_query)
    # 4. Применяем сортировку
    if ordering == 'old':
        assets = assets.order_by('created_at') # От старых к новым
    elif ordering == 'name':
        assets = assets.order_by('title')      # По алфавиту
    else:
        # По умолчанию (new) - свежие сверху
        assets = assets.order_by('-created_at')
    days = request.GET.get('days')

    if days:
        try:
            days = int(days)
            assets = assets.filter(
                created_at__gte=timezone.now() - timedelta(days=days)
            )
        except ValueError:
            pass

    paginator = Paginator(assets, 8) 
# Получаем номер страницы из URL (например, ?page=2)
    page_number = request.GET.get('page')
    # Получаем конкретный кусочек данных (объект Page)
    page_obj = paginator.get_page(page_number)
    context_data = {
    'page_title': 'Главная Галерея',
    # 'assets': assets,  <-- ЭТУ СТРОКУ УДАЛИТЬ!
    'page_obj': page_obj, # <-- ВМЕСТО НЕЁ ЭТУ
    }
    return render(request, 'gallery/index.html', context_data)

def about(request):
    return render(request, 'gallery/about.html')
def upload(request):
    if request.method == 'POST':
        form = AssetForm(request.POST, request.FILES)
        if form.is_valid():
            # 1. Создаем объект, но пока НЕ сохраняем в базу (commit=False)
            new_asset = form.save(commit=False)
            
            # 2. Обрабатываем картинку из скрытого поля
            image_data = request.POST.get('image_data') # Получаем строку Base64
            
            if image_data:
                # Формат строки: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
                # Нам нужно отрезать заголовок "data:image/jpeg;base64,"
                format, imgstr = image_data.split(';base64,') 
                ext = format.split('/')[-1] # получаем "jpeg"
                
                # Декодируем текст в байты
                data = base64.b64decode(imgstr)
                
                # Создаем имя файла (берем имя модели + .jpg)
                file_name = f"{new_asset.title}_thumb.{ext}"
                
                # Сохраняем байты в поле image
                # ContentFile превращает байты в объект, который понимает Django FileField
                new_asset.image.save(file_name, ContentFile(data), save=False)
            # 3. Финальное сохранение в БД
            new_asset.save()
            messages.success(request, f'Модель "{new_asset.title}" успешно загружена!')
            
        
            return redirect('home')
    else:
        form = AssetForm()
    return render(request, 'gallery/upload.html', {'form': form})
@staff_member_required
def regen_previews(request):
    # Берём только те, у кого нет превью
    assets = Asset.objects.filter(image__isnull=True).order_by('-created_at')
    return render(request, 'gallery/regen_previews.html', {'assets': assets})


@require_POST
@staff_member_required
def save_preview(request, asset_id):
    """
    Принимает image_data = 'data:image/jpeg;base64,...' и сохраняет в Asset.image
    """
    try:
        asset = Asset.objects.get(id=asset_id)
    except Asset.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'Asset not found'}, status=404)

    image_data = request.POST.get('image_data', '')
    if image_data and ';base64,' in image_data:
        header, imgstr = image_data.split(';base64,', 1)
        ext = header.split('/')[-1]
     

    # Ожидаем формат: data:image/jpeg;base64,....
    if ';base64,' not in image_data:
        return JsonResponse({'ok': False, 'error': 'Bad dataURL format'}, status=400)

    header, b64data = image_data.split(';base64,', 1)

    # header: data:image/jpeg
    try:
        mime = header.split(':', 1)[1]  # image/jpeg
        ext = mime.split('/')[-1]       # jpeg
    except Exception:
        ext = 'jpg'

    try:
        binary = base64.b64decode(b64data)
    except Exception:
        return JsonResponse({'ok': False, 'error': 'Base64 decode failed'}, status=400)

    filename = f'preview_{asset.id}.{ "jpg" if ext in ("jpeg", "jpg") else ext }'
    asset.image.save(filename, ContentFile(binary), save=True)

    return JsonResponse({'ok': True})