# routes/__init__.py
"""
Package routes pour la refactorisation d'app.py
"""

from .documents import documents_bp
from .services import services_bp
from .static import static_bp
from .health import health_bp
from .admin import admin_bp

__all__ = [
    'documents_bp',
    'services_bp', 
    'static_bp',
    'health_bp',
    'admin_bp'
] 