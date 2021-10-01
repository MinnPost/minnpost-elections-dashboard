from flask import Blueprint

meta_blueprint = Blueprint("meta", __name__, url_prefix="/meta", template_folder="meta")

from . import models, tasks  # noqa
