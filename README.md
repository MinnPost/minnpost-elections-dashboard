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

### Manual data

Both manual results and contest question text can be managed in Google Spreadsheets.

## Scraping

`<ELECTION_DATE>` is optional and the newest election will be used if not provided.  It should be the key of the object in the `scraper_sources.json` file; for instance `20140812`.

1. (optional) Remove old data as the scraper is not built to manage more than one election: `rm scraperwiki.sqlite`
1. Scrape areas: `python code/scraper.py scrape areas <ELECTION_DATE>`
  * This is something that only really needs to be done once, at least close to the election, as there little change it will change the day of the election.
1. Scrape the results: `python code/scraper.py scrape results <ELECTION_DATE>`
  * This is the core processing of the scraper will be run frequently.
1. Match contests to boundary area: `python code/scraper.py match_contests <ELECTION_DATE>`
1. (optional) For results that are in a Google Spreadsheet, use the supplement step: `python code/scraper.py supplement contests <ELECTION_DATE>`
1. (optional) To check each boundary ID against the boundary service: `python code/scraper.py check_boundaries`

## Local setup and development

1. Install `git`
1. Get the code: `git clone https://github.com/MinnPost/minnpost-scraper-mn-election-results.git`
1. Change the directory: `cd minnpost-scraper-mn-election-results`
1. (optional) Make a `virtualenv`
1. `pip install -r requirements.txt`
1. Run a scraper process (see above).
1. Run basic API server; this should not be run on production; it is meant for local development: `python deploy/local_server.py`
  * This create a basic endpoint server at http://localhost:5000/.

## Production setup and deployment

As this is meant to emulate how ScraperWiki works, it uses Python, FastCGI and Nginx to create an API for the scraped data in the sqlite database.

These instructions have been performed on an EC2 Ubuntu instance.

**Note that for MinnPost's specific purpose, there is an AMI for this that has many of these steps already completed.  This should be used instead of starting from scratch.**

### Code, Libraries and prerequisites

Note that we use root freely

1. Make sure Ubuntu is up to date: `sudo aptitude update && sudo aptitude safe-upgrade`
1. Install system and python base packages: `sudo aptitude install git-core git python-pip python-dev build-essential python-lxml sqlite3 nginx-full fcgiwrap`
1. Install python base packages: `sudo pip install --upgrade pip && sudo pip install --upgrade virtualenv`
1. Go to the home directory: `cd ~`
1. Get the code: `git clone https://github.com/MinnPost/minnpost-scraper-mn-election-results.git && cd minnpost-scraper-mn-election-results`
1. `sudo pip install -r requirements.txt`

### Webserver

1. [Dumptruck](https://github.com/scraperwiki/dumptruck-web) is a Python script to create an API on-top of an sqlite database.  It's built by ScraperWiki and also handles multiple user location.
    1. `sudo git clone https://github.com/scraperwiki/dumptruck-web.git /var/www/dumptruck-web && sudo chown -R www-data:www-data /var/www/dumptruck-web`
    1. Link our database and metadata file for compliance with Dumptruck.
        * `ln -s /home/ubuntu/minnpost-scraper-mn-election-results/scraperwiki.json ~/scraperwiki.json && ln -s /home/ubuntu/minnpost-scraper-mn-election-results/scraperwiki.sqlite ~/scraperwiki.sqlite`
1. FCGIWrap is used to create an interface between the Dumptruck and Nginx.  We use a simple script to up the number of children to use.
    1. `sudo cp deploy/fcgiwrap /etc/default/fcgiwrap`
    1. Restart service (note that this can take a minute): `sudo service fcgiwrap restart`
    1. The default is to run via socket, so there's no direct HTTP connection to this service.
1. Nginx is used at the top level web server.  It allows for caching and other niceties.  This copies our config, enables it and removes the default.
    1. `sudo cp deploy/nginx-scraper-api.conf /etc/nginx/sites-available/nginx-scraper-api.conf`
    1. `sudo ln -s /etc/nginx/sites-available/nginx-scraper-api.conf /etc/nginx/sites-enabled/nginx-scraper-api.conf`
    1. `sudo rm /etc/nginx/sites-enabled/default`
    1. Restart service: `sudo service nginx restart`
    1. Test with something like: http://ec2-XX-XX-XX.compute-1.amazonaws.com/?box=ubuntu&method=sql&q=SELECT%20*%20FROM%20results%20LIMIT%2010

#### Cron

We use cron to get the results every few minutes.  This will copy our cron to the crontab.

    crontab deploy/crontab

## Load testing

There are many ways to do load testing, but here are some free-er options.

### [Bees with Machine Guns](https://github.com/newsapps/beeswithmachineguns)

1. Install: `pip install beeswithmachineguns`
1. Set environment variables.
    * `export AWS_ACCESS_KEY_ID=xxxx`
    * `export AWS_SECRET_ACCESS_KEY=xxxx`
1. Copy your private AWS keypair file to something like: `~/.ssh/minnpost.pem`
1. Set up an EC2 security group, specifically one that has SSH (port 22) access.  We name ours `SecuriBees`.
1. Spin up bees (overall more bees will allow for more attacking): `bees up -s 4 -g SecuriBees -k minnpost`
1. Send the bees to attack: `bees attack -n 10000 -c 1000 -u "http://50.19.100.197/?box=ubuntu&method=sql&q=SELECT%20*%20FROM%20results%20LIMIT%2010"`
    * `n` is the number of requests, while `c` is the number of concurrent requests.  Play around with this to determine limits.  For some reference, on election night we could get up to 4,000 active users on the dashboard, each making around 10 calls to the API every minute.
    * The initial time should be slower than subsequent requests because of the aggressive minute long caching.
    * You may want to run `top` on the API server to see how the server is running against the load.

### [Locust.io](http://locust.io/)

1. Install: `pip install locustio`
1. `locustfile.py` is included.
1. Run, but change host depending on where the API server is located at: `locust --host=http://50.19.100.197`
1. Open up web interface to run tests: [http://localhost:8089/](http://localhost:8089/)
1. Some more work should be done to use the distributed power of Locust, as a single machine is not a great load testing environment.

### Other tools

* [loadimpact.com](http://loadimpact.com/) allows for a free, public test.

## ScraperWiki

The code and deployment methods have been designed so that on slower traffic times, these operations can happen on ScraperWiki and save resources.  You will have to SSH into the scraper and add the needed libraries, `pip install --user logging lxml datetime flask gdata`.

Currently, the scraper is at [https://scraperwiki.com/dataset/ez47yoa/](https://scraperwiki.com/dataset/ez47yoa/).

To update the scraper code, do the following:

1. Run: `python deploy/scraperwiki.py`
2. Copy the contents of `code/scraper-scraperwiki.py` into the ScraperWiki interface.
