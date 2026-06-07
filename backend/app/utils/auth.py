from flask_jwt_extended import get_jwt_identity


def get_current_user_id() -> int:
    """JWT identity is stored as a string; cast to int for Postgres integer columns."""
    return int(get_jwt_identity())
