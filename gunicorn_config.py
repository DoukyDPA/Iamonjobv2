# gunicorn_config.py
timeout = 120  # Augmentation du timeout à 120 secondes (2 minutes)
workers = 3    # Nombre de workers (ajustez selon vos besoins)
threads = 3    # Nombre de threads par worker
