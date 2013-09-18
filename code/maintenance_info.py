"""
Get info on data and scraper.
"""
import scraperwiki

print ''
print 'Getting info ...'
print '============================'
print ''

tables = scraperwiki.sqlite.show_tables()
for t in tables:
  print tables[t]
  counts = scraperwiki.sqlite.select('COUNT(*) as count FROM %s' % t)
  print 'Row count for %s: %s' % (t, counts[0]['count'])
  print '============================'
  print ''