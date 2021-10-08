import os
import logging
from flask import jsonify, request, current_app
from app import db
from app.models import Area
from app.scraper import bp
#from app.api.auth import token_auth
#from app.api.errors import bad_request

LOG = logging.getLogger(__name__)

newest_election = None
election = None

@bp.route('/areas')
def scrape_areas():
    area = Area()
    sources = area.read_sources()
    election = area.set_election()

    if election not in sources:
        return

    # Get metadata about election
    election_meta = area.set_election_metadata()
    count = 0

    for group in sources[election]:
        source = sources[election][group]

        if 'type' in source and source['type'] == 'areas':

            rows = area.parse_election(source, election_meta)

            for row in rows:
                parsed = area.parser(row, group)

                area = Area()
                area.from_dict(parsed, new=True)

                db.session.merge(area)
                db.session.commit()
                #print(area)
                count = count + 1
            
    return str(count)
