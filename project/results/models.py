from project import db

class Result(db.Model):

    __tablename__ = "results"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    result_id = db.Column(db.String(255), unique=True, nullable=False)
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
