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

* 

## Setup

### Local

1. (optional) Make a `virtualenv`
1. `pip install -r requirements_local.txt`
    * This is used locally to get around some bugs in the scraperwiki libraries.
1. (how to run API locally...)

### Independent Deployment

For election night, the scraper needs to run every 10 minutes or less,
and with ScraperWiki, it is not fast enough and there were some issues
with SQLite performance.

These instructions were performed on EC2's quick-launch
Ubuntu 12 install.

#### Libraries and prerequisites

    sudo apt-get install git-core git python-pip python-dev build-essential python-xml sqlite3 nginx fcgiwrap
    sudo pip install --upgrade pip
    sudo pip install --upgrade virtualenv

#### Install codebase

We are assuming this is the only thing running on server so not using Virtualenv, but
feel free to use it.  Assuming all relative paths are from repo directory.

    git clone git://github.com/MinnPost/minnpost-scraper-2012-general-elections.git
    cd minnpost-scraper-2012-general-elections
    sudo pip install -r requirements_local.txt

#### Setup webserver/API

    sudo git clone https://github.com/zzolo/dumptruck-web.git /var/www/dumptruck-web
    sudo chown -R www-data:www-data /var/www/dumptruck-web

Configure fcgiwrap to use more children, check if this file exists, if so
just copy it.

    ls /etc/default/fcgiwrap
    sudo cp deploy/fcgiwrap /etc/default/fcgiwrap

Configure nginx.

    sudo cp deploy/nginx-scraper-api /etc/nginx/sites-available/nginx-scraper-api
    sudo ln -s /etc/nginx/sites-available/nginx-scraper-api /etc/nginx/sites-enabled/nginx-scraper-api
    sudo rm /etc/nginx/sites-enabled/default

Restart services.

    sudo service fcgiwrap restart
    sudo service nginx restart

API Setup.  If for some reason, you need a publish token, then update scraperwiki.json
as needed.

    echo "{ \"database\": \"scraperwiki.sqlite\" }" > scraperwiki.json
    ln -s /home/ubuntu/minnpost-scraper-2012-general-elections/scraperwiki.json scraperwiki.json
    ln -s /home/ubuntu/minnpost-scraper-2012-general-elections/scraperwiki.sqlite scraperwiki.sqlite

#### Cron

    crontab deploy/crontab