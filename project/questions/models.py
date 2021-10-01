from project import db

class Question(db.Model):

    __tablename__ = "questions"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    question_id = db.Column(db.String(255), unique=True, nullable=False)
    contest_id = db.Column(db.String(255))
    title = db.Column(db.String(255))
    sub_title = db.Column(db.String(255))
    question_body = db.Column(db.Text)
    updated = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    def __repr__(self):
        return '<Question {}>'.format(self.question_id)
