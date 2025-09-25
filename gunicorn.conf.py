# gunicorn.conf.py
import os

# Serveur
bind = f"0.0.0.0:{os.environ.get('PORT', 8080)}"
workers = 1
threads = 2
worker_class = "sync"
worker_connections = 1000
timeout = 120
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Performance
preload_app = False
max_requests = 1000
max_requests_jitter = 100

# Sécurité
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190
