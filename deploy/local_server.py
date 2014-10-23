"""
A really basic, insecure API server for the sqlite database.
"""

import json
import sqlite3
import dumptruck
import os
from flask import g, Flask, request, Response

# ~Constants
DATABASE = os.path.join(os.path.dirname(__file__), '../scraperwiki.sqlite')

# App and settings
app = Flask(__name__)
app.debug = True

def get_db():
  """
  Gets Database if it has not already been connected.
  """
  dt = getattr(g, '_database', None)
  if dt is None and os.path.isfile(DATABASE):
    dt = g._database = dumptruck.DumpTruck(DATABASE, adapt_and_convert = False)
    return dt

@app.route('/')
def index():
  dt = get_db()
  sql = request.args.get('q')
  cb = request.args.get('callback')
  example_query = 'SELECT * FROM contests WHERE title LIKE \'%governor%\'';

  if sql in ['', None]:
    return 'Hi, welcome to the election scraper local server.  Use a URL like: <a href="/?q=%s">/?q=%s</a>' % (example_query, example_query);

  data = dt.execute(sql)
  output = json.dumps(data)
  mime = 'application/json'
  ctype = 'application/json; charset=UTF-8'

  if cb is not None:
    output = '%s(%s);' % (cb, output)
    mime = 'text/javascript'
    ctype = 'text/javascript; charset=UTF-8'

  res = Response(response = output, status = 200, mimetype = mime)
  res.headers['Content-Type'] = ctype
  res.headers['Connection'] = 'keep-alive'
  return res

@app.teardown_appcontext
def close_connection(exception):
  """
  Close db connection.
  """
  dt = getattr(g, '_database', None)
  if dt is not None:
    dt.close()

# Run Flask app
if __name__ == '__main__':
    app.run()
