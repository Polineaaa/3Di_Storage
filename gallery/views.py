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
    search_query = (request.GET.get('q') or '').strip()
    ordering = request.GET.get('ordering', 'new')
    days = request.GET.get('days')

    assets_qs = Asset.objects.all()

    # 1) Фильтр по дате
    if days:
        try:
            days_int = int(days)
            assets_qs = assets_qs.filter(created_at__gte=timezone.now() - timedelta(days=days_int))
        except ValueError:
            pass

    # 2) Сортировка
    if ordering == 'old':
        assets_qs = assets_qs.order_by('created_at')
    elif ordering == 'name':
        assets_qs = assets_qs.order_by('title')
    else:
        assets_qs = assets_qs.order_by('-created_at')

    # 3) Поиск
    if search_query:
        q = search_query.casefold()
        assets_list = [a for a in assets_qs if q in (a.title or '').casefold()]
    else:
        assets_list = list(assets_qs)

    # 4) Пагинация (9)
    paginator = Paginator(assets_list, 9)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    return render(request, 'gallery/index.html', {
        'page_title': 'Главная Галерея',
        'page_obj': page_obj,
    })


def about(request):
    return render(request, 'gallery/about.html')


def upload(request):
    if request.method == 'POST':
        form = AssetForm(request.POST, request.FILES)
        if form.is_valid():
            new_asset = form.save(commit=False)

            image_data = (request.POST.get('image_data') or '').strip()
            if image_data and ';base64,' in image_data:
                header, b64data = image_data.split(';base64,', 1)

                ext = 'jpg'
                try:
                    mime = header.split(':', 1)[1]          # image/png / image/jpeg
                    ext = mime.split('/')[-1].lower()       # png / jpeg
                except Exception:
                    ext = 'jpg'

                if ext == 'jpeg':
                    ext = 'jpg'
                if ext not in ('jpg', 'png', 'webp'):
                    ext = 'jpg'

                try:
                    binary = base64.b64decode(b64data)
                    file_name = f"{new_asset.title}_thumb.{ext}"
                    new_asset.image.save(file_name, ContentFile(binary), save=False)
                except Exception:
                    pass

            new_asset.save()
            messages.success(request, f'Модель "{new_asset.title}" успешно загружена!')
            return redirect('home')
    else:
        form = AssetForm()

    return render(request, 'gallery/upload.html', {'form': form})


# ====== ВОТ ЭТО ВАЖНО: ПЕРЕГЕНЕРАЦИЯ ДЛЯ ВСЕХ ======

@staff_member_required
def regen_previews(request):
    """
    Показываем ВСЕ модели, у которых есть файл, даже если превью уже существует.
    """
    assets = (
        Asset.objects
        .filter(file__isnull=False)
        .exclude(file='')
        .order_by('-created_at')
    )
    return render(request, 'gallery/regen_previews.html', {'assets': assets})


@require_POST
@staff_member_required
def save_preview(request, asset_id):
  
    try:
        asset = Asset.objects.get(id=asset_id)
    except Asset.DoesNotExist:
        return JsonResponse({'ok': False, 'error': 'Asset not found'}, status=404)

    image_data = (request.POST.get('image_data') or '').strip()

    if ';base64,' not in image_data:
        return JsonResponse({'ok': False, 'error': 'Bad dataURL format'}, status=400)

    header, b64data = image_data.split(';base64,', 1)

    ext = 'png'
    try:
        mime = header.split(':', 1)[1]           # image/png
        ext = mime.split('/')[-1].lower()        # png / jpeg
    except Exception:
        ext = 'png'

    if ext == 'jpeg':
        ext = 'jpg'
    if ext not in ('jpg', 'png', 'webp'):
        ext = 'png'

    try:
        binary = base64.b64decode(b64data)
    except Exception:
        return JsonResponse({'ok': False, 'error': 'Base64 decode failed'}, status=400)

    filename = f'preview_{asset.id}.{ext}'
    asset.image.save(filename, ContentFile(binary), save=True)

    return JsonResponse({'ok': True})
