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
    inserted_count = 0
    parsed_count = 0
    group_count = 0

    for group in sources[election]:
        source = sources[election][group]
        group_count = group_count + 1

        if 'type' in source and source['type'] == 'areas':
            # handle parsed areas
            rows = area.parse_election(source, election_meta)

            for row in rows:
                parsed = area.parser(row, group)

                area = Area()
                area.from_dict(parsed, new=True)

                db.session.merge(area)
                inserted_count = inserted_count + 1
                parsed_count = parsed_count + 1
            # commit parsed rows
            db.session.commit()
            
    return "Elections scanned: %s. Rows inserted: %s. Parsed rows: %s" % (str(group_count), str(inserted_count), str(parsed_count))
