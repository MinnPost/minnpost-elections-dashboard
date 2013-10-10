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
      arg1 = sys.argv[2] if len(sys.argv) > 2 else None
      arg2 = sys.argv[3] if len(sys.argv) > 3 else None
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

    # Create ids
    cand_name_id = re.sub(r'\W+', '', row[7])
    office_name_id = re.sub(r'\W+', '', row[4])
    base_id = 'id-' + row[0] + '-' + row[1] + '-' + row[2] + '-' + row[5] + '-' + row[3]
    row_id = base_id + '-' + row[6]
    id_name = base_id + '-' + row[6] + '-' + office_name_id + '-' + cand_name_id

    # Office refers to office name and office id as assigned by SoS, but
    # contest ID is a more specific id as office id's are not unique across
    # all results
    contest_id = base_id
    contest_id_name = contest_id + '-' + office_name_id

    # For ranked choice voting, we want to a consistent contest id, as the
    # office_id is different for each set of choices.
    #
    # It seems that the office id is incremented by 1 starting at 1 so
    # we use the first
    ranked_choice = re.compile('.*(first|second|third|\w*th) choice.*', re.IGNORECASE).match(row[4])
    if ranked_choice is not None:
      office_id = ''.join(row[3].split())[:-1] + '1'
      contest_id = 'id-' + row[0] + '-' + row[1] + '-' + row[2] + '-' + row[5] + '-' + office_id
      contest_id_name = contest_id + '-' + office_name_id

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
      'candidate': row[7].replace('WRITE-IN**', 'WRITE-IN'),
      'suffix': row[8],
      'incumbent_code': row[9],
      'party_id': row[10],
      'precincts_reporting': int(row[11]),
      'total_effected_precincts': int(row[12]),
      'votes_candidate': int(row[13]),
      'percentage': float(row[14]),
      'total_votes_for_office': int(row[15]),
      'id_name': id_name,
      'contest_id': contest_id,
      'contest_id_name': contest_id_name,
      'cand_name_id': cand_name_id,
      'office_name_id': office_name_id,
      'question_body': '',
      'updated': int(timestamp)
    }


  def index_results(self):
    index_query = "CREATE INDEX IF NOT EXISTS %s ON results (%s)"
    scraperwiki.sqlite.dt.execute(index_query % ('office_name', 'office_name'))
    scraperwiki.sqlite.dt.execute(index_query % ('candidate', 'candidate'))
    scraperwiki.sqlite.dt.execute(index_query % ('contest_id', 'contest_id'))
    self.log.info('[%s] Creating indices for results table.' % ('results'))


  def post_results(self, i):
    # Update some vars for easy retrieval
    scraperwiki.sqlite.save_var('updated', int(calendar.timegm(datetime.datetime.utcnow().utctimetuple())))
    contests = scraperwiki.sqlite.select("COUNT(DISTINCT contest_id) AS contest_count FROM results")
    if contests != []:
      scraperwiki.sqlite.save_var('contests', contests[0]['contest_count'])

    # Use the first state level race to get general number of precincts reporting
    state_contest = scraperwiki.sqlite.select("* FROM results WHERE county_id = '88' LIMIT 1")
    if state_contest != []:
      scraperwiki.sqlite.save_var('precincts_reporting', state_contest[0]['precincts_reporting'])
      scraperwiki.sqlite.save_var('total_effected_precincts', state_contest[0]['total_effected_precincts'])


  def aggregate_results(self, *args):
    """
    Given results, aggregate into a table of races.
    """
    index_created = False
    results = scraperwiki.sqlite.select("DISTINCT contest_id, office_name FROM results")

    for r in results:
      # The only way to know if there are multiple seats is look at the office
      # name which has "(Elect X)" in it.
      r['seats'] = 1
      re_seats = re.compile('.*\(elect ([0-9]+)\).*', re.IGNORECASE)
      matched_seats = re_seats.match(r['office_name'])
      if matched_seats is not None:
        r['seats'] = matched_seats.group(1)

      # Ranked choice voting can be determined by a "* choice" string
      r['ranked_choice'] = False
      re_ranked_choice = re.compile('.*(first|second|third|\w*th) choice.*', re.IGNORECASE)
      matched_ranked_choice = re_ranked_choice.match(r['office_name'])
      if matched_ranked_choice is not None:
        r['ranked_choice'] = True

      # Title and search term
      r['title'] = r['office_name']
      r['title'] = re.compile('(\(elect [0-9]+\))', re.IGNORECASE).sub('', r['title'])
      r['title'] = re.compile('((first|second|third|\w*th) choice)', re.IGNORECASE).sub('', r['title'])
      # Look for non-ISD parenthesis which should be place names
      re_place = re.compile('.*\(([^#]*)\).*', re.IGNORECASE).match(r['title'])
      r['title'] = re.compile('(\([^#]*\))', re.IGNORECASE).sub('', r['title'])
      if re_place is not None:
        r['title'] = re_place.group(1) + ' ' + r['title']
      r['title'] = r['title'].rstrip()

      # Remove office
      del r['office_name']

      # Save to database
      try:
        scraperwiki.sqlite.save(unique_keys = ['contest_id'], data = r, table_name = 'contests')

        # Create index if needed
        if index_created == False:
          index_query = "CREATE INDEX IF NOT EXISTS %s ON contests (%s)"
          scraperwiki.sqlite.dt.execute(index_query % ('title', 'title'))
          self.log.info('[%s] Creating indices for contests table.' % ('contests'))
          index_created = True
      except Exception, err:
        self.log.exception('[%s] Error thrown while saving to table: %s' % ('contests', r))
        raise


# If calling directly
if __name__ == "__main__":
  scraper = ElectionScraper()