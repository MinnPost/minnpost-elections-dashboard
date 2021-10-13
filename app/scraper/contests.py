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
    inserted_count = 0
    updated_count = 0
    deleted_count = 0
    parsed_count = 0
    supplemented_count = 0

    for group in sources[election]:
        source = sources[election][group]

        if 'type' in source and source['type'] == 'results':
            # handle parsed contests
            rows = contest.parse_election(source, election_meta)
            for row in rows:
                parsed = contest.parser(row, group, source)

                contest = Contest()
                contest.from_dict(parsed, new=True)

                db.session.merge(contest)
                inserted_count = inserted_count + 1
                parsed_count = parsed_count + 1
            # commit parsed rows
            db.session.commit()
            
            # Handle post processing actions
            supplemental = contest.post_processing('contests')
            for supplemental_contest in supplemental:
                rows = supplemental_contest['rows']
                action = supplemental_contest['action']
                if action is not None:
                    if action == 'insert' or action == 'update':
                        for row in rows:
                            db.session.merge(row)
                            if action == 'insert':
                                inserted_count = inserted_count + 1
                            elif action == 'update':
                                updated_count = updated_count + 1
                    elif action == 'delete':
                        for row in rows:
                            db.session.delete(row)
                            deleted_count = deleted_count + 1
                    supplemented_count = supplemented_count + 1
            # commit supplemental rows
            db.session.commit()

    return "Rows inserted: %s; Rows updated: %s; Rows deleted: %s. Parsed rows: %s Supplemental rows: %s" % (str(inserted_count), str(updated_count), str(deleted_count), str(parsed_count), str(supplemented_count))
