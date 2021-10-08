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
    count = 0

    for group in sources[election]:
        source = sources[election][group]
        
        if 'meta' in sources[election]:
            rows = sources[election]['meta']

            for m in rows:
                row = rows[m]
                parsed = meta.parser(m, row)
                meta = Meta()
                meta.from_dict(parsed, new=True)

                db.session.merge(meta)
                db.session.commit()
                #print(meta)
                count = count + 1

    return str(count)