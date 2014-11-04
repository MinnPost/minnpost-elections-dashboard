#!/usr/bin/env python
"""
Main scraper.
"""

import sys
import os
import re
import scraperwiki
import unicodecsv
import datetime
import calendar
import logging
import json
import requests
import lxml.html
from gdata.spreadsheet.service import SpreadsheetsService


# This is placeholder for scraperwiki embedding
scraper_sources_inline = None


class ScraperLogger:
    """
    Class for logging.
    """
    log_file = os.path.join(os.path.dirname(__file__), '../logs/scraping.log')
    formatter = logging.Formatter('%(asctime)s | %(name)s | %(levelname)s | %(message)s')

    def __init__(self, name):
        """
        Constructor for logger.
        """
        if not os.path.exists(os.path.dirname(self.log_file)):
            os.makedirs(os.path.dirname(self.log_file))

        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.DEBUG)

        # File handler
        fh = logging.FileHandler(self.log_file)
        fh.setLevel(logging.DEBUG)

        # Commandline handler
        ch = logging.StreamHandler()
        ch.setLevel(logging.DEBUG)

        # Formatting
        fh.setFormatter(self.formatter)
        ch.setFormatter(self.formatter)

        self.logger.addHandler(fh)
        self.logger.addHandler(ch)


class ElectionScraper:
    """
    Election scraper class.
    """
    sources_file = os.path.join(os.path.dirname(__file__), '../scraper_sources.json')
    nonpartisan_parties = ['NP', 'WI']
    index_created = {}
    grouped_inserts = 1000
    db_file = os.path.join(os.path.dirname(__file__), '../scraperwiki.sqlite')


    def __init__(self):
        """
        Constructor
        """
        # Setup logger
        self.log = ScraperLogger('scraper_results').logger
        self.log.info('[scraper] Started.')

        # Scraperwiki's default db is relative to where the script
        # is running but be default the db is created at scraperwiki.sqlite
        # where you are, but this should be empty since we don't use it
        scraperwiki.sql._connect(self.db_file)

        # Make sure the DB is efficient.  Synchronous off means that power outage
        # or possible interruption can corrupt database
        scraperwiki.sql.execute('PRAGMA SYNCHRONOUS = OFF')
        scraperwiki.sql.execute('VACUUM')

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

        # Get the newest set
        newest = 0
        for s in self.sources:
            newest = int(s) if int(s) > newest else newest

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
            scraperwiki.sql.save(unique_keys = ids, data = data, table_name = table)

            # Create index if needed
            if index_method is not None and callable(index_method) and not self.index_created[table]:
                index_method()
                self.index_created[table] = True
        except Exception, err:
            self.log.exception('[%s] Error thrown while saving to table: %s' % (table, data))
            raise


    def save_meta(self, key, value):
        """
        Since the scraperwiki-library changed to a binary blob to store
        the variables and the dumptruck-web code does not apprciate that,
        we get around it by making our own table.    This is not ideal,
        but faster than expexting to get changes pulled upstream.
        """

        # First determine if the table is already made, we need to be explicit
        # about column types
        table_query = "name FROM sqlite_master WHERE type='table' AND name='meta'"
        table_found = scraperwiki.sql.select(table_query)
        if table_query == []:
            create_table = u"CREATE TABLE IF NOT EXISTS %s (`key` text PRIMARY KEY, `value_blob` blob, `type` text)" % quote(self.__vars_table)
            scraperwiki.sql.execute(sql)

        # Then save the data we have
        self.save(['key'], {
            'key': key,
            'value': value,
            'type': type(value).__name__
        }, 'meta')



    def scrape(self, group_type, election, *args):
        """
        Main scraper handler.
        """

        # Usually we just want the newest election but allow for other situations
        election = election if election is not None and election != '' else self.newest_election
        self.election = election

        if election not in self.sources:
            return

        # Get metadata about election
        self.election_meta = self.sources[election]['meta'] if 'meta' in self.sources[election] else {}

        for i in self.sources[election]:
            s = self.sources[election][i]

            if 'type' in s and s['type'] == group_type:
                # Ensure we have a valid parser for this type
                parser = 'parser_' + s['type']
                parser_method = getattr(self, parser, None)
                if callable(parser_method):
                    # Check if election has base_url
                    s['url'] = self.election_meta['base_url'] + s['url'] if 'base_url' in self.election_meta else s['url']

                    # Get data from URL
                    try:
                        scraped = scraperwiki.scrape(s['url'])
                        # latin-1 is to support the occasional accent character
                        rows = unicodecsv.reader(scraped.splitlines(), delimiter=';', quotechar='|', encoding='latin-1')
                    except Exception, err:
                        self.log.exception('[%s] Error when trying to read URL and parse CSV: %s' % (s['type'], s['url']))
                        raise

                    # Index is created after first insert
                    if s['table'] not in self.index_created:
                        self.index_created[s['table']] = False
                    index = 'index_' + s['table']
                    index_method = getattr(self, index, None)

                    # Go through rows.
                    # Save every x
                    count = 0
                    group = []
                    for row in rows:
                        parsed = parser_method(row, i, s['table'], s)
                        group.append(parsed)
                        if len(group) % self.grouped_inserts == 0:
                            self.save(['id'], group, s['table'], index_method)
                            group = []
                        count = count + 1

                    if len(group) > 0:
                        self.save(['id'], group, s['table'], index_method)

                    """
                    Non-grouped.
                    count = 0
                    for row in rows:
                        parsed = parser_method(row, i, s['table'], s)
                        self.save(['id'], parsed, s['table'], index_method)
                        count = count + 1
                    """


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
            return []

        if source not in self.sources[self.election]:
            return []

        try:
            s = self.sources[self.election][source]
            client = SpreadsheetsService()
            feed = client.GetWorksheetsFeed(s['spreadsheet_id'], visibility='public', projection='basic')
            worksheet_id = feed.entry[s['worksheet_id']].id.text.rsplit('/', 1)[1]
            rows = client.GetListFeed(key=s['spreadsheet_id'], wksht_id=worksheet_id, visibility='public', projection='values').entry
        except Exception, err:
            rows = None
            self.log.exception('[%s] Unable to connecto supplemental source: %s' % ('supplement', s))

        # Process the rows into a more usable format.  And handle typing
        s_types = {
            'percentage': float,
            'votes_candidate': int,
            'ranked_choice_place': int,
            'percent_needed': float
        }
        if len(rows) > 0:
            p_rows = []
            for r in rows:
                p_row = {}
                for f in r.custom:
                    # Try typing
                    c = f.replace('.', '_')
                    if r.custom[f].text is not None and c in s_types:
                        p_row[c] = s_types[c](r.custom[f].text)
                    else:
                        p_row[c] = r.custom[f].text

                p_rows.append(p_row)

            return p_rows

        return rows


    def parser_areas(self, row, group, table, source):
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
            parsed['id'] =    parsed['id'] + row[0] + '-' + row[2]
            parsed['county_id'] = row[0]
            parsed['county_name'] = row[1]
            parsed['mcd_id'] = row[2]
            parsed['name'] = row[1]

        if group == 'counties':
            parsed['id'] =    parsed['id'] + row[0]
            parsed['county_id'] = row[0]
            parsed['county_name'] = row[1]
            parsed['precincts'] = row[2]

        if group == 'precincts':
            parsed['id'] =    parsed['id'] + row[0] + '-' + row[1]
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
            parsed['id'] =    parsed['id'] + row[0]
            parsed['school_district_id'] = row[0]
            parsed['school_district_name'] = row[1]
            parsed['county_id'] = row[2]
            parsed['county_name'] = row[3]

        return parsed


    def parser_questions(self, row, group, table, source):
        """
        Parser for ballot questions data.  Note that for whatever reason there
        are duplicates in the MN SoS data source.

        County ID
        Office Code
        MCD code, if applicable (using FIPS statewide unique codes, not county MCDs)
        School District Numbe, if applicable
        Ballot Question Number
        Question Title
        Question Body
        """
        timestamp = calendar.timegm(datetime.datetime.utcnow().utctimetuple())
        combined_id = 'id-' + row[0] + '-' + row[1] + '-' + row[2] + '-' + row[3]

        # We have to do some hackery to get the right contest ID
        # County
        # 0 - - - 1
        # id-MN-38---0421

        # City question
        # ^0 - - 2 - 1
        #id-MN---43000-1131

        # School
        # ^0 - - 3 - 1
        # id-MN---110-5031
        contest_id = 'id-MN-' + row[0] + '-' + row[3] + '-' + row[2] + '-' + row[1]
        if row[2] is not None and row[2] != '':
            contest_id = 'id-MN---' + row[2] + '-' + row[1]
        if row[3] is not None and row[3] != '':
            contest_id = 'id-MN---' + row[3] + '-' + row[1]

        # Make row
        parsed = {
            'id': combined_id,
            'contest_id': contest_id,
            'title': row[4],
            'sub_title': row[5],
            'question_body': row[6],
            'updated': int(timestamp)
        }

        return parsed


    def parser_results(self, row, group, table, source):
        """
        Parser for results type scraping.    We actually split the data into a results
        table as well as a contests table.
        """
        timestamp = calendar.timegm(datetime.datetime.utcnow().utctimetuple())
        self.contests_updated = {} if getattr(self, 'contests_updated', None) is None else self.contests_updated
        ranked_choice_translations = { 'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5, 'sixth': 6, 'seventh': 7, 'eighth': 8, 'nineth': 9, 'tenth': 10, 'final': 100 }
        ranked_choice_place = None

        # SSD1 is Minneapolis and ISD1 is Aitkin, though they have the same
        # numbers and therefor make the same ID
        mpls_ssd = re.compile('.*\(SSD #1\).*', re.IGNORECASE).match(row[4])
        if mpls_ssd is not None:
            row[5] = '1-1'

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

        # Check if records already exists, but first if table exists yet.    Also get
        # current records as INSERT or UPDATE statements require all data.
        found_result = False
        found_contest = False
        table_query = "name FROM sqlite_master WHERE type='table' AND name='%s'"
        row_query = "* FROM %s WHERE id = '%s'"
        found_result_table = scraperwiki.sql.select(table_query % 'results')
        found_contest_table = scraperwiki.sql.select(table_query % 'contests')
        if found_result_table != []:
            found_results = scraperwiki.sql.select(row_query % ('results', row_id))
        if found_contest_table != []:
            found_contests = scraperwiki.sql.select(row_query % ('contests', contest_id))

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

            # Primary is not designated in anyway, but we can make some initial
            # guesses.    All contests in an election are considered primary, but
            # non-partisan ones only mean there is more than one seat available.
            is_primary = self.election_meta['primary'] if 'primary' in self.election_meta else False
            re_question = re.compile('.*\question.*', re.IGNORECASE)
            matched_question = re_question.match(row[4])
            is_primary = False if matched_question is not None else is_primary

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
                'seats': int(matched_seats.group(1)) if matched_seats is not None else 1,
                'ranked_choice': ranked_choice is not None,
                'primary': is_primary,
                'scope': source['contest_scope'] if 'contest_scope' in source else None,
                'updated': int(timestamp)
            }

        # Update the contests table. This should really only happen once per
        # contest
        if contests_record['id'] not in self.contests_updated:
            self.save(['id'], contests_record, 'contests')
            self.contests_updated[contests_record['id']] = True

        # Return results record to be updated
        return results_record


    def index_results(self):
        index_query = "CREATE INDEX IF NOT EXISTS %s ON results (%s)"
        scraperwiki.sql.execute(index_query % ('office_name', 'office_name'))
        scraperwiki.sql.execute(index_query % ('candidate', 'candidate'))
        scraperwiki.sql.execute(index_query % ('contest_id', 'contest_id'))
        self.log.info('[%s] Creating indices for results table.' % ('results'))


    def index_contests(self):
        index_query = "CREATE INDEX IF NOT EXISTS %s ON contests (%s)"
        scraperwiki.sql.execute(index_query % ('title', 'title'))
        self.log.info('[%s] Creating indices for contests table.' % ('contests'))


    def post_results(self):
        # Update some vars for easy retrieval
        self.save_meta('updated', int(calendar.timegm(datetime.datetime.utcnow().utctimetuple())))
        contests = scraperwiki.sql.select("COUNT(DISTINCT contest_id) AS contest_count FROM results")
        if contests != []:
            self.save_meta('contests', int(contests[0]['contest_count']))

        # Use the first state level race to get general number of precincts reporting
        state_contest = scraperwiki.sql.select("* FROM contests WHERE county_id = '88' LIMIT 1")
        if state_contest != []:
            self.save_meta('precincts_reporting', int(state_contest[0]['precincts_reporting']))
            self.save_meta('total_effected_precincts', int(state_contest[0]['total_effected_precincts']))

        # Handle any supplemental data
        supplement_update = 0
        supplement_insert = 0
        supplement_delete = 0
        s_rows = self.supplement_connect('supplemental_results')
        for s in s_rows:
            # Parse some values we know we will look at
            percentage = float(s['percentage']) if s['percentage'] is not None else None
            votes_candidate = int(s['votes_candidate']) if s['votes_candidate'] is not None else None
            ranked_choice_place = int(s['ranked_choice_place']) if s['ranked_choice_place'] is not None else None
            enabled = True if s['enabled'] is not None else False
            row_id = s['id']

            # Check for existing rows
            results = scraperwiki.sql.select("* FROM results WHERE id = '%s'" % (row_id))

            # If valid data
            if row_id is not None and s['contest_id'] is not None and s['candidate_id'] is not None:
                # If results exist and enabled then update, else if results and not
                # enabled and is supplemental remove, otherwise add
                if (votes_candidate > 0 or s['votescandidate'] == '0') and results != [] and enabled:
                    result = results[0]
                    result['percentage'] = percentage
                    result['votes_candidate'] = votes_candidate
                    result['ranked_choice_place'] = ranked_choice_place
                    self.save(['id'], result, 'results')
                    supplement_update = supplement_update + 1
                elif results != [] and not enabled and results[0]['results_group'] == 'supplemental_results':
                    scraperwiki.sql.execute("DELETE FROM results WHERE id = '%s'" % (row_id))
                    scraperwiki.sql.commit()
                    supplement_delete = supplement_delete + 1
                elif (votes_candidate > 0 or s['votes_candidate'] == '0') and enabled:
                    # Add new row, make sure to mark the row as supplemental
                    result = {
                        'id': row_id,
                        'percentage': percentage,
                        'votes_candidate': votes_candidate,
                        'ranked_choice_place': ranked_choice_place,
                        'candidate': s['candidate'],
                        'office_name': s['officename'],
                        'contest_id': s['contestid'],
                        'candidate_id': s['candidateid'],
                        'results_group': 'supplemental_results'
                    }
                    self.save(['id'], result, 'results')
                    supplement_insert = supplement_insert + 1

        self.log.info('[%s] Supplemental rows created: %s' % ('results', supplement_insert))
        self.log.info('[%s] Supplemental rows updated: %s' % ('results', supplement_update))
        self.log.info('[%s] Supplemental rows deleted: %s' % ('results', supplement_delete))



    def boundary_match_contests(self, parsed_row):
        """
        Logic to figure out what boundary the contest is for.    This will get messy.
        """
        boundary = ''
        boundary_type = False

        # State level race
        if parsed_row['scope'] == 'state':
            boundary = '27-minnesota-state-2014'
            boundary_type = 'minnesota-state-2014'

        # US House districts
        if parsed_row['scope'] == 'us_house':
            us_house_match = re.compile('.*\U.S. Representative District ([0-9]+).*', re.IGNORECASE).match(parsed_row['office_name'])
            if us_house_match is not None:
                boundary = us_house_match.group(1) + '-congressional-district-2012'
                boundary_type = 'congressional-districts-2012'
            else:
                self.log.info('[%s] Could not find US House boundary for: %s' % ('results', parsed_row['office_name']))

        # State House districts
        if parsed_row['scope'] == 'state_house':
            state_house_match = re.compile('.*\State Representative District (\w+).*', re.IGNORECASE).match(parsed_row['office_name'])
            if state_house_match is not None:
                boundary = state_house_match.group(1).lower() + '-state-house-district-2012'
                boundary_type = 'state-house-districts-2012'
            else:
                self.log.info('[%s] Could not find State House boundary for: %s' % ('results', parsed_row['office_name']))

        # State court districts.    Judge - 7th District Court 27
        if parsed_row['scope'] == 'district_court':
            court_match = re.compile('.*\Judge - ([0-9]+).*', re.IGNORECASE).match(parsed_row['office_name'])
            if court_match is not None:
                boundary = court_match.group(1).lower() + '-district-court-2012'
                boundary_type = 'district-courts-2012'
            else:
                self.log.info('[%s] Could not find State District Court boundary for: %s' % ('results', parsed_row['office_name']))

        # School district is in the office name.    Special school district for
        # Minneapolis is "1-1".  Unfotunralty SSD1 and ISD1 are essentially the
        # same as far as the incoming data so we have to look at title.
        #
        # There are some bad data and not sure if it
        # is boundary data (from the Leg) or on the SoS side.    Minneapolis
        # sub-school districts are the same at the Minneapolis Park and Rec
        # districts.    There are a number of sub-school districts it looks
        # like
        isd_bad_data = {
            '2769': '769',
            '2906': '627',
            '2907': '513',
            '2908': '207',
        }
        if parsed_row['scope'] == 'school':
            isd_match = re.compile('.*\(ISD #([0-9]+)\).*', re.IGNORECASE).match(parsed_row['office_name'])
            ssd_match = re.compile('.*\(SSD #([0-9]+)\).*', re.IGNORECASE).match(parsed_row['office_name'])
            district_match = re.compile('.*district ([0-9]+) \(.*', re.IGNORECASE).match(parsed_row['office_name'])

            if isd_match is not None:
                isd_match_value = isd_match.group(1)
                isd_match_value = isd_bad_data[isd_match_value] if isd_match_value in isd_bad_data else isd_match_value

                boundary = isd_match_value + '-school-district-2013'
                boundary_type = 'school-districts-2013'
            elif ssd_match is not None:
                ssd_match_value = '1-1' if ssd_match.group(1) == '1' else ssd_match.group(1)

                if ssd_match_value == '1-1' and district_match is not None:
                    boundary = district_match.group(1) + '-minneapolis-parks-and-recreation-district-2012'
                    boundary_type = 'minneapolis-parks-and-recreation-districts-2012'
                else:
                    boundary = ssd_match_value + '-school-district-2013'
                    boundary_type = 'school-districts-2013'
            else:
                self.log.info('[%s] Could not find (I|S)SD boundary for: %s' % ('results', parsed_row['office_name']))

        # County should be provide, but the results also have results for county
        # comissioner which are sub-county boundaries
        if parsed_row['scope'] == 'county':
            comissioner_match = re.compile('.*Commissioner District.*', re.IGNORECASE).match(parsed_row['office_name'])
            if comissioner_match is not None:
                boundary =    '%s-%02d-county-commissioner-district-2012' % (int(parsed_row['county_id']),    int(parsed_row['district_code']))
                boundary_type = 'county-commissioner-districts-2012'
            else:
                boundary = '%s-county-2010' % int(parsed_row['county_id'])
                boundary_type = 'counties-2010'

        # This includes both municpal (city) level results, plus sub-municpal, such
        # as city council results.
        #
        # For municpal results.    The boundary code is SSCCCMMMM where:
        #     * SS is state ID which is 27
        #     * CCC is the county FIPS code which is the MN County Code * 2 - 1
        #     * MMMM is the municpal code
        # The main issue is getting the county code which is not included in the
        # results but instead in a separate table.
        #
        # It also turns out that there cities, like White Bear Lake City
        # which is in multiple counties which means they have more than one
        # boundary.
        #
        # For the sub-municpal results, we need wards.    Unfortunately the boundary
        # id for wards is the actual name of the city and the ward number due to the
        # face that the original boundary data did not have mcd codes in it.
        #
        # There are also minneapolis park and recs commissioner which is its own
        # thing.
        #
        # And there is also just wrong data occassionaly.
        if parsed_row['scope'] == 'municipal':
            # Checks
            wards_matched = re.compile('.*(Council Member Ward|Council Member District) ([0-9]+).*\((((?!elect).)*)\).*', re.IGNORECASE).match(parsed_row['office_name'])
            mpls_parks_matched = re.compile('.*Park and Recreation Commissioner District ([0-9]+).*', re.IGNORECASE).match(parsed_row['office_name'])

            # Check for sub municpal parts first
            if wards_matched is not None:
                boundary = self.slugify(wards_matched.group(3)) + '-w-' + '{0:02d}'.format(int(wards_matched.group(2))) + '-ward-2012'
                boundary_type = 'wards-2012'
            elif mpls_parks_matched is not None:
                boundary = mpls_parks_matched.group(1) + '-minneapolis-parks-and-recreation-district-2014'
                boundary_type = 'minneapolis-parks-and-recreation-districts-2014'
            else:
                if parsed_row['county_id']:
                    boundary = self.boundary_make_mcd(parsed_row['county_id'], parsed_row['district_code'])
                    boundary_type = 'minor-civil-divisions-2010'
                else:
                    boundary_type = 'minor-civil-divisions-2010'
                    mcd = scraperwiki.sql.select("* FROM areas WHERE areas_group = 'municipalities' AND mcd_id = '%s'" % (parsed_row['district_code']))
                    if mcd != []:
                        boundaries = []
                        for r in mcd:
                            boundaries.append(self.boundary_make_mcd(r['county_id'], parsed_row['district_code']))
                        boundary = ','.join(boundaries)
                    else:
                        self.log.info('[%s] Could not find corresponding county for municpality: %s' % ('results', parsed_row['office_name']))

        # Hospital districts.
        #
        # Mostly, the district ID provided is for the best municipal
        # entity.    The only way to really figure out the hospital district ID
        # (which is kind of arbitrary) is to use the boundary service
        #
        # Otherwise, the actual hospital id is given
        if parsed_row['scope'] == 'hospital':
            # MCD districts are 5 digits with leading zeros, while hospital districts
            # are 3 or 4
            if len(parsed_row['district_code']) < 5:
                boundary = '%s-hospital-district-2012' % (int(parsed_row['district_code']))
                boundary_type = 'hospital-districts-2012'
            else:
                # We need the county ID and it is not in results, so we have to look
                # it up, and there could more than one
                mcd = scraperwiki.sql.select("* FROM areas WHERE areas_group = 'municipalities' AND mcd_id = '%s'" % (parsed_row['district_code']))
                if mcd != []:
                    for r in mcd:
                        # Find intersection
                        mcd_boundary_id = self.boundary_make_mcd(r['county_id'], parsed_row['district_code'])
                        boundary_url = 'http://boundaries.minnpost.com/1.0/boundary/?intersects=%s&sets=%s';
                        request = requests.get(boundary_url % (mcd_boundary_id, 'hospital-districts-2012'))

                        if request.status_code == 200:
                            r = request.json()
                            boundary = r['objects'][0]['slug']
                            break

                    if boundary == '':
                        self.log.info('[%s] Hosptial boundary intersection not found: %s' % ('results', parsed_row['title']))

                else:
                    self.log.info('[%s] Could not find corresponding county for municpality: %s' % ('results', parsed_row['office_name']))


        # Add to types
        if boundary_type != False and boundary_type not in self.found_boundary_types:
            self.found_boundary_types.append(boundary_type)

        # General notice if not found
        if boundary == '':
            self.log.info('[%s] Could not find boundary for: %s' % ('results', parsed_row['office_name']))

        return boundary


    def boundary_make_mcd(self, county_id, district):
        """
        Makes MCD code from values.
        """
        bad_data = {
            '2713702872': '2713702890', # Aurora City
            '2703909154': '2710909154', # Bryon
            '2706109316': '2706103916', # Calumet
            '2716345952': '2716358900' # Scandia
        }
        fips = '{0:03d}'.format((int(county_id) * 2) - 1)
        mcd_id = '27' + fips + district
        if mcd_id in bad_data:
            mcd_id = bad_data[mcd_id]
        return mcd_id + '-minor-civil-division-2010'


    def match_contests(self, election, *args):
        """
        Update contests table matching things like boundaries.    This is for the meta data
        for each contest, not for the voting numbers, so it doesn't need to be run
        every update of results.
        """
        processed = 0
        supplemented = 0
        index_created = False
        contests = scraperwiki.sql.select("* FROM contests")

        # Usually we just want the newest election but allow for other situations
        election = election if election is not None and election != '' else self.newest_election
        self.election = election

        # Attach election meta data for front-end querying
        if 'meta' in self.sources[self.election]:
            for m in self.sources[self.election]['meta']:
                self.save_meta(m, self.sources[self.election]['meta'][m])

        # Get data from Google spreadsheet
        s_rows = self.supplement_connect('supplemental_contests')

        # Get question data
        questions = scraperwiki.sql.select('* FROM questions')

        # Track which boundary sets we use
        self.found_boundary_types = []

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

            # Check if there is a question match for the contest
            for q in questions:
                if q['contest_id'] == r['id']:
                    r['question_body'] = q['question_body']
                    r['sub_title'] = q['sub_title']

            # Determine partisanship for contests for other processing.    We need to look
            # at all the candidates to know if the contest is nonpartisan or not.
            results = scraperwiki.sql.select("* FROM results WHERE contest_id = '%s' AND party_id NOT IN ('%s')" % (r['id'], "', '".join(self.nonpartisan_parties)))
            r['partisan'] = True if results != [] else False

            # For non-partisan primaries, the general rule is that there are twice
            # as many winners as there are seats available for the general election.
            # Unfortunately we can't determine this from the existing value
            # otherwise, it will just grow.
            if r['primary'] and not r['partisan']:
                re_seats = re.compile('.*\(elect ([0-9]+)\).*', re.IGNORECASE)
                matched_seats = re_seats.match(r['office_name'])
                seats = matched_seats.group(1) if matched_seats is not None else 1
                r['seats'] = int(seats) * 2

            # Check for any supplemental data
            for s in s_rows:
                if s['id'] == r['id']:
                    supplemented = supplemented + 1
                    for f in s:
                        if s[f] is not None and s[f] != '':
                            r[f] = s[f]

            # Save to database
            self.save(['id'], r, 'contests')
            processed = processed + 1

        self.log.info('[%s] Processed contest rows: %s' % ('contests', processed))
        self.log.info('[%s] Supplemented contest rows: %s' % ('contests', supplemented))
        self.log.info('[%s] Found the following boundary sets: %s' % ('contests', self.found_boundary_types))



    def check_boundaries(self, *args):
        """
        Checks that boundary sets match to an actual boundary set from
        the API.    Can take a bit of time.
        """
        boundary_url = 'http://boundaries.minnpost.com/1.0/boundary/%s'
        contests = scraperwiki.sql.select("* FROM contests")
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

    # <Scraperwiki commands go here>
