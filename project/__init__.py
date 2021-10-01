import os

from flask import Flask
from flask_celeryext import FlaskCeleryExt
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

from project.celery_utils import make_celery
from project.config import config

# instantiate the extensions
db = SQLAlchemy()
migrate = Migrate(compare_type=True)
ext_celery = FlaskCeleryExt(create_celery_app=make_celery)

def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get("FLASK_CONFIG", "development")

    # instantiate the app
    app = Flask(__name__)

    # set config
    app.config.from_object(config[config_name])

    # set up extensions
    db.init_app(app)
    migrate.init_app(app, db)
    ext_celery.init_app(app)

    # register blueprints
    from project.areas import areas_blueprint
    app.register_blueprint(areas_blueprint)
    from project.contests import contests_blueprint
    app.register_blueprint(contests_blueprint)
    from project.questions import questions_blueprint
    app.register_blueprint(questions_blueprint)
    from project.results import results_blueprint
    app.register_blueprint(results_blueprint)
    from project.meta import meta_blueprint
    app.register_blueprint(meta_blueprint)

    # shell context for flask cli
    @app.shell_context_processor
    def ctx():
        return {"app": app, "db": db}

    return app