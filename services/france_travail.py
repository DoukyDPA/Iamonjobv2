"""
services/france_travail.py
==========================

Client minimaliste pour l'API France Travail "Offres d'emploi v2".

Documentation officielle :
- Auth   : https://francetravail.io/data/documentation/utiliser-api-france-travail/generer-access-token
- Offres : https://francetravail.io/data/api/offres-emploi

Fonctions exposées :
- get_access_token()       : token OAuth2 client_credentials, mis en cache 25 min
- search_offres(params)    : recherche paginée (paramètres officiels FT)
- get_offre_detail(ft_id)  : détail complet d'une offre (cache 1 h)

Configuration via variables d'environnement (Railway) :
- FT_CLIENT_ID
- FT_CLIENT_SECRET
- FT_SCOPE (optionnel, défaut "api_offresdemploiv2 o2dsoffre")

Toutes les fonctions lèvent FranceTravailError en cas d'échec.
"""

from __future__ import annotations

import logging
import os
import threading
import time
from typing import Any, Dict, Optional

import requests

logger = logging.getLogger(__name__)

# -- Constantes API officielles ------------------------------------------------

OAUTH_URL = (
    "https://entreprise.francetravail.fr/connexion/oauth2/access_token"
    "?realm=%2Fpartenaire"
)
BASE_URL = "https://api.francetravail.io/partenaire/offresdemploi/v2"
SEARCH_URL = f"{BASE_URL}/offres/search"
DETAIL_URL = f"{BASE_URL}/offres"  # /{id}

DEFAULT_SCOPE = "api_offresdemploiv2 o2dsoffre"
TOKEN_TTL_MARGIN = 60  # On considère le token expiré 60 s avant son échéance réelle
DETAIL_CACHE_TTL = 3600  # 1 h
HTTP_TIMEOUT = 15  # s


class FranceTravailError(RuntimeError):
    """Erreur générique du client France Travail."""


# -- Cache token (process-local, thread-safe) ----------------------------------

_token_lock = threading.Lock()
_token_state: Dict[str, Any] = {"value": None, "expires_at": 0.0}

# Cache mémoire des détails d'offres (process-local)
_detail_cache_lock = threading.Lock()
_detail_cache: Dict[str, Dict[str, Any]] = {}


def _get_credentials() -> tuple[str, str, str]:
    client_id = os.environ.get("FT_CLIENT_ID", "").strip()
    client_secret = os.environ.get("FT_CLIENT_SECRET", "").strip()
    scope = os.environ.get("FT_SCOPE", DEFAULT_SCOPE).strip() or DEFAULT_SCOPE
    if not client_id or not client_secret:
        raise FranceTravailError(
            "Credentials France Travail manquants. "
            "Définissez FT_CLIENT_ID et FT_CLIENT_SECRET en variables d'environnement."
        )
    return client_id, client_secret, scope


def get_access_token(force_refresh: bool = False) -> str:
    """
    Retourne un access_token OAuth2 valide. Token mis en cache process-local.

    France Travail délivre des tokens valables ~1500 s (25 min). On garde une
    marge de 60 s pour éviter les courses au renouvellement.
    """
    now = time.time()
    with _token_lock:
        if (
            not force_refresh
            and _token_state["value"]
            and _token_state["expires_at"] > now + TOKEN_TTL_MARGIN
        ):
            return _token_state["value"]

        client_id, client_secret, scope = _get_credentials()
        payload = {
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
            "scope": scope,
        }
        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        try:
            resp = requests.post(
                OAUTH_URL,
                data=payload,
                headers=headers,
                timeout=HTTP_TIMEOUT,
            )
        except requests.RequestException as exc:
            raise FranceTravailError(
                f"Erreur réseau lors de la récupération du token FT : {exc}"
            ) from exc

        if resp.status_code != 200:
            raise FranceTravailError(
                f"Échec OAuth2 France Travail ({resp.status_code}) : {resp.text[:300]}"
            )

        body = resp.json()
        access_token = body.get("access_token")
        expires_in = int(body.get("expires_in", 1500))
        if not access_token:
            raise FranceTravailError("Réponse OAuth2 sans access_token.")

        _token_state["value"] = access_token
        _token_state["expires_at"] = now + expires_in
        logger.info(
            "France Travail : token rafraîchi (valable %s s, scope=%s)",
            expires_in,
            scope,
        )
        return access_token


def _auth_headers() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {get_access_token()}",
        "Accept": "application/json",
    }


def _sanitize_search_params(params: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Garde uniquement les paramètres officiels de l'API "offres/search".
    Convertit les listes en chaînes virgule-séparées comme attendu par l'API.

    Référence : France Travail accepte motsCles, codeROME, codeNAF,
    commune, departement, region, distance, typeContrat, experience,
    qualification, tempsPlein, secteurActivite, range, sort, etc.
    """
    if not params:
        return {}

    allowed = {
        "motsCles",
        "codeROME",
        "theme",
        "appellation",
        "secteurActivite",
        "experience",
        "typeContrat",
        "natureContrat",
        "qualification",
        "tempsPlein",
        "commune",
        "departement",
        "region",
        "paysContinent",
        "insee",
        "niveauFormation",
        "permis",
        "motsClesNiveau",
        "salaireMin",
        "periodeSalaire",
        "publieeDepuis",
        "minCreationDate",
        "maxCreationDate",
        "entreprisesAdaptees",
        "accesTravailleurHandicape",
        "range",
        "sort",
        "distance",
        "origineOffre",
    }
    clean: Dict[str, Any] = {}
    for key, value in params.items():
        if key not in allowed or value in (None, "", []):
            continue
        if isinstance(value, (list, tuple, set)):
            clean[key] = ",".join(str(v) for v in value)
        elif isinstance(value, bool):
            clean[key] = "true" if value else "false"
        else:
            clean[key] = str(value)
    return clean


def search_offres(params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Appelle GET /offres/search. Retourne le payload JSON brut de France Travail.

    Paramètre `range` recommandé : "0-19" (20 premiers résultats).
    """
    safe = _sanitize_search_params(params)
    safe.setdefault("range", "0-19")

    try:
        resp = requests.get(
            SEARCH_URL,
            headers=_auth_headers(),
            params=safe,
            timeout=HTTP_TIMEOUT,
        )
    except requests.RequestException as exc:
        raise FranceTravailError(
            f"Erreur réseau lors de la recherche FT : {exc}"
        ) from exc

    # 206 = succès avec pagination partielle (cas courant FT) ; 200 = succès complet
    if resp.status_code not in (200, 206):
        # Token éventuellement expiré : on retente une fois après refresh
        if resp.status_code == 401:
            logger.warning("FT 401 reçu, refresh token et nouvelle tentative")
            get_access_token(force_refresh=True)
            resp = requests.get(
                SEARCH_URL,
                headers=_auth_headers(),
                params=safe,
                timeout=HTTP_TIMEOUT,
            )
            if resp.status_code not in (200, 206):
                raise FranceTravailError(
                    f"Recherche FT échouée après refresh ({resp.status_code}) : "
                    f"{resp.text[:300]}"
                )
        else:
            raise FranceTravailError(
                f"Recherche FT échouée ({resp.status_code}) : {resp.text[:300]}"
            )

    return resp.json()


def get_offre_detail(ft_id: str) -> Dict[str, Any]:
    """
    Appelle GET /offres/{id}. Cache mémoire 1 h.
    """
    if not ft_id:
        raise FranceTravailError("ID d'offre manquant.")

    now = time.time()
    with _detail_cache_lock:
        cached = _detail_cache.get(ft_id)
        if cached and cached["expires_at"] > now:
            return cached["payload"]

    try:
        resp = requests.get(
            f"{DETAIL_URL}/{ft_id}",
            headers=_auth_headers(),
            timeout=HTTP_TIMEOUT,
        )
    except requests.RequestException as exc:
        raise FranceTravailError(
            f"Erreur réseau lors de la lecture du détail FT : {exc}"
        ) from exc

    if resp.status_code == 401:
        get_access_token(force_refresh=True)
        resp = requests.get(
            f"{DETAIL_URL}/{ft_id}",
            headers=_auth_headers(),
            timeout=HTTP_TIMEOUT,
        )

    if resp.status_code == 404:
        raise FranceTravailError(f"Offre FT introuvable : {ft_id}")
    if resp.status_code != 200:
        raise FranceTravailError(
            f"Détail FT échoué ({resp.status_code}) : {resp.text[:300]}"
        )

    payload = resp.json()
    with _detail_cache_lock:
        _detail_cache[ft_id] = {
            "payload": payload,
            "expires_at": now + DETAIL_CACHE_TTL,
        }
    return payload


def normalize_offre_summary(offre: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convertit une offre brute France Travail en payload compact pour le frontend.
    Les champs FT varient ; on tente d'être tolérant.
    """
    lieu = offre.get("lieuTravail") or {}
    entreprise = offre.get("entreprise") or {}
    salaire = offre.get("salaire") or {}

    return {
        "id": offre.get("id"),
        "title": offre.get("intitule") or "",
        "description": offre.get("description") or "",
        "company": entreprise.get("nom") or "",
        "logo_url": entreprise.get("logo"),
        "contract_type": offre.get("typeContratLibelle") or offre.get("typeContrat") or "",
        "duration": offre.get("dureeTravailLibelle") or "",
        "location": lieu.get("libelle") or "",
        "postal_code": lieu.get("codePostal") or "",
        "salary": salaire.get("libelle") or "",
        "experience": offre.get("experienceLibelle") or "",
        "rome_code": offre.get("romeCode") or "",
        "rome_label": offre.get("romeLibelle") or "",
        "skills": [c.get("libelle") for c in (offre.get("competences") or []) if c.get("libelle")],
        "url_apply": offre.get("origineOffre", {}).get("urlOrigine") or "",
        "created_at": offre.get("dateCreation"),
        "updated_at": offre.get("dateActualisation"),
    }


# -- Helpers de debug (utiles en dev) ------------------------------------------

def _debug_clear_caches() -> None:
    """Vide les caches process-local. Réservé aux tests."""
    with _token_lock:
        _token_state["value"] = None
        _token_state["expires_at"] = 0.0
    with _detail_cache_lock:
        _detail_cache.clear()
