# MN Election Results

Scraper for the Minnesota elections.  This tries to emulate the ScraperWiki
environment as much as possible so that it can be run on ScraperWiki
when elections are not in full force.

## Data

* Minnesota Secretary of State.  The SoS does a pretty good job of providing
data across the state for general elections.
   * http://electionresults.sos.state.mn.us/enr/ENR/Home/1
   * http://electionresults.sos.state.mn.us/ENR/Select/Download/1
* Minneapolis (due to Ranked-Choice voting)

## Scraping

Something to the following commands.

* Scrape areas: `python code/scraper.py scrape areas 20131105`
* Scrape just the results: `python code/scraper.py scrape results 20131105`
* Aggregate the results for higher level querying: `python code/scraper.py aggregate_results`
* Supplement aggregate contests table: `python code/scraper.py supplement contests 20131105`

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