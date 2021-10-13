import os
import logging
from flask import jsonify, request, current_app
from app import db
from app.models import Meta
from app.scraper import bp
#from app.api.auth import token_auth
#from app.api.errors import bad_request

LOG = logging.getLogger(__name__)

newest_election = None
election = None

@bp.route('/meta')
def scrape_meta():
    meta = Meta()
    sources = meta.read_sources()
    election = meta.set_election()

    if election not in sources:
        return

    # Get metadata about election
    election_meta = meta.set_election_metadata()
    inserted_count = 0
    parsed_count = 0
    group_count = 0

    for group in sources[election]:
        source = sources[election][group]
        group_count = group_count + 1
        
        if 'meta' in sources[election]:
            rows = sources[election]['meta']

            for m in rows:
                row = rows[m]
                parsed = meta.parser(m, row)
                meta = Meta()
                meta.from_dict(parsed, new=True)

                db.session.merge(meta)
                inserted_count = inserted_count + 1
                parsed_count = parsed_count + 1
            # commit parsed rows
            db.session.commit()

    return "Elections scanned: %s. Rows inserted: %s. Parsed rows: %s" % (str(group_count), str(inserted_count), str(parsed_count))