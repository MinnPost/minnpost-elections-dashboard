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

    for group in sources[election]:
        source = sources[election][group]

        if 'type' in source and source['type'] == 'results':

            rows = result.parse_election(source, election_meta)

            for row in rows:
                parsed = result.parser(row, group)

                result = Result()
                result.from_dict(parsed, new=True)

                db.session.merge(result)
                #db.session.commit()
                #print(result)
                inserted_count = inserted_count + 1
                parsed_count = parsed_count + 1

            # Handle post processing actions
            supplemental = result.post_processing(source)
            for supplemental_result in supplemental:
                #print(supplemental_result)
                rows = supplemental_result['rows']
                action = supplemental_result['action']
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
            db.session.commit()

                #print(supplemental_result)

            #    spreadsheet_parsed = result.parser(spreadsheet_row, group)

            #    spreadsheet_result = Result()
            #    spreadsheet_result.from_dict(spreadsheet_parsed, new=True)

                #db.session.merge(supplemental_result)
                #db.session.commit()
                #print(supplemental_result)
                

    return "Rows inserted: %s; Rows updated: %s; Rows deleted: %s. Parsed rows: %s Supplemental rows: %s" % (str(inserted_count), str(updated_count), str(deleted_count), str(parsed_count), str(supplemented_count))
