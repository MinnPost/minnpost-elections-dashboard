import os
import logging
from flask import jsonify, request, current_app
from app import db
from app.models import Result
from app.scraper import bp
#from app.api.auth import token_auth
#from app.api.errors import bad_request

from sqlalchemy.dialects.postgresql import insert

LOG = logging.getLogger(__name__)

newest_election = None
election = None

@bp.route('/results')
def scrape_results():
    result = Result()
    sources = result.read_sources()
    election = result.set_election()

    if election not in sources:
        return

    # Get metadata about election
    election_meta = result.set_election_metadata()
    count = 0

    for group in sources[election]:
        source = sources[election][group]

        if 'type' in source and source['type'] == 'results':

            rows = result.parse_election(source, election_meta)

            for row in rows:
                parsed = result.parser(row, group)

                result = Result()
                result.from_dict(parsed, new=True)

                db.session.merge(result)
                db.session.commit()
                #print(result)
                count = count + 1

    return str(count)