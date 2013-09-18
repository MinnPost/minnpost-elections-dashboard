"""
Empties database.  Use with caution.
"""
import scraperwiki
import sqlite3
import dumptruck

dt = dumptruck.DumpTruck(dbname='scraperwiki.sqlite')

print 'Dropping all tables ...'
tables = dt.tables()
for t in tables:
  if not t.startswith('sqlite_stat'):
    print 'Dropping %s ...' % t
    dt.drop(t)