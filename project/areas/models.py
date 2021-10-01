from project import db

class Area(db.Model):

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
