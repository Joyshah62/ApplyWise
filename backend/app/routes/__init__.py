def register_routes(app):
    from app.routes.auth_routes import auth_bp
    from app.routes.application_routes import applications_bp
    from app.routes.resume_routes import resumes_bp
    from app.routes.analytics_routes import analytics_bp
    from app.routes.quick_link_routes import quick_links_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(applications_bp)
    app.register_blueprint(resumes_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(quick_links_bp)
