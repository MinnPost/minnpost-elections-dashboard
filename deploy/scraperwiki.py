"""
This file simply prepares code to run on the ScraperWiki platform.
"""

import os

# Output
output_file = os.path.join(os.path.dirname(__file__), '../code/scraper-scraperwiki.py')
output_file = open(output_file, 'w')

# Read original scraper file
scraper_file = os.path.join(os.path.dirname(__file__), '../code/scraper.py')
scraper_data = open(scraper_file).read()

# Read the sources file
sources_file = os.path.join(os.path.dirname(__file__), '../scraper_sources.json')
sources_data = open(sources_file).read()
sources_data = 'scraper_sources_inline = """\n' + sources_data + '\n"""'

# Next make the command we need to add
commands = """
  # Scraperwiki commands
  scraper.scrape('areas', None)
  scraper.scrape('results', None)
  scraper.match_contests()
"""

# Gather the placeholder
sources_placeholder = "scraper_sources_inline = None"
commands_placeholder = "# <Scraperwiki commands go here>"

# Replace parts
replaced = scraper_data.replace(sources_placeholder, sources_data)
replaced = replaced.replace(commands_placeholder, commands)

# Output
output_file.write(replaced)
print 'Processed'