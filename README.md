# MN Election Results

Scraper for the Minnesota elections.  This tries to emulate the ScraperWiki environment as much as possible so that it can be run on ScraperWiki when elections are not in full force.

## Data

* Minnesota Secretary of State.  The SoS does a pretty good job of providing
data across the state for general elections.
  * [Web election results](http://electionresults.sos.state.mn.us/).  Finding an upcoming election can be difficult and may require manual manipulation of URLs.
  * http://electionresults.sos.state.mn.us/ENR/Select/Download/1
  * [FTP download results](ftp://media:results@ftp.sos.state.mn.us/).
  * The format of results are text, csv-like files.  Unfortunately there is no header row and no metadata to know what fields are which.  See scraper to see what is assumed.
* Minneapolis (due to Ranked-Choice voting)

## Adding an election

Metadata about each election is managed in `scraper_sources.json`.  Though there are often similarly named files for each election, there are usually files for each group of races and some can be named inconsistently.

Add a new object keyed by the date of the election, like `YYYYMMDD`.  This should contain objects for results and other supplemental tables.  There should be one entry per file needed to process.

```
"20140812": {
  "meta": {
    "files_url": "ftp://media:results@ftp.sos.state.mn.us/20140812/",
    "primary": true
  },
  "us_house_results": {
    "url": "ftp://media:results@ftp.sos.state.mn.us/20140812/ushouse.txt",
    "table": "results",
    "type": "results",
    "results_scope": "us_house"
  },
```

In theory this should be it, assuming the scraper can reconcile everything.  There is a good chance, though, that formatting changes could break the scraper, or that the scraper does not know how to fully process some results.

## Scraping

`<ELECTION_DATE>` is optional and the newest eleciton will be used if not provided.  It should be the key of the object in the `scraper_sources.json` file; for instance `20140812`.

1. Scrape areas: `python code/scraper.py scrape areas <ELECTION_DATE>`
  * This is something that only really needs to be done once, at least close to the election, as there little change it will change the day of the election.
1. Scrape the results: `python code/scraper.py scrape results <ELECTION_DATE>`
  * This is the core processing of the scraper will be run frequently.
1. Match contests to boundary area: `python code/scraper.py match_contests <ELECTION_DATE>`
1. (optional) For results that are in a Google Spreadsheet, use the supplement step: `python code/scraper.py supplement contests <ELECTION_DATE>`

## Local setup and development

1. Install `git`
1. Get the code: `git clone https://github.com/MinnPost/minnpost-scraper-mn-election-results.git`
1. Change the directory: `cd minnpost-scraper-mn-election-results`
1. (optional) Make a `virtualenv`
1. `pip install -r requirements_local.txt`
    * This is used locally to get around some bugs in the scraperwiki libraries.
1. Run a scraper process (see above).
1. Run basic API server; this should not be run on production, it is meant for local developmet: `python deploy/local_server.py`

## Production setup and deployment

As this is meant to remulate how ScraperWiki works, it uses Python, FastCGI
and Nginx to create an API for the scraped data in the sqlite database.

These instructions have been performed on an EC2 Ubuntu instance.

### Code, Libraries and prerequisites

1. `sudo apt-get install git-core git python-pip python-dev build-essential python-lxml sqlite3 nginx fcgiwrap && sudo pip install --upgrade pip && sudo pip install --upgrade virtualenv`
1. `cd ~`
1. Get the code: `git clone https://github.com/MinnPost/minnpost-scraper-mn-election-results.git`
1. Change the directory: `cd minnpost-scraper-mn-election-results`
1. `pip install -r requirements.txt`

### Setup webserver/API

#### Dumptruck

Dumptruck-web is a Python script that runs through FastCGI to handle API
requests.

    sudo git clone https://github.com/zzolo/dumptruck-web.git /var/www/dumptruck-web
    sudo chown -R www-data:www-data /var/www/dumptruck-web

#### FCGIWrap

On Ubuntu, configure fcgiwrap to use more children, check if this file exists, if so
just copy it.

    ls /etc/default/fcgiwrap
    sudo cp deploy/fcgiwrap /etc/default/fcgiwrap

#### Nginx

    sudo cp deploy/nginx-scraper-api.conf /etc/nginx/sites-available/nginx-scraper-api.conf
    sudo ln -s /etc/nginx/sites-available/nginx-scraper-api.conf /etc/nginx/sites-enabled/nginx-scraper-api.conf
    sudo rm /etc/nginx/sites-enabled/default

#### Deploy

Restart services.

    sudo service fcgiwrap restart
    sudo service nginx restart

Create the ```scraperwiki.json file```.  (If for some reason, you need a publish token, then update scraperwiki.json
as needed.)

    echo "{ \"database\": \"scraperwiki.sqlite\" }" > scraperwiki.json
    ln -s /home/ubuntu/minnpost-scraper-mn-election-results/scraperwiki.json ~/scraperwiki.json
    ln -s /home/ubuntu/minnpost-scraper-mn-election-results/scraperwiki.sqlite ~/scraperwiki.sqlite

Test with a call like:

    http://ec2-XX-XX-XX.compute-1.amazonaws.com/?box=ubuntu&q=SELECT%20*%20FROM%20results%20LIMIT%2010

#### Cron

    crontab deploy/crontab

## ScraperWiki

The code and deployment methods have been designed so that on slower traffic times, these operations can happen on ScraperWiki and save resources.  You will have to SSH into the scraper and add the needed libraries, `pip install --user logging lxml datetime flask gdata`.

Currently, the scraper is at [https://scraperwiki.com/dataset/ez47yoa/](https://scraperwiki.com/dataset/ez47yoa/).

To update the scraper code, do the following:

1. Run: `python deploy/scraperwiki.py`
2. Copy the contents of `code/scraper-scraperwiki.py` into the ScraperWiki interface.
