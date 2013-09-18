#!/usr/bin/env python
"""
Scraper for the 2012 general election in Minnesota.  Main
results page can be found here:

http://electionresults.sos.state.mn.us/enr/ENR/Home/1
http://electionresults.sos.state.mn.us/ENR/Select/Download/1

Describing file columns:

http://electionresults.sos.state.mn.us/ENR/Select/DownloadFileFormats/1

This file gets the results for all elections by precincts.
"""
import re
import scraperwiki
import csv
import datetime
import calendar
import logger

# Set up logger
log = logger.ScraperLogger('scraper_results_precinct').logger
log.info('[scraper_results_precinct] Scraping general Results by Precints data tables.')

urls = {
  'results_precinct': 'ftp://media:results@ftp.sos.state.mn.us/20121106_SG/allracesbyprecinct.txt'
}

for u in urls:
  log.info('[scraper_results_precinct] Starting downloading and reading.')
  text_file = open('data/allracesbyprecinct.txt', 'rb')
  candidates = csv.reader(text_file, delimiter=';', quotechar='|')
  log.info('[scraper_results_precinct] Finished downloading and reading.')
  
  count = 0
  # Make a UTC timestamp
  timestamp = calendar.timegm(datetime.datetime.utcnow().utctimetuple())

  for row in candidates:
    # Create ids
    cand_name_id = re.sub(r'\W+', '', row[7])
    office_name_id = re.sub(r'\W+', '', row[4])
    base_id = 'id-' + row[1] + '-' + row[2] + '-' + row[5] + '-' + row[3]
    row_id = base_id + '-' + row[6]
    id_name = base_id + '-' + row[6] + '-' + office_name_id + '-' + cand_name_id
    race_id = base_id
    race_id_name = base_id + '-' + office_name_id

    data = {
      'id': row_id,
      'office_type': u,
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
      'updated': int(timestamp)
    }
    
    try:
      scraperwiki.sqlite.save(unique_keys = ['id'], data = data, table_name = 'results_precinct')
      count = count + 1
      if count % 1000 == 0:
        log.info('[%s] Row: %s' % (u, count))
    except Exception, err:
      log.exception('[%s] Error thrown while saving to database: %s' % (u, data))
      raise

  # Output total for each category
  log.info('[%s] Total rows: %s' % (u, count))