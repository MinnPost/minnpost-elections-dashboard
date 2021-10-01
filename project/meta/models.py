from project import db

class Meta(db.Model):

    __tablename__ = "meta"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    key = db.Column(db.String(255), unique=True, nullable=False)
    value = db.Column(db.Text)
    type = db.Column(db.String(255))
    updated = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    def __repr__(self):
        return '<Meta {}>'.format(self.key)
