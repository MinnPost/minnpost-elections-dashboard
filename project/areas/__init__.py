from flask import Blueprint

areas_blueprint = Blueprint("areas", __name__, url_prefix="/areas", template_folder="areas")

from . import models, tasks  # noqa
