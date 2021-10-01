from flask import Blueprint

questions_blueprint = Blueprint("questions", __name__, url_prefix="/questions", template_folder="questions")

from . import models, tasks  # noqa
