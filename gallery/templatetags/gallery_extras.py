# gallery/templatetags/gallery_extras.py
from django import template
register = template.Library()
# Этот тег позволяет заменять один GET-параметр, сохраняя остальные
@register.simple_tag
def param_replace(request, **kwargs):
    # Копируем все параметры из текущего запроса (q, ordering...)
    d = request.GET.copy()
    # Заменяем или добавляем новые (например, page=2)
    for k, v in kwargs.items():
        d[k] = v
    # Возвращаем готовую строку для URL (q=test&ordering=new&page=2)
    return d.urlencode()