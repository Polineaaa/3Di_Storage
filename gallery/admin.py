from django.contrib import admin
from .models import Asset

@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):

    list_display = ('title', 'created_at', 'id')
  
    search_fields = ('title',)

    list_filter = ('created_at',)
  
    list_display_links = ('title',)