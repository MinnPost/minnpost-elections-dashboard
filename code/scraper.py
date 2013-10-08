#!/usr/bin/env python
"""
Main scraper.
"""

import sys
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
    if len(sys.argv) >= 2:
      method = sys.argv[1]
      arg1 = sys.argv[2] if 2 in sys.argv else None
      arg2 = sys.argv[3] if 3 in sys.argv else None
      action = getattr(self, method, None)
      if callable(action):
        action(arg1, arg2)


  def scrape(self, type, year):
    """
    Main scraper handler.
    """
    if year not in self.sources:
      return

    for i in self.sources[year]:
      s = self.sources[year][i]

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

          # Index is created after first insert
          if s['table'] not in self.index_created:
            self.index_created[s['table']] = False
          index = 'index_' + s['table']
          index_method = getattr(self, index, None)

          # Go through rows
          count = 0
          for row in rows:
            # Parse row
            parsed = parser_method(row, i)

            # Save to database
            try:
              scraperwiki.sqlite.save(unique_keys = ['id'], data = parsed, table_name = s['table'])

              # Create index if needed
              if callable(index_method) and not self.index_created[s['table']]:
                index_method()
                self.index_created[s['table']] = True
            except Exception, err:
              self.log.exception('[%s] Error thrown while saving to table: %s' % (s['table'], parsed))
              raise

            count = count + 1

          # Handle post actions
          post = 'post_' + s['type']
          post_method = getattr(self, post, None)
          if callable(post_method):
            post_method(i)

          # Log
          self.log.info('[%s] Scraped rows for %s: %s' % (s['type'], i, count))


  def parser_results(self, row, i):
    # Make a UTC timestamp
    timestamp = calendar.timegm(datetime.datetime.utcnow().utctimetuple())

    # To better match up with other data, we set a no county_id to 88 as
    # that is what MN SoS uses
    if not row[1] and i in ['amendments_results', 'us_senate_results', 'us_house_results', 'supreme_appeal_courts_results']:
      row[1] = '88'

    # Create ids
    cand_name_id = re.sub(r'\W+', '', row[7])
    office_name_id = re.sub(r'\W+', '', row[4])
    base_id = 'id-' + row[1] + '-' + row[2] + '-' + row[5] + '-' + row[3]
    row_id = base_id + '-' + row[6]
    id_name = base_id + '-' + row[6] + '-' + office_name_id + '-' + cand_name_id
    race_id = base_id
    race_id_name = base_id + '-' + office_name_id

    # Office refers to office name and office id as assigned by SoS, but
    # race ID is a more specific id as office id's are not unique across
    # all results

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


  def post_results(self, i):
    # Update some vars for easy retrieval
    scraperwiki.sqlite.save_var('updated', int(calendar.timegm(datetime.datetime.utcnow().utctimetuple())))
    races = scraperwiki.sqlite.select("COUNT(DISTINCT race_id) AS race_count FROM results")
    if races != []:
      scraperwiki.sqlite.save_var('races', races[0]['race_count'])
    # Use the first state level race to get general number of precincts reporting
    p_race = scraperwiki.sqlite.select("* FROM results WHERE county_id = '88' LIMIT 1")
    if p_race != []:
      scraperwiki.sqlite.save_var('precincts_reporting', p_race[0]['precincts_reporting'])
      scraperwiki.sqlite.save_var('total_effected_precincts', p_race[0]['total_effected_precincts'])


  def aggregate_results(self, *args):
    """
    Given results, aggregate into a table of races.
    """
    index_created = False
    results = scraperwiki.sqlite.select("DISTINCT office_id, office_name, office_name_id, race_id, race_id_name FROM results")

    for r in results:
      # The only way to know if there are multiple seats is look at the office
      # name which has "(Elect X)" in it.
      r['seats'] = 1
      re_seats = re.compile('.*\(elect ([0-9]+)\).*', re.IGNORECASE)
      matched_seats = re_seats.match(r['office_name'])
      if matched_seats is not None:
        r['seats'] = matched_seats.group(1)

      # Save to database
      try:
        scraperwiki.sqlite.save(unique_keys = ['race_id'], data = r, table_name = 'races')

        # Create index if needed
        if index_created == False:
          index_query = "CREATE INDEX IF NOT EXISTS %s ON races (%s)"
          scraperwiki.sqlite.dt.execute(index_query % ('office_id', 'office_id'))
          self.log.info('[%s] Creating indices for races table.' % ('races'))
          index_created = True
      except Exception, err:
        self.log.exception('[%s] Error thrown while saving to table: %s' % ('races', r))
        raise


# If calling directly
if __name__ == "__main__":
  scraper = ElectionScraper()