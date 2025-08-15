-- ====================================
-- SCHÉMA SUPABASE
-- ====================================
-- Exécuter ce script dans l'éditeur SQL de Supabase

-- ====================================
-- TABLE SESSIONS (remplace user_data:)
-- ====================================
CREATE TABLE IF NOT EXISTS sessions (
    id BIGSERIAL PRIMARY KEY,
    user_email TEXT UNIQUE NOT NULL,
    chat_history JSONB DEFAULT '[]'::jsonb,
    documents JSONB DEFAULT '{}'::jsonb,
    analyses JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_sessions_user_email ON sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at);

-- ====================================
-- TABLE UTILISATEURS (remplace admin:)
-- ====================================
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_admin ON users(is_admin);

-- ====================================
-- TABLE USAGE TOKENS (remplace tokens:daily/monthly)
-- ====================================
CREATE TABLE IF NOT EXISTS token_usage (
    id BIGSERIAL PRIMARY KEY,
    user_email TEXT NOT NULL,
    date DATE NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_email, date)
);

CREATE INDEX IF NOT EXISTS idx_token_usage_user_date ON token_usage(user_email, date);
CREATE INDEX IF NOT EXISTS idx_token_usage_date ON token_usage(date);

-- ====================================
-- TABLE PARTENAIRES (si nécessaire)
-- ====================================
CREATE TABLE IF NOT EXISTS partners (
    id BIGSERIAL PRIMARY KEY,
    partner_id TEXT UNIQUE NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partners_partner_id ON partners(partner_id);

-- ====================================
-- TRIGGERS POUR updated_at
-- ====================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Appliquer le trigger à toutes les tables
CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_token_usage_updated_at 
    BEFORE UPDATE ON token_usage 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partners_updated_at 
    BEFORE UPDATE ON partners 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================
-- POLITIQUES RLS (Row Level Security)
-- ====================================
-- Activer RLS sur toutes les tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- Politique pour sessions (utilisateur peut voir/modifier ses propres données)
CREATE POLICY "Users can manage own sessions" ON sessions
    FOR ALL USING (user_email = current_user);

-- Politique pour token_usage (utilisateur peut voir ses propres tokens)
CREATE POLICY "Users can view own token usage" ON token_usage
    FOR SELECT USING (user_email = current_user);

-- Politique pour users (lecture publique, modification admin seulement)
CREATE POLICY "Users are viewable by everyone" ON users
    FOR SELECT USING (true);

-- ====================================
-- VUES UTILES
-- ====================================
-- Vue pour les statistiques d'usage
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.email,
    u.is_admin,
    s.created_at as first_session,
    s.updated_at as last_activity,
    COALESCE(SUM(tu.tokens_used), 0) as total_tokens_used
FROM users u
LEFT JOIN sessions s ON u.email = s.user_email
LEFT JOIN token_usage tu ON u.email = tu.user_email
GROUP BY u.email, u.is_admin, s.created_at, s.updated_at;

-- ====================================
-- COMMENTAIRES
-- ====================================
COMMENT ON TABLE sessions IS 'Stockage des sessions utilisateur';
COMMENT ON TABLE users IS 'Utilisateurs de l''application';
COMMENT ON TABLE token_usage IS 'Suivi de l''usage des tokens';
COMMENT ON TABLE partners IS 'Données des partenaires';
