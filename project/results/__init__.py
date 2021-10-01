from flask import Blueprint

results_blueprint = Blueprint("results", __name__, url_prefix="/results", template_folder="results")

from . import models, tasks  # noqa
