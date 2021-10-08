import logging
import os
from flask import Flask, request, current_app
from flask_celeryext import FlaskCeleryExt
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

from config import Config


db = SQLAlchemy()
migrate = Migrate(compare_type=True)

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)

    #app.task_queue = rq.Queue('microblog-tasks', connection=app.redis)

    #from app.errors import bp as errors_bp
    #app.register_blueprint(errors_bp)

    from app.scraper import bp as scraper_bp
    app.register_blueprint(scraper_bp, url_prefix='/scraper')

    #from app.main import bp as main_bp
    #app.register_blueprint(main_bp)

    #from app.api import bp as api_bp
    #app.register_blueprint(api_bp, url_prefix='/api')

    return app


from app import models