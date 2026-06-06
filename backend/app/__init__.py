import os
from flask import Flask
from app.config import Config
from app.extensions import db, cors, jwt, migrate, limiter

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    allowed_origins = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:5174').split(',')

    db.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": allowed_origins, "supports_credentials": True}})
    jwt.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)

    from app.routes import register_routes
    register_routes(app)

    return app
