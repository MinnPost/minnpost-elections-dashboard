from flask import Blueprint

contests_blueprint = Blueprint("contests", __name__, url_prefix="/contests", template_folder="contests")

from . import models, tasks  # noqa
