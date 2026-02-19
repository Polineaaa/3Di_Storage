from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver
from django.core.files.storage import default_storage

from .models import Asset  # подставь свою модель

def _delete_file(file_field):
    if not file_field:
        return
    name = getattr(file_field, "name", None)
    if name and default_storage.exists(name):
        default_storage.delete(name)

@receiver(post_delete, sender=Asset)
def asset_files_delete_on_object_delete(sender, instance, **kwargs):
    # подставь имена полей в твоей модели
    _delete_file(getattr(instance, "model_file", None))
    _delete_file(getattr(instance, "thumbnail", None))
    _delete_file(getattr(instance, "preview", None))

@receiver(pre_save, sender=Asset)
def asset_files_delete_on_change(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        old = Asset.objects.get(pk=instance.pk)
    except Asset.DoesNotExist:
        return

    for field_name in ("model_file", "thumbnail", "preview"):
        old_file = getattr(old, field_name, None)
        new_file = getattr(instance, field_name, None)
        if old_file and old_file != new_file:
            _delete_file(old_file)
