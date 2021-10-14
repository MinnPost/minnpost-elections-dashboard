import logging
import os
import json
import re
import csv
import urllib.request
import requests
#import unicodecsv
import calendar
import datetime
import lxml.html
from flask import current_app
from app import cache, db

from sqlalchemy.ext.compiler import compiles
from sqlalchemy.sql.expression import Insert

from sheetfu import SpreadsheetApp

LOG = logging.getLogger(__name__)
scraper_sources_inline = None

class ScraperModel(object):

    nonpartisan_parties = ['NP', 'WI', 'N P']

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
            #sources_file = current_app.config['SOURCES_FILE']
            sources_file = os.path.join(current_app.root_path, '../scraper_sources.json')
            data = open(sources_file)
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


    def set_election_metadata(self):
        sources = self.read_sources()
        election = self.set_election()

        if election not in sources:
            return

        # Get metadata about election
        election_meta = sources[election]['meta'] if 'meta' in sources[election] else {}
        return election_meta


    def parse_election(self, source, election_meta = {}):

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
                return rows
            except Exception as err:
                LOG.exception('[%s] Error when trying to read URL and parse CSV: %s' % (source['type'], source['url']))
                raise


    def from_dict(self, data, new=False):
        for field in data:
            setattr(self, field, data[field])


    def post_processing(self, type):

        # Handle any supplemental data
        spreadsheet_rows = self.supplement_connect('supplemental_' + type)
        supplemented_rows = []
        insert_rows = {'action': 'insert', 'rows': []}
        update_rows = {'action': 'update', 'rows': []}
        delete_rows = {'action': 'delete', 'rows': []}

        if spreadsheet_rows is None:
            return supplemented_rows

        # for each row in the spreadsheet
        for spreadsheet_row in spreadsheet_rows:
            supplement_row = self.supplement_row(spreadsheet_row)
            if 'rows' in supplement_row:
                #supplemented_rows.append(supplement_row)
                if supplement_row['action'] == 'insert' and supplement_row['rows'] not in insert_rows['rows']:
                    #insert_rows['rows'] = [*insert_rows['rows'], *supplement_row['rows']]
                    insert_rows['rows'] = list(set(insert_rows['rows'] + supplement_row['rows']))
                elif supplement_row['action'] == 'update' and supplement_row['rows'] not in update_rows['rows']:
                    #update_rows['rows'] = [*update_rows['rows'], *supplement_row['rows']]
                    update_rows['rows'] = list(set(update_rows['rows'] + supplement_row['rows']))
                elif supplement_row['action'] == 'delete' and supplement_row['rows'] not in delete_rows['rows']:
                    #delete_rows['rows'] = [*delete_rows['rows'], *supplement_row['rows']]
                    delete_rows['rows'] = list(set(insert_rows['rows'] + supplement_row['rows']))
        if insert_rows not in supplemented_rows:
            supplemented_rows.append(insert_rows)
        if update_rows not in supplemented_rows:
            supplemented_rows.append(update_rows)
        if delete_rows not in supplemented_rows:
            supplemented_rows.append(delete_rows)
        return supplemented_rows


    @cache.cached(timeout=30, query_string=True)
    def supplement_connect(self, source):
        """
        Connect to supplemental source (Google spreadsheets) given set.
        """
        sources = self.read_sources()
        election = self.set_election()

        if election not in sources:
            return

        try:
            s = sources[election][source]
            client = SpreadsheetApp(from_env=True)
            spreadsheet = client.open_by_id(s['spreadsheet_id'])
            sheets = spreadsheet.get_sheets()
            sheet = sheets[s['worksheet_id']]
            data_range = sheet.get_data_range()
            rows = data_range.get_values()
        except Exception as err:
            rows = None
            LOG.exception('[%s] Unable to connect to supplemental source: %s' % ('supplement', s))

        # Process the rows into a more usable format.  And handle typing
        s_types = {
            'percentage': float,
            'votes_candidate': int,
            'ranked_choice_place': int,
            'percent_needed': float
        }
        if rows:
            if len(rows) > 0:
                headers = rows[0]
                data_rows = []
                for row_key, row in enumerate(rows):
                    if row_key > 0:
                        data_row = {}
                        for field_key, field in enumerate(row):
                            column = headers[field_key].replace('.', '_')
                            if field is not None and column in s_types:
                                data_row[column] = s_types[column](field)
                            else:
                                data_row[column] = field
                        data_rows.append(data_row)
                return data_rows
        return rows


class Area(ScraperModel, db.Model):

    __tablename__ = "areas"

    area_id = db.Column(db.String(255), primary_key=True, autoincrement=False, nullable=False)
    areas_group = db.Column(db.String(255))
    county_id = db.Column(db.String(255))
    county_name = db.Column(db.String(255))
    ward_id = db.Column(db.String(255))
    precinct_id = db.Column(db.String(255))
    precinct_name = db.Column(db.String(255))
    state_senate_id = db.Column(db.String(255))
    state_house_id = db.Column(db.String(255))
    county_commissioner_id = db.Column(db.String(255))
    district_court_id = db.Column(db.String(255))
    soil_water_id = db.Column(db.String(255))
    school_district_id = db.Column(db.String(255))
    school_district_name = db.Column(db.String(255))
    mcd_id = db.Column(db.String(255))
    precincts = db.Column(db.String(255))
    name = db.Column(db.String(255))
    updated = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    def __init__(self, **kwargs):
        super(Area, self).__init__(**kwargs)
    
    def __repr__(self):
        return '<Area {}>'.format(self.area_id)

    def parser(self, row, group):

        # General data
        parsed = {
            'area_id': group + '-',
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
            'name': ''
        }

        if group == 'municipalities':
            parsed['area_id'] = parsed['area_id'] + row[0] + '-' + row[2]
            parsed['county_id'] = row[0]
            parsed['county_name'] = row[1]
            parsed['mcd_id'] = "{0:05d}".format(int(row[2])) #enforce 5 digit
            parsed['name'] = row[1]

        if group == 'counties':
            parsed['area_id'] = parsed['area_id'] + row[0]
            parsed['county_id'] = row[0]
            parsed['county_name'] = row[1]
            parsed['precincts'] = row[2]

        if group == 'precincts':
            parsed['area_id'] = parsed['area_id'] + row[0] + '-' + row[1]
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
            parsed['area_id'] = parsed['area_id'] + row[0]
            parsed['school_district_id'] = row[0]
            parsed['school_district_name'] = row[1]
            parsed['county_id'] = row[2]
            parsed['county_name'] = row[3]

        return parsed

class Contest(ScraperModel, db.Model):

    __tablename__ = "contests"

    contest_id = db.Column(db.String(255), primary_key=True, autoincrement=False, nullable=False)
    office_id = db.Column(db.String(255))
    results_group = db.Column(db.String(255))
    office_name = db.Column(db.String(255))
    district_code = db.Column(db.String(255))
    state = db.Column(db.String(255))
    county_id = db.Column(db.String(255))
    precinct_id = db.Column(db.String(255))
    precincts_reporting = db.Column(db.BigInteger())
    total_effected_precincts = db.Column(db.BigInteger())
    total_votes_for_office = db.Column(db.BigInteger())
    seats = db.Column(db.BigInteger())
    ranked_choice = db.Column(db.Boolean())
    primary = db.Column(db.Boolean())
    scope = db.Column(db.String(255))
    title = db.Column(db.String(255))
    boundary = db.Column(db.String(255))
    partisan = db.Column(db.Boolean())
    question_body = db.Column(db.Text)
    sub_title = db.Column(db.String(255))
    incumbent_party = db.Column(db.String(255))
    called = db.Column(db.Boolean())
    updated = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    def __init__(self, **kwargs):
        self.result_id = kwargs.get('result_id')
        self.contest_id = kwargs.get('contest_id')
        self.office_id = kwargs.get('office_id')
        self.results_group = kwargs.get('results_group')
        self.office_name = kwargs.get('office_name')
        self.district_code = kwargs.get('district_code')
        self.state = kwargs.get('state')
        self.county_id = kwargs.get('county_id')
        self.precinct_id = kwargs.get('precinct_id')
        self.precincts_reporting = kwargs.get('precincts_reporting')
        self.total_effected_precincts = kwargs.get('total_effected_precincts')
        self.total_votes_for_office = kwargs.get('total_votes_for_office')
        self.seats = kwargs.get('seats')
        self.ranked_choice = kwargs.get('ranked_choice')
        self.primary = kwargs.get('primary')
        self.scope = kwargs.get('scope')
        self.title = kwargs.get('title')
        self.boundary = kwargs.get('boundary')
        self.partisan = kwargs.get('partisan')
        self.question_body = kwargs.get('question_body')
        self.sub_title = kwargs.get('sub_title')
        self.incumbent_party = kwargs.get('incumbent_party')
        self.called = kwargs.get('called')
    
    def __repr__(self):
        return '<Contest {}>'.format(self.contest_id)

    def parser(self, row, group, source):
        """
        Parser for contest scraping.
        """

        election_meta = self.set_election_metadata()

        # SSD1 is Minneapolis and ISD1 is Aitkin, though they have the same
        # numbers and therefor make the same ID
        mpls_ssd = re.compile(r'.*\(SSD #1\).*', re.IGNORECASE).match(row[4])
        if mpls_ssd is not None:
            row[5] = '1-1'

        # Create ids.
        # id-State-County-Precinct-District-Office
        base_id = 'id-' + row[0] + '-' + row[1] + '-' + row[2] + '-' + row[5] + '-' + row[3]

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
        ranked_choice = re.compile(r'.*(first|second|third|\w*th) choice.*', re.IGNORECASE).match(row[4])
        if ranked_choice is not None:
            office_id = ''.join(row[3].split())[:-1] + '1'
            contest_id = 'id-' + row[0] + '-' + row[1] + '-' + row[2] + '-' + row[5] + '-' + office_id

        # The only way to know if there are multiple seats is look at the office
        # name which has "(Elect X)" in it.
        re_seats = re.compile(r'.*\(elect ([0-9]+)\).*', re.IGNORECASE)
        matched_seats = re_seats.match(row[4])

        # Primary is not designated in any way, but we can make some initial
        # guesses. All contests in an election are considered primary, but
        # non-partisan ones only mean there is more than one seat available.
        primary = election_meta['primary'] if 'primary' in election_meta else False

        re_question = re.compile(r'.*question.*', re.IGNORECASE)
        matched_question = re_question.match(row[4])
        primary = False if matched_question is not None else primary

        parsed = {
            'contest_id': contest_id,
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
            'primary': primary,
            'scope': source['contest_scope'] if 'contest_scope' in source else None
        }

        # Return contest record
        return parsed

    def supplement_row(self, spreadsheet_row):
        supplemented_row = {}

        # Check for existing result rows
        row_id = str(spreadsheet_row['id'])
        results = Contest.query.filter_by(contest_id=row_id).all()

        # If valid data
        if row_id is not None:
            # there are rows in the database to update or delete
            if results != None and results != []:
                update_results = []
                # for each matching row in the database to that spreadsheet row
                for matching_result in results:
                    for field in spreadsheet_row:
                        if spreadsheet_row[field] is not None and spreadsheet_row[field] != '':
                            matching_result.field = spreadsheet_row[field]
                    if matching_result not in update_results:
                        update_results.append(matching_result)
                row_result = {
                    'action': 'update',
                    'rows': update_results
                }
                supplemented_row = row_result
            else:
                # make rows to insert
                insert_rows = []
                # Add new row, make sure to mark the row as supplemental
                new_contest = {}
                for field in spreadsheet_row:
                    if field == 'id':
                        new_contest['contest_id'] = spreadsheet_row[field]
                    elif spreadsheet_row[field] is not None and spreadsheet_row[field] != '':
                        new_contest[field] = spreadsheet_row[field]
                new_contest['results_group'] = 'supplemental_results'
                contest_model = Contest(**new_contest)
                if contest_model not in insert_rows:
                    insert_rows.append(contest_model)
                row_result = {
                    'action': 'insert',
                    'rows': insert_rows
                }
                supplemented_row = row_result
        return supplemented_row

class Meta(ScraperModel, db.Model):

    __tablename__ = "meta"

    key = db.Column(db.String(255), primary_key=True, autoincrement=False, nullable=False)
    value = db.Column(db.Text)
    type = db.Column(db.String(255))
    updated = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    def __init__(self, **kwargs):
        super(Meta, self).__init__(**kwargs)
    
    def __repr__(self):
        return '<Meta {}>'.format(self.key)

    def parser(self, key, row):
        """
        Parser for meta scraping.
        """

        parsed = {
            'key': key,
            'value': row,
            'type': type(row).__name__
        }
        return parsed


class Question(ScraperModel, db.Model):

    __tablename__ = "questions"

    question_id = db.Column(db.String(255), primary_key=True, autoincrement=False, nullable=False)
    contest_id = db.Column(db.String(255))
    title = db.Column(db.String(255))
    sub_title = db.Column(db.String(255))
    question_body = db.Column(db.Text)
    updated = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    def __init__(self, **kwargs):
        super(Question, self).__init__(**kwargs)
    
    def __repr__(self):
        return '<Question {}>'.format(self.question_id)

    def parser(self, row, group):

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

        # SSD1 is Minneapolis and ISD1 is Aitkin, though they have the same
        # numbers and therefor make the same ID
        mpls_ssd = re.compile(r'.*\(SSD #1\).*', re.IGNORECASE).match(row[4])
        if mpls_ssd is not None:
            row[3] = '1-1'

        contest_id = 'id-MN-' + row[0] + '-' + row[3] + '-' + row[2] + '-' + row[1]
        if row[2] is not None and row[2] != '':
            contest_id = 'id-MN---' + row[2] + '-' + row[1]
        if row[3] is not None and row[3] != '':
            contest_id = 'id-MN---' + row[3] + '-' + row[1]

        #Clean random formatting problems in question text
        question_body = row[6].replace("^", "").strip()
        question_body = question_body.replace("&ldquo",'"')
        question_body = question_body.replace("&ldquo",'"')

        # Make row
        parsed = {
            'question_id': combined_id,
            'contest_id': contest_id,
            'title': row[4],
            'sub_title': row[5].title(),
            'question_body': question_body
        }

        return parsed


class Result(ScraperModel, db.Model):

    __tablename__ = "results"

    result_id = db.Column(db.String(255), primary_key=True, autoincrement=False, nullable=False)
    contest_id = db.Column(db.String(255))
    results_group = db.Column(db.String(255))
    office_name = db.Column(db.String(255))
    candidate_id = db.Column(db.String(255))
    candidate = db.Column(db.String(255))
    suffix = db.Column(db.String(255))
    incumbent_code = db.Column(db.String(255))
    party_id = db.Column(db.String(255))
    votes_candidate = db.Column(db.BigInteger())
    percentage = db.Column(db.Float())
    ranked_choice_place = db.Column(db.BigInteger())
    updated = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    def __init__(self, **kwargs):
        self.result_id = kwargs.get('result_id')
        self.contest_id = kwargs.get('contest_id')
        self.results_group = kwargs.get('results_group')
        self.office_name = kwargs.get('office_name')
        self.candidate_id = kwargs.get('candidate_id')
        self.candidate = kwargs.get('candidate')
        self.suffix = kwargs.get('suffix')
        self.incumbent_code = kwargs.get('incumbent_code')
        self.party_id = kwargs.get('party_id')
        self.votes_candidate = kwargs.get('votes_candidate')
        self.percentage = kwargs.get('percentage')
        self.ranked_choice_place = kwargs.get('ranked_choice_place')
    
    def __repr__(self):
        return '<Result {}>'.format(self.result_id)

    def parser(self, row, group):
        """
        Parser for results type scraping.
        """
        ranked_choice_translations = { 'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5, 'sixth': 6, 'seventh': 7, 'eighth': 8, 'nineth': 9, 'tenth': 10, 'final': 100 }
        ranked_choice_place = None

        # SSD1 is Minneapolis and ISD1 is Aitkin, though they have the same
        # numbers and therefor make the same ID
        mpls_ssd = re.compile(r'.*\(SSD #1\).*', re.IGNORECASE).match(row[4])
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
        ranked_choice = re.compile(r'.*(first|second|third|\w*th) choice.*', re.IGNORECASE).match(row[4])
        if ranked_choice is not None:
            office_id = ''.join(row[3].split())[:-1] + '1'
            contest_id = 'id-' + row[0] + '-' + row[1] + '-' + row[2] + '-' + row[5] + '-' + office_id

            # Determine which "choice" this is
            for c in ranked_choice_translations:
                ranked_choice_choice = re.compile(r'.*%s.*' % c, re.IGNORECASE).match(row[4])
                if ranked_choice_choice is not None:
                    ranked_choice_place = ranked_choice_translations[c]

        parsed = {
            'result_id': row_id,
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
            'contest_id': contest_id
        }

        # Return results record for the database
        return parsed

    def supplement_row(self, spreadsheet_row):
        supplemented_row = {}
        # Parse some values we know we will look at
        percentage = float(spreadsheet_row['percentage']) if spreadsheet_row['percentage'] is not None else None
        votes_candidate = int(spreadsheet_row['votes_candidate']) if spreadsheet_row['votes_candidate'] is not None else None
        ranked_choice_place = int(spreadsheet_row['ranked_choice_place']) if spreadsheet_row['ranked_choice_place'] is not None else None
        enabled = bool(spreadsheet_row['enabled']) if spreadsheet_row['enabled'] is not None else False
        row_id = str(spreadsheet_row['id'])

        # Check for existing result rows
        results = Result.query.filter_by(result_id=row_id).all()

        # If valid data
        if row_id is not None and spreadsheet_row['contest_id'] is not None and spreadsheet_row['candidate_id'] is not None:
            # there are rows in the database to update or delete
            if results != None and results != []:
                # these rows can be updated
                if (votes_candidate >= 0) and enabled is True:
                    update_results = []
                    # for each matching row in the database to that spreadsheet row
                    for matching_result in results:
                        matching_result.percentage = percentage
                        matching_result.votes_candidate = votes_candidate
                        matching_result.ranked_choice_place = ranked_choice_place
                        if matching_result not in update_results:
                            update_results.append(matching_result)
                    row_result = {
                        'action': 'update',
                        'rows': update_results
                    }
                    supplemented_row = row_result
                elif enabled is False and results[0].results_group:
                    # these rows can be deleted
                    delete_result = {
                        'action': 'delete',
                        'rows': results
                    }
                    supplemented_row = delete_result
            elif (votes_candidate >= 0) and enabled is True:
                # make rows to insert
                insert_rows = []
                # Add new row, make sure to mark the row as supplemental
                insert_result = {
                    'result_id': row_id,
                    'percentage': percentage,
                    'votes_candidate': votes_candidate,
                    'ranked_choice_place': ranked_choice_place,
                    'candidate': spreadsheet_row['candidate'],
                    'office_name': spreadsheet_row['office_name'],
                    'contest_id': spreadsheet_row['contest_id'],
                    'candidate_id': spreadsheet_row['candidate_id'],
                    'results_group': 'supplemental_results'
                }
                result_model = Result(**insert_result)
                if result_model not in insert_rows:
                    insert_rows.append(result_model)
                row_result = {
                    'action': 'insert',
                    'rows': insert_rows
                }
                supplemented_row = row_result
        
        return supplemented_row
