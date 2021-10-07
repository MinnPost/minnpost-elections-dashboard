import logging
import os
import json
import re
import csv
import urllib.request

from flask import current_app
from project import db

LOG = logging.getLogger(__name__)
scraper_sources_inline = None

class ScraperModel(db.Model):
    __abstract__ = True
    sources_file = os.path.join(current_app.root_path, '../scraper_sources.json')
    nonpartisan_parties = ['NP', 'WI', 'N P']
    grouped_inserts = 1000

    def __init__(self, group_type = None):
        """
        Constructor
        """

        # this is where scraperwiki was creating and connecting to its database
        # we do this in the imported sql file instead

        self.read_sources()


    def read_sources(self):
        """
        Read the scraper_sources.json file.
        """
        if scraper_sources_inline is not None:
            self.sources = json.loads(scraper_sources_inline)
        else:
            data = open(self.sources_file)
            self.sources = json.load(data)

        return self.sources


    def set_election(self):
        # Get the newest set
        newest = 0
        for s in self.sources:
            newest = int(s) if int(s) > newest else newest

        newest_election = str(newest)
        election = newest_election
        # Usually we just want the newest election but allow for other situations
        election = election if election is not None and election != '' else newest_election
        return election


    def parse_election(self, source, election_meta = {}):

        # Get data from URL
        try:
            # Ballot questions spreadsheet requires latin-1 encoding
            #rows = unicodecsv.reader(scraped.splitlines(), delimiter=';', quotechar='|', encoding='latin-1')
            response = urllib.request.urlopen(source['url'])
            lines = [l.decode('latin-1') for l in response.readlines()]
            rows = csv.reader(lines, delimiter=';')
            return rows
        except Exception as err:
            LOG.error('[%s] Error when trying to read URL and parse CSV: %s' % (source['type'], source['url']))
            raise


    def scrape(self, group_type):
        """
        Main scraper handler.
        """

        sources = self.read_sources()
        election = self.set_election()

        if election not in sources:
            return

        # Get metadata about election
        election_meta = sources[election]['meta'] if 'meta' in sources[election] else {}

        for i in sources[election]:
            source = sources[election][i]

            if 'type' in source and source['type'] == group_type:

                # Ensure we have a valid parser for this type
                parser_method = getattr(self, "parser", None)
                if callable(parser_method):
                    # Check if election has base_url
                    source['url'] = election_meta['base_url'] + source['url'] if 'base_url' in election_meta else source['url']

                    # Get data from URL
                    try:
                        # Ballot questions spreadsheet requires latin-1 encoding
                        #rows = unicodecsv.reader(scraped.splitlines(), delimiter=';', quotechar='|', encoding='latin-1')
                        response = urllib.request.urlopen(source['url'])
                        lines = [l.decode('latin-1') for l in response.readlines()]
                        rows = csv.reader(lines, delimiter=';')
                    except Exception as err:
                        LOG.exception('[%s] Error when trying to read URL and parse CSV: %s' % (source['type'], source['url']))
                        raise

                    # Go through rows.
                    # Save every x
                    count = 0
                    group = []
                    for row in rows:
                        parsed = parser_method(row, i)
                        group.append(parsed)
                        # this divides the number of items in the group by the grouped inserts value
                        # and if there is no remainder, it goes on
                        if len(group) % self.grouped_inserts == 0:
                            #self.save(['id'], group, s['table'], index_method)
                            #item = self(group)
                            #db.session.add(item)
                            #db.session.commit()
                            #print(self.__tablename__)
                            group = []
                        #count = count + 1

            # then run the post actions if they are callable

    def scrape_election(rows):
        return rows