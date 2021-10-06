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


    def scrape_election(rows):
        return rows