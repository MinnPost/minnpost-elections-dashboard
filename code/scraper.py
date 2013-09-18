#!/usr/bin/env python
"""
Main scraper.
"""

import os
import re
import scraperwiki
import csv
import datetime
import calendar
import logger
import json


class ElectionScraper:
  """
  Election scraper class.
  """
  sources_file = os.path.join(os.path.dirname(__file__), '../scraper_sources.json')
  index_created = {}

  def __init__(self):
    """
    Constructor
    """
    self.log = logger.ScraperLogger('scraper_results').logger
    self.log.info('[scraper] Scraping started.')
    self.read_sources()
    self.route()


  def read_sources(self):
    """
    Read the scraper_sources.json file.
    """
    data = open(self.sources_file)
    self.sources = json.load(data)


  def route(self):
    """
    Route via arguments
    """
    self.scrape('results')


  def scrape(self, type):
    """
    Main scraper handler.
    """
    for i in self.sources:
      s = self.sources[i]

      if s['type'] == type:
        # Ensure we have a valid parser for this type
        parser = 'parser_' + s['type']
        parser_method = getattr(self, parser, None)
        if callable(parser_method):
          # Get data from URL
          try:
            scraped = scraperwiki.scrape(s['url'])
            rows = csv.reader(scraped.splitlines(), delimiter=';', quotechar='|')
          except Exception, err:
            self.log.exception('[%s] Error when trying to read URL and parse CSV: %s' % (u, s['url']))
            raise

          # Crete table
          self.create_table(s['table'])

          # Index is created after first insert
          if s['table'] not in self.index_created:
            self.index_created[s['table']] = False
          index = 'index_' + s['table']
          index_method = getattr(self, index, None)

          # Go through rows
          count = 0
          for row in rows:
            # Parse row
            parsed = parser_method(row)

            # Save to database
            try:
              scraperwiki.sqlite.save(unique_keys = [], data = parsed, table_name = s['table'])

              # Create index if needed
              if callable(index_method) and not self.index_created[s['table']]:
                index_method()
                self.index_created[s['table']] = True
            except Exception, err:
              self.log.exception('[%s] Error thrown while saving to table: %s' % (s['table'], row))
              raise

            count = count + 1


  def create_table(self, table):
    query = "CREATE TABLE IF NOT EXISTS %s (key INTEGER PRIMARY KEY)"
    scraperwiki.sqlite.dt.execute(query % (table))

  def parser_results(self, row):
    # Make a UTC timestamp
    timestamp = calendar.timegm(datetime.datetime.utcnow().utctimetuple())

    # Create ids
    cand_name_id = re.sub(r'\W+', '', row[7])
    office_name_id = re.sub(r'\W+', '', row[4])
    base_id = 'id-' + row[1] + '-' + row[2] + '-' + row[5] + '-' + row[3]
    row_id = base_id + '-' + row[6]
    id_name = base_id + '-' + row[6] + '-' + office_name_id + '-' + cand_name_id
    race_id = base_id
    race_id_name = base_id + '-' + office_name_id

    return {
      'id': row_id,
      'office_type': 'to-fix', # FIX
      'state': row[0],
      'county_id': row[1],
      'precinct_id': row[2],
      'office_id': row[3],
      'office_name': row[4],
      'district_code': row[5], # District, mcd, or fips code
      'candidate_id': row[6],
      'candidate': row[7],
      'suffix': row[8],
      'incumbent_code': row[9],
      'party_id': row[10],
      'precincts_reporting': int(row[11]),
      'total_effected_precincts': int(row[12]),
      'votes_candidate': int(row[13]),
      'percentage': float(row[14]),
      'total_votes_for_office': int(row[15]),
      'id_name': id_name,
      'race_id': race_id,
      'race_id_name': race_id_name,
      'cand_name_id': cand_name_id,
      'office_name_id': office_name_id,
      'question_body': '',
      'updated': int(timestamp)
    }

  def index_results(self):
    index_query = "CREATE INDEX IF NOT EXISTS %s ON results (%s)"
    scraperwiki.sqlite.dt.execute(index_query % ('office_name', 'office_name'))
    scraperwiki.sqlite.dt.execute(index_query % ('candidate', 'candidate'))
    scraperwiki.sqlite.dt.execute(index_query % ('race_id', 'race_id'))
    self.log.info('[%s] Creating indices for results table.' % ('results'))



# If calling directly
if __name__ == "__main__":
  scraper = ElectionScraper()