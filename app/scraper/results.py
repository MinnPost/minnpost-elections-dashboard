import os
import logging
from flask import jsonify, request, current_app
from app import db
from app.models import Result
from app.scraper import bp
#from app.api.auth import token_auth
#from app.api.errors import bad_request

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
    inserted_count = 0
    updated_count = 0
    deleted_count = 0
    parsed_count = 0
    supplemented_count = 0
    group_count = 0

    for group in sources[election]:
        source = sources[election][group]
        group_count = group_count + 1

        if 'type' in source and source['type'] == 'results':
            # handle parsed results
            rows = result.parse_election(source, election_meta)
            for row in rows:
                parsed = result.parser(row, group)

                result = Result()
                result.from_dict(parsed, new=True)

                db.session.merge(result)
                inserted_count = inserted_count + 1
                parsed_count = parsed_count + 1
            # commit parsed rows
            db.session.commit()

    # Handle post processing actions. this only needs to happen once, not for every group.
    supplemental = result.post_processing('results')
    for supplemental_result in supplemental:
        rows = supplemental_result['rows']
        action = supplemental_result['action']
        if action is not None and rows != []:
            for row in rows:
                if row is not []:
                    if action == 'insert' or action == 'update':
                        db.session.merge(row)
                        if action == 'insert':
                            inserted_count = inserted_count + 1
                        elif action == 'update':
                            updated_count = updated_count + 1
                        supplemented_count = supplemented_count + 1
                    elif action == 'delete':
                        db.session.delete(row)
                        deleted_count = deleted_count + 1
    # commit supplemental rows
    db.session.commit()

    return "Elections scanned: %s. Rows inserted: %s; Rows updated: %s; Rows deleted: %s. Parsed rows: %s Supplemental rows: %s" % (str(group_count), str(inserted_count), str(updated_count), str(deleted_count), str(parsed_count), str(supplemented_count))
