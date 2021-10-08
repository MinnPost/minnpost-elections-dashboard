import os
import logging
from flask import jsonify, request, current_app
from app import db
from app.models import Contest
from app.scraper import bp
#from app.api.auth import token_auth
#from app.api.errors import bad_request

LOG = logging.getLogger(__name__)

newest_election = None
election = None

@bp.route('/contests')
def scrape_contests():
    contest = Contest()
    sources = contest.read_sources()
    election = contest.set_election()

    if election not in sources:
        return

    # Get metadata about election
    election_meta = contest.set_election_metadata()
    count = 0

    for group in sources[election]:
        source = sources[election][group]

        if 'type' in source and source['type'] == 'results':

            rows = contest.parse_election(source, election_meta)

            for row in rows:
                parsed = contest.parser(row, group, source)

                contest = Contest()
                contest.from_dict(parsed, new=True)

                db.session.merge(contest)
                db.session.commit()
                count = count + 1

    return str(count)