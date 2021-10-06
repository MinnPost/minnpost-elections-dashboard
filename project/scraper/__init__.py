import logging
import os
import json
import re
import csv
import urllib.request
from flask import Blueprint, current_app

from project.areas.models import Area

LOG = logging.getLogger(__name__)
scraper_blueprint = Blueprint("scraper", __name__, url_prefix="/scraper", template_folder="scraper")

sources_file = os.path.join(current_app.root_path, '../scraper_sources.json')
nonpartisan_parties = ['NP', 'WI', 'N P']

scraper_sources_inline = None
newest_election = None
election = None

@scraper_blueprint.route("/")
def index():
    LOG.debug("Call health ok")
    return "Hello, World!"


#@scraper_blueprint.route("/areas")
#def scrape_areas():
#    area = Area()
#    result = area.scrape('areas')
#    return result

@scraper_blueprint.route("/areas")
def scrape_areas():
    area = Area()
    sources = area.read_sources()

    # Get metadata about election
    election_meta = sources[election]['meta'] if 'meta' in sources[election] else {}

    for i in sources[election]:
        source = sources[election][i]

        if 'type' in source and source['type'] == group_type:

            rows = area.scrape('areas')
            # Go through rows.
            # Save every x
            count = 0
            group = []
            for row in rows:
                parsed = area.parser(row, i)
                item = area(group)
                db.session.add(item)
                db.session.commit()
                print(area.__tablename__)
                count = count + 1
    return result

