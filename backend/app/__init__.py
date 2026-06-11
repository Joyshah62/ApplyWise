import os
from flask import Flask, jsonify
from flask_cors import CORS
from app.config import Config
from app.extensions import db, jwt, migrate, limiter

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    allowed_origins = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:5174').split(',')

    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": allowed_origins, "supports_credentials": True}})
    jwt.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)

    # Lightweight health check endpoint to prevent Render spin-down
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({"status": "healthy"}), 200

    from app.routes import register_routes
    register_routes(app)

    return app

