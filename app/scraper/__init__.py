from flask import Blueprint

bp = Blueprint('scraper', __name__)

#from app.scraper import areas, contests, meta, questions, results
from app.scraper import areas, contests, questions, results