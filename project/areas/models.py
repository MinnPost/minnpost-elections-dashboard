from project import db
from project.scrapermodel import ScraperModel
import logging
import datetime
import calendar

LOG = logging.getLogger(__name__)

class Area(ScraperModel):

    __tablename__ = "areas"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    area_id = db.Column(db.String(255), unique=True, nullable=False)
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
            parsed['mcd_id'] = "{0:05d}".format(int(row[2])) #enforce 5 digit
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
