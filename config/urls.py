from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
print("USING CONFIG URLS FROM:", __file__)
urlpatterns = [
    path('admin/', admin.site.urls),
]



# urls приложения
urlpatterns += [
    path('', include('gallery.urls')),
]

# статика через Django только в DEBUG=True (не обязательно, но можно)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
