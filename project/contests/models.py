from project import db

class Contest(db.Model):

    __tablename__ = "contests"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    contest_id = db.Column(db.String(255), unique=True, nullable=False)
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
