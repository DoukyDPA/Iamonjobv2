#!/usr/bin/env python3
"""
Configuration de migration
"""

# Configuration de migration
MIGRATION_CONFIG = {
    # ====================================
    # ANCIEN SYSTÈME
    # ====================================
    'OLD_SYSTEM_URL': 'old_system_url_removed',
    
    # ====================================
    # SUPABASE (NOUVEAU)
    # ====================================
    'SUPABASE_URL': 'https://egzdkheenwmwunwkmzna.supabase.co',
    'SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnemRraGVlbndtd3Vud2ttem5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMTAwOTMsImV4cCI6MjA3MDU4NjA5M30.l8wMxWT1wqrAxDAp9dIFZcRnb10I1W3vFfipAckJvcM',
    'SUPABASE_SERVICE_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnemRraGVlbndtd3Vud2ttem5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwMTAwOTMsImV4cCI6MjA3MDU4NjA5M30.l8wMxWT1wqrAxDAp9dIFZcRnb10I1W3vFfipAckJvcM',
    
    # ====================================
    # CONFIGURATION MIGRATION
    # ====================================
    'MIGRATION_BATCH_SIZE': 100,
    'MIGRATION_DRY_RUN': False,
    'MIGRATION_BACKUP_ENABLED': True
}
