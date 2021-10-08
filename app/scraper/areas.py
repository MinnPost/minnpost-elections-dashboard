import os
import logging
from flask import jsonify, request, current_app
from app import db
from app.models import Area
from app.scraper import bp
#from app.api.auth import token_auth
#from app.api.errors import bad_request

from sqlalchemy.dialects.postgresql import insert

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
    election_meta = sources[election]['meta'] if 'meta' in sources[election] else {}

    for i in sources[election]:
        source = sources[election][i]

        if 'type' in source and source['type'] == 'areas':

            rows = area.parse_election(source, election_meta)

            #rows = area.scrape('areas')
            # Go through rows.
            # Save every x
            count = 0
            group = []


            for row in rows:
                parsed = area.parser(row, i)
                group.append(parsed)

                #area = Area()
                #area.from_dict(parsed, new=True)

                #stmt = insert(Area.__table__).values(parsed)
                #stmt = stmt.on_conflict_do_update(
                    # Let's use the constraint name which was visible in the original posts error msg
                #    constraint="['area_id']",

                    # The columns that should be updated on conflict
                #    set_={
                #        parsed
                #    }
                #)
                #db.session.execute(stmt)

                #count = count + 1

            area.upsert(db.session, Area, group)

    return str(count)