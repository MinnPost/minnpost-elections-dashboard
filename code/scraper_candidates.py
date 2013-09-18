#!/usr/bin/env python
"""
Scraper for the 2012 general election in Minnesota.  Main
results page can be found here:

http://electionresults.sos.state.mn.us/enr/ENR/Home/1
http://electionresults.sos.state.mn.us/ENR/Select/Download/1

Describing file columns:

http://electionresults.sos.state.mn.us/ENR/Select/DownloadFileFormats/1



This file gets candidate data.
"""
import re
import scraperwiki
import csv
import datetime
import calendar
import logger

# Set up logger
log = logger.ScraperLogger('scraper_candidates').logger
log.info('[scraper] Scraping Candidate data tables.')

urls = {
  'cand_state_county': 'http://electionresults.sos.state.mn.us/ENR/Results/MediaSupportResult/1?mediafileid=49',
  'cand_local': 'http://electionresults.sos.state.mn.us/ENR/Results/MediaSupportResult/1?mediafileid=12'
}

for u in urls:
  data = scraperwiki.scrape(urls[u])
  candidates = csv.reader(data.splitlines(), delimiter=';', quotechar='"')
  count = 0
  # Make a UTC timestamp
  timestamp = calendar.timegm(datetime.datetime.utcnow().utctimetuple())

  for row in candidates:
    if u == 'cand_state_county':
      # These are techincally not documented
      #
      #	Candidate ID (thirteen characters) 
      #	Candidate Name (First/Last/Suffix all in one field)
      #	Office ID (also sixth through ninth characters of Candidate ID)
      #	Office Title 
      #	County ID (88 = statewide or multi-county race)
      #	unknown code
      # Party
      #	Residence Street Address
      #	Residence City
      #	Residence State
      #	Residence Zip
      #	Campaign Address 
      #	Campaign City
      #	Campaign State
      #	Campaign Zip	
      #	Campaign Phone
      #	Campaign Website
      #	Campaign Email
      # Running mate website
      # Running mate email
      # Running mate phone
      data = {
        'id': 'id-' + row[0],
        'type': u,
        'cand_id': row[0],
        'cand_name': row[1],
        'office_id': row[2],
        'office_title': row[3],
        'county_id': row[4],
        'unknown1': row[5],
        'party': row[6],
        'res_address': row[7].strip(),
        'res_city': row[8].strip(),
        'res_state': row[9].strip(),
        'res_zip': row[10].strip(),
        'cam_address': row[11].strip(),
        'cam_city': row[12].strip(),
        'cam_state': row[13].strip(),
        'cam_zip': row[14].strip(),
        'cam_phone': '' if row[15] == '0000000000' else row[15].strip(),
        'cam_website': row[16].strip(),
        'cam_email': row[17].strip(),
        'rmate_website': row[18].strip(),
        'rmate_email': row[19].strip(),
        'rmate_phone': '' if row[20] == '0000000000' else row[20].strip(),
        'updated': int(timestamp)
      }
    elif u == 'cand_local':
      #	Candidate ID (thirteen characters) 
      #	Candidate Name (First/Last/Suffix all in one field)
      #	Office ID (also sixth through ninth characters of Candidate ID)
      #	Office Title 
      #	County ID (88 = statewide or multi-county race)
      #	MCD code (if applicable, uses FIPS statewide unique codes, not county MCDs; also first five characters of candidate ID) 
      #	School District (if applicable, also first five characters of candidate ID)
      #	Residence Street Address
      #	Residence City
      #	Residence State
      #	Residence Zip
      #	Campaign Address 
      #	Campaign City
      #	Campaign State
      #	Campaign Zip	
      #	Campaign Phone
      #	Campaign Website
      #	Campaign Email
      data = {
        'id': 'id-' + row[0],
        'type': u,
        'cand_id': row[0],
        'cand_name': row[1],
        'office_id': row[2],
        'office_title': row[3],
        'county_id': row[4],
        'mcd_fips_code': row[5],
        'school_district': row[6],
        'res_address': row[7].strip(),
        'res_city': row[8].strip(),
        'res_state': row[9].strip(),
        'res_zip': row[10].strip(),
        'cam_address': row[11].strip(),
        'cam_city': row[12].strip(),
        'cam_state': row[13].strip(),
        'cam_zip': row[14].strip(),
        'cam_phone': '' if row[15] == '0000000000' else row[15].strip(),
        'cam_website': row[16].strip(),
        'cam_email': row[17].strip(),
        'party': 'NP',
        'updated': int(timestamp)
      }
    
    try:
      scraperwiki.sqlite.save(unique_keys = ['id'], data = data, table_name = u)
      count = count + 1
    except Exception, err:
      log.exception('[%s] Error thrown while saving to database: %s' % (u, data))
      raise

  # Output total for each category
  log.info('[%s] Total rows: %s' % (u, count))