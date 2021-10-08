import os
import logging
from flask import jsonify, request, current_app
from app import db
from app.models import Question
from app.scraper import bp
#from app.api.auth import token_auth
#from app.api.errors import bad_request

from sqlalchemy.dialects.postgresql import insert

LOG = logging.getLogger(__name__)

newest_election = None
election = None

@bp.route('/questions')
def scrape_questions():
    question = Question()
    sources = question.read_sources()
    election = question.set_election()

    if election not in sources:
        return

    # Get metadata about election
    election_meta = sources[election]['meta'] if 'meta' in sources[election] else {}

    for i in sources[election]:
        source = sources[election][i]

        if 'type' in source and source['type'] == 'questions':

            rows = question.parse_election(source, election_meta)
            count = 0

            for row in rows:
                parsed = question.parser(row, i)

                question = Question()
                question.from_dict(parsed, new=True)

                db.session.add(question)
                db.session.commit()
                #print(question)
                count = count + 1

    return str(count)