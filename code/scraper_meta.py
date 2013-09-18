#!/usr/bin/env python
"""
Scraper for the 2012 general election in Minnesota.  Main
results page can be found here:

http://electionresults.sos.state.mn.us/enr/ENR/Home/1
http://electionresults.sos.state.mn.us/ENR/Select/Download/1

Describing file columns:

http://electionresults.sos.state.mn.us/ENR/Select/DownloadFileFormats/1



This file gets meta data.
"""
import re
import scraperwiki
import csv
import datetime
import calendar
import logger

# Set up logger
log = logger.ScraperLogger('scraper_meta').logger
log.info('[scraper] Scraping Meta data tables.')

urls = {
  #'meta_questions': 'http://electionresults.sos.state.mn.us/ENR/Results/MediaSupportResult/1?mediafileid=11',
  'meta_parties': 'http://minnesotaelectionresults.sos.state.mn.us/Results/MediaSupportResult/7?mediafileid=5'
}

for u in urls:
  data = scraperwiki.scrape(urls[u])
  candidates = csv.reader(data.splitlines(), delimiter=';', quotechar='"')
  count = 0
  # Make a UTC timestamp
  timestamp = calendar.timegm(datetime.datetime.utcnow().utctimetuple())

  for row in candidates:
    if u == 'meta_questions':
      # County ID 
      # Office Code
      # MCD code, if applicable (using FIPS statewide unique codes, not county MCDs)
      # School District Numbe, if applicable
      # Ballot Question Number
      # Question Title
      # Question Body
      
      # SCHOOL DISTRICT QUESTION 1 (ISD #100)
      
      # Sweet identifiable, linked data, Batman.  Matching up
      # questions with results is just annoying
      results_id = 'id-' + row[0] + '--' + row[2] + '-' + row[1]
      if row[4].lower().find('school') != -1:
        results_id = 'id---' + row[3] + '-' + row[1]
      elif row[4].lower().find('amendment') != -1:
        results_id = 'id-' + row[0] + '--' + row[2] + '-' + row[1]
      elif row[4].lower().find('county') == -1:
        results_id = 'id---' + row[2].zfill(5) + '-' + row[1]
      
      data = {
        'id': 'id-' + row[0] + '-' + row[1] + '-' + row[2] + '-' + row[3],
        'results_id': results_id,
        'county_id': row[0],
        'office_code': row[1],
        'mcd_fips_code': row[2],
        'school_district': row[3],
        'question_number': row[4],
        'question_title': row[5],
        'question_body': row[6],
        'updated': int(timestamp)
      }
    elif u == 'meta_parties':
      # Party Abbreviation
      # Party Name 
      # Party ID 
      data = {
        'id': 'id-' + row[2],
        'party_code': row[0],
        'party_name': row[1],
        'party_id': row[2],
        'updated': int(timestamp)
      }
    
    try:
      scraperwiki.sqlite.save(unique_keys = ['id'], data = data, table_name = u)
      count = count + 1
    except Exception, err:
      log.exception('[%s] Error thrown while saving to database.' % (u, count))
      raise

  # Output total for each category
  log.info('[%s] Total rows: %s' % (u, count))