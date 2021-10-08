import logging
import os
import json
import re
import csv
import urllib.request

import calendar
import datetime
from flask import current_app
from app import db

from sqlalchemy.ext.compiler import compiles
from sqlalchemy.sql.expression import Insert

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


    @compiles(Insert)
    def compile_upsert(insert_stmt, compiler, **kwargs):
        """
        converts every SQL insert to an upsert  i.e;
        INSERT INTO test (foo, bar) VALUES (1, 'a')
        becomes:
        INSERT INTO test (foo, bar) VALUES (1, 'a') ON CONFLICT(foo) DO UPDATE SET (bar = EXCLUDED.bar)
        (assuming foo is a primary key)
        :param insert_stmt: Original insert statement
        :param compiler: SQL Compiler
        :param kwargs: optional arguments
        :return: upsert statement
        """
        pk = insert_stmt.table.primary_key
        insert = compiler.visit_insert(insert_stmt, **kwargs)
        ondup = f'ON CONFLICT ({",".join(c.name for c in pk)}) DO UPDATE SET'
        updates = ', '.join(f"{c.name}=EXCLUDED.{c.name}" for c in insert_stmt.table.columns)
        upsert = ' '.join((insert, ondup, updates))
        return upsert


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
    ranked_choice = db.Column(db.Boolean)
    primary = db.Column(db.Boolean)
    scope = db.Column(db.String(255))
    title = db.Column(db.String(255))
    boundary = db.Column(db.String(255))
    partisan = db.Column(db.Boolean)
    question_body = db.Column(db.Text)
    sub_title = db.Column(db.String(255))
    incumbent_party = db.Column(db.String(255))
    called = db.Column(db.Boolean)
    updated = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    def __repr__(self):
        return '<Contest {}>'.format(self.contest_id)

class Meta(ScraperModel, db.Model):

    __tablename__ = "meta"

    key = db.Column(db.String(255), primary_key=True, autoincrement=False, nullable=False)
    value = db.Column(db.Text)
    type = db.Column(db.String(255))
    updated = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    def __repr__(self):
        return '<Meta {}>'.format(self.key)


class Question(ScraperModel, db.Model):

    __tablename__ = "questions"

    question_id = db.Column(db.String(255), primary_key=True, autoincrement=False, nullable=False)
    contest_id = db.Column(db.String(255))
    title = db.Column(db.String(255))
    sub_title = db.Column(db.String(255))
    question_body = db.Column(db.Text)
    updated = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    def __repr__(self):
        return '<Question {}>'.format(self.question_id)


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

    def __repr__(self):
        return '<Result {}>'.format(self.result_id)
