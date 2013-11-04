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
import requests
from gdata.spreadsheet.service import SpreadsheetsService


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
    self.log.info('[scraper] Started.')
    self.read_sources()


  def read_sources(self):
    """
    Read the scraper_sources.json file.
    """
    data = open(self.sources_file)
    self.sources = json.load(data)

    # Get the newest set
    newest = 0
    for s in self.sources:
      newest = s if int(s) > newest else newest

    self.newest_election = str(newest)
    self.election = self.newest_election


  def route(self):
    """
    Route via arguments
    """
    if len(sys.argv) >= 2:
      method = sys.argv[1]
      # There's probably a better way to get arguments and pass them along
      arg1 = sys.argv[2] if len(sys.argv) > 2 else None
      arg2 = sys.argv[3] if len(sys.argv) > 3 else None
      action = getattr(self, method, None)
      if callable(action):
        action(arg1, arg2)


  def save(self, ids, data, table, index_method = None):
    """
    Wrapper around saving a row.
    """
    try:
      scraperwiki.sqlite.save(unique_keys = ids, data = data, table_name = table)

      # Create index if needed
      if index_method is not None and callable(index_method) and not self.index_created[table]:
        index_method()
        self.index_created[table] = True
    except Exception, err:
      self.log.exception('[%s] Error thrown while saving to table: %s' % (table, data))
      raise


  def scrape(self, group_type, election, *args):
    """
    Main scraper handler.
    """

    # Usually we just want the newest election but allow for other situations
    election = election if election is not None and election != '' else self.newest_election
    self.election = election

    if election not in self.sources:
      return

    for i in self.sources[election]:
      s = self.sources[election][i]

      if 'type' in s and s['type'] == group_type:
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
            parsed = parser_method(row, i, s['table'])
            self.save(['id'], parsed, s['table'], index_method)
            count = count + 1

          # Log
          self.log.info('[%s] Scraped rows for %s: %s' % (s['type'], i, count))

    # Handle post actions
    post = 'post_' + group_type
    post_method = getattr(self, post, None)
    if callable(post_method):
      post_method()


  def supplement_connect(self, source):
    """
    Connect to supplemental source (Google spreadsheets) given set.
    """
    if self.election not in self.sources:
      return

    if source not in self.sources[self.election]:
      return

    try:
      s = self.sources[self.election][source]
      client = SpreadsheetsService()
      feed = client.GetWorksheetsFeed(s['spreadsheet_id'], visibility='public', projection='basic')
      worksheet_id = feed.entry[s['worksheet_id']].id.text.rsplit('/', 1)[1]
      rows = client.GetListFeed(key=s['spreadsheet_id'], wksht_id=worksheet_id, visibility='public', projection='values').entry
    except Exception, err:
      rows = None
      self.log.exception('[%s] Unable to connecto supplemental source: %s' % ('supplement', s))

    return rows


  def parser_areas(self, row, group, table):
    """
    Parser for areas type supporting tables.
    """
    timestamp = calendar.timegm(datetime.datetime.utcnow().utctimetuple())

    # General data
    parsed = {
      'id': group + '-',
      'areas_group': group,
      'county_id': None,
      'county_name': None,
      'ward_id': None,
      'precinct_id': None,
      'precinct_name': '',
      'state_senate_id': None,
      'state_house_id': None,
      'county_commissioner_id': None,
      'district_court_id': None,
      'soil_water_id': None,
      'school_district_id': None,
      'school_district_name': '',
      'mcd_id': None,
      'precincts': None,
      'name': '',
      'updated': int(timestamp)
    }

    if group == 'municipalities':
      parsed['id'] =  parsed['id'] + row[0] + '-' + row[2]
      parsed['county_id'] = row[0]
      parsed['county_name'] = row[1]
      parsed['mcd_id'] = row[2]
      parsed['name'] = row[1]

    if group == 'counties':
      parsed['id'] =  parsed['id'] + row[0]
      parsed['county_id'] = row[0]
      parsed['county_name'] = row[1]
      parsed['precincts'] = row[2]

    if group == 'precincts':
      parsed['id'] =  parsed['id'] + row[0] + '-' + row[1]
      parsed['county_id'] = row[0]
      parsed['precinct_id'] = row[1]
      parsed['precinct_name'] = row[2]
      parsed['state_senate_id'] = row[3]
      parsed['state_house_id'] = row[4]
      parsed['county_commissioner_id'] = row[5]
      parsed['district_court_id'] = row[6]
      parsed['soil_water_id'] = row[7]
      parsed['mcd_id'] = row[8]

    if group == 'school_districts':
      parsed['id'] =  parsed['id'] + row[0]
      parsed['school_district_id'] = row[0]
      parsed['school_district_name'] = row[1]
      parsed['county_id'] = row[2]
      parsed['county_name'] = row[3]

    return parsed


  def parser_results(self, row, group, table):
    """
    Parser for results type scraping.  We actually split the data into a results
    table as well as a contests table.
    """
    timestamp = calendar.timegm(datetime.datetime.utcnow().utctimetuple())
    self.contests_updated = {} if getattr(self, 'contests_updated', None) is None else self.contests_updated
    ranked_choice_translations = { 'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5, 'sixth': 6, 'seventh': 7, 'eighth': 8, 'nineth': 9, 'tenth': 10, 'final': 100 }
    ranked_choice_place = None

    # Create ids.
    # id-State-County-Precinct-District-Office
    base_id = 'id-' + row[0] + '-' + row[1] + '-' + row[2] + '-' + row[5] + '-' + row[3]
    # id-BASE-Candidate
    row_id = base_id + '-' + row[6]

    # Office refers to office name and office id as assigned by SoS, but
    # contest ID is a more specific id as office id's are not unique across
    # all results
    contest_id = base_id
    office_id = row[3]

    # For ranked choice voting, we want to a consistent contest id, as the
    # office_id is different for each set of choices.
    #
    # It seems that the office id is incremented by 1 starting at 1 so
    # we use the first
    ranked_choice = re.compile('.*(first|second|third|\w*th) choice.*', re.IGNORECASE).match(row[4])
    if ranked_choice is not None:
      office_id = ''.join(row[3].split())[:-1] + '1'
      contest_id = 'id-' + row[0] + '-' + row[1] + '-' + row[2] + '-' + row[5] + '-' + office_id

      # Determine which "choice" this is
      for c in ranked_choice_translations:
        ranked_choice_choice = re.compile('.*%s.*' % c, re.IGNORECASE).match(row[4])
        if ranked_choice_choice is not None:
          ranked_choice_place = ranked_choice_translations[c]

    # Check if records already exists, but first if table exists yet.  Also get
    # current records as INSERT or UPDATE statements require all data.
    found_result = False
    found_contest = False
    table_query = "name FROM sqlite_master WHERE type='table' AND name='%s'"
    row_query = "* FROM %s WHERE id = '%s'"
    found_result_table = scraperwiki.sqlite.select(table_query % 'results')
    found_contest_table = scraperwiki.sqlite.select(table_query % 'contests')
    if found_result_table != []:
      found_results = scraperwiki.sqlite.select(row_query % ('results', row_id))
    if found_contest_table != []:
      found_contests = scraperwiki.sqlite.select(row_query % ('contests', contest_id))

    # Handle result
    if found_result_table != [] and found_results != []:
      results_record = found_results[0]
      results_record['votes_candidate'] = int(row[13])
      results_record['percentage'] = float(row[14])
      results_record['updated'] = int(timestamp)
    else:
      results_record = {
        'id': row_id,
        'results_group': group,
        'office_name': row[4],
        'candidate_id': row[6],
        'candidate': row[7].replace('WRITE-IN**', 'WRITE-IN'),
        'suffix': row[8],
        'incumbent_code': row[9],
        'party_id': row[10],
        'votes_candidate': int(row[13]),
        'percentage': float(row[14]),
        'ranked_choice_place': int(ranked_choice_place) if ranked_choice_place is not None else 0,
        'contest_id': contest_id,
        'updated': int(timestamp)
      }

    # Handle contest
    if found_contest_table != [] and found_contests != []:
      contests_record = found_contests[0]
      contests_record['precincts_reporting'] = int(row[11])
      contests_record['total_effected_precincts'] = int(row[12])
      contests_record['total_votes_for_office'] = int(row[15])
      contests_record['updated'] = int(timestamp)
    else:
      # The only way to know if there are multiple seats is look at the office
      # name which has "(Elect X)" in it.
      re_seats = re.compile('.*\(elect ([0-9]+)\).*', re.IGNORECASE)
      matched_seats = re_seats.match(row[4])

      contests_record = {
        'id': contest_id,
        'office_id': office_id,
        'results_group': group,
        'office_name': row[4],
        'district_code': row[5],
        'state': row[0],
        'county_id': row[1],
        'precinct_id': row[2],
        'precincts_reporting': int(row[11]),
        'total_effected_precincts': int(row[12]),
        'total_votes_for_office': int(row[15]),
        'seats': matched_seats.group(1) if matched_seats is not None else 1,
        'ranked_choice': ranked_choice is not None,
        'updated': int(timestamp)
      }

    # Update the contests table.  This should really only happen once per
    # contest
    if contests_record['id'] not in self.contests_updated:
      self.save(['id'], contests_record, 'contests')
      self.contests_updated[contests_record['id']] = True

    # Return results record to be updated
    return results_record


  def index_results(self):
    index_query = "CREATE INDEX IF NOT EXISTS %s ON results (%s)"
    scraperwiki.sqlite.dt.execute(index_query % ('office_name', 'office_name'))
    scraperwiki.sqlite.dt.execute(index_query % ('candidate', 'candidate'))
    scraperwiki.sqlite.dt.execute(index_query % ('contest_id', 'contest_id'))
    self.log.info('[%s] Creating indices for results table.' % ('results'))


  def index_contests(self):
    index_query = "CREATE INDEX IF NOT EXISTS %s ON contests (%s)"
    scraperwiki.sqlite.dt.execute(index_query % ('title', 'title'))
    self.log.info('[%s] Creating indices for contests table.' % ('contests'))


  def post_results(self):
    # Update some vars for easy retrieval
    scraperwiki.sqlite.save_var('updated', int(calendar.timegm(datetime.datetime.utcnow().utctimetuple())))
    contests = scraperwiki.sqlite.select("COUNT(DISTINCT contest_id) AS contest_count FROM results")
    if contests != []:
      scraperwiki.sqlite.save_var('contests', contests[0]['contest_count'])

    # Use the first state level race to get general number of precincts reporting
    state_contest = scraperwiki.sqlite.select("* FROM contests WHERE county_id = '88' LIMIT 1")
    if state_contest != []:
      scraperwiki.sqlite.save_var('precincts_reporting', state_contest[0]['precincts_reporting'])
      scraperwiki.sqlite.save_var('total_effected_precincts', state_contest[0]['total_effected_precincts'])

    # Handle any supplemental data
    supplement_update = 0
    supplement_insert = 0
    supplement_delete = 0
    s_rows = self.supplement_connect('supplemental_results')
    for si in s_rows:
      s = si.custom

      # Parse some values we know we will look at
      percentage = float(s['percentage'].text) if s['percentage'].text is not None else None
      votes_candidate = int(s['votescandidate'].text) if s['votescandidate'].text is not None else None
      ranked_choice_place = int(s['rankedchoiceplace'].text) if s['votescandidate'].text is not None else None
      enabled = True if s['enabled'].text is not None else False
      row_id = s['id'].text

      # Check for existing rows
      results = scraperwiki.sqlite.select("* FROM results WHERE id = '%s'" % (row_id))

      # If valid data
      if votes_candidate > 0 and row_id is not None and s['contestid'].text is not None and s['candidateid'].text is not None:
        # If results exist and enabled then update, else if results and not
        # enabled and is supplemental remove, otherwise add
        if results != [] and enabled:
          result = results[0]
          result['percentage'] = percentage
          result['votes_candidate'] = votes_candidate
          result['ranked_choice_place'] = ranked_choice_place
          self.save(['id'], result, 'results')
          supplement_update = supplement_update + 1
        elif results != [] and not enabled and results[0]['results_group'] == 'supplemental':
          scraperwiki.sqlite.execute("DELETE FROM results WHERE id = '%s'" % (row_id))
          scraperwiki.sqlite.commit()
          supplement_delete = supplement_delete + 1
        elif enabled:
          # Add new row, make sure to mark the row as supplemental
          result = {
            'id': row_id,
            'percentage': percentage,
            'votes_candidate': votes_candidate,
            'ranked_choice_place': ranked_choice_place,
            'candidate': s['candidate'].text,
            'office_name': s['officename'].text,
            'contest_id': s['contestid'].text,
            'candidate_id': s['candidateid'].text,
            'results_group': 'supplemental'
          }
          self.save(['id'], result, 'results')
          supplement_insert = supplement_insert + 1

    self.log.info('[%s] Supplemental rows created: %s' % ('results', supplement_insert))
    self.log.info('[%s] Supplemental rows updated: %s' % ('results', supplement_update))
    self.log.info('[%s] Supplemental rows deleted: %s' % ('results', supplement_delete))



  def boundary_match_contests(self, parsed_row):
    """
    Logic to figure out what boundary the contest is for.  This will get messy.
    """
    boundary = ''


    # School district is in the office name
    if parsed_row['results_group'] == 'school_district_results':
      isd_match = re.compile('.*\(ISD #([0-9]+)\).*', re.IGNORECASE).match(parsed_row['office_name'])
      if isd_match is not None:
        boundary = isd_match.group(1) + '-school-district-2013'
      else:
        self.log.info('[%s] Could not find ISD boundary for: %s' % ('results', parsed_row['office_name']))

    # County should be provide, but the results also have results for county
    # comissioner which are sub-county boundaries
    if parsed_row['results_group'] == 'county_results':
      comissioner_match = re.compile('.*Commissioner District.*', re.IGNORECASE).match(parsed_row['office_name'])
      if comissioner_match is not None:
        boundary = parsed_row['county_id'] + '-' + parsed_row['district_code'] + '-county-commissioner-district-2012'
      else:
        boundary = parsed_row['county_id'] + '-county-2010'

    # This includes both municpal (city) level results, plus sub-municpal, such
    # as city council results.
    #
    # For municpal results.  The boundary code is SSCCCMMMM where:
    #   * SS is state ID which is 27
    #   * CCC is the county FIPS code which is the MN County Code * 2 - 1
    #   * MMMM is the municpal code
    # The main issue is getting the county code which is not included in the
    # results but instead in a separate table.
    #
    # It also turns out that there cities, like White Bear Lake City
    # which is in multiple counties which means they have more than one
    # boundary.
    #
    # For the sub-municpal results, we need wards.  Unfortunately the boundary
    # id for wards is the actual name of the city and the ward number due to the
    # face that the original boundary data did not have mcd codes in it.
    #
    # There are also minneapolis park and recs commissioner which is its own
    # thing.
    #
    # And there is also just wrong data occassionaly.
    if parsed_row['results_group'] == 'municipal_results':
      # Checks
      wards_matched = re.compile('.*(Council Member Ward|Council Member District) ([0-9]+).*\((((?!elect).)*)\).*', re.IGNORECASE).match(parsed_row['office_name'])
      mpls_parks_matched = re.compile('.*Park and Recreation Commissioner District ([0-9]+).*', re.IGNORECASE).match(parsed_row['office_name'])

      # Check for sub municpal parts first
      if wards_matched is not None:
        boundary = self.slugify(wards_matched.group(3)) + '-w-' + '{0:02d}'.format(int(wards_matched.group(2))) + '-ward-2012'
      elif mpls_parks_matched is not None:
        boundary = mpls_parks_matched.group(1) + '-minneapolis-parks-and-recreation-district-2014'
      else:
        if parsed_row['county_id']:
          boundary = self.boundary_make_mcd(parsed_row['county_id'], parsed_row['district_code'])
        else:
          mcd = scraperwiki.sqlite.select("* FROM areas WHERE areas_group = 'municipalities' AND mcd_id = '%s'" % (parsed_row['district_code']))
          if mcd != []:
            boundaries = []
            for r in mcd:
              boundaries.append(self.boundary_make_mcd(r['county_id'], parsed_row['district_code']))
            boundary = ','.join(boundaries)
          else:
            self.log.info('[%s] Could not find corresponding county for municpality: %s' % ('results', parsed_row['office_name']))

    return boundary


  def boundary_make_mcd(self, county_id, district):
    """
    Makes MCD code from values.
    """
    bad_data = {
      '2713702872': '2713702890' # Aurora City
    }
    fips = '{0:03d}'.format((int(county_id) * 2) - 1)
    mcd_id = '27' + fips + district
    if mcd_id in bad_data:
      mcd_id = bad_data[mcd_id]
    return mcd_id + '-minor-civil-division-2010'


  def match_contests(self, *args):
    """
    Update contests table matching things like boundaries.  This is for the meta data
    for each contest, not for the voting numbers, so it doesn't need to be run
    every update of results.
    """
    processed = 0
    supplemented = 0
    index_created = False
    contests = scraperwiki.sqlite.select("* FROM contests")

    # Get data from Google spreadsheet
    s_rows = self.supplement_connect('supplemental_contests')
    translations = {
      'title': 'title',
      'questionhelp': 'question_help',
      'questionbody': 'question_body'
    }

    # Go through each contests
    for r in contests:
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

      # Match to a boundary or boundaries keys
      r['boundary'] = self.boundary_match_contests(r)

      # Check for any supplemental data
      for si in s_rows:
        s = si.custom
        if s['id'].text == r['id']:
          supplemented = supplemented + 1
          for field in translations:
            if field in s and s[field].text is not None and s[field].text != '':
              r[translations[field]] = s[field].text

      # Save to database
      self.save(['id'], r, 'contests')
      processed = processed + 1

    self.log.info('[%s] Processed contest rows: %s' % ('contests', processed))
    self.log.info('[%s] Supplemented contest rows: %s' % ('contests', supplemented))



  def check_boundaries(self, *args):
    """
    Checks that boundary sets match to an actual boundary set from
    the API.  Can take a bit of time.
    """
    boundary_url = 'http://boundaries.minnpost.com/1.0/boundary/%s'
    contests = scraperwiki.sqlite.select("* FROM contests")
    contests_count = 0;
    boundaries_found = 0;

    for c in contests:
      contests_count = contests_count + 1
      for b in c['boundary'].split(','):
        request = requests.get(boundary_url % b)

        if request.status_code == 200:
          boundaries_found = boundaries_found + 1
        else:
          self.log.info('[%s] Boundary not found: %s | %s' % ('contests', c['title'], b))

    self.log.info('[%s] Contests count: %s' % ('contests', contests_count))
    self.log.info('[%s] Boundaries found: %s' % ('contests', boundaries_found))


  def slugify(self, orig):
    slug = orig.encode('ascii', 'ignore').lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug).strip('-')
    slug = re.sub(r'[-]+', '-', slug)
    return slug

# If calling directly
if __name__ == "__main__":
  scraper = ElectionScraper()
  scraper.route()