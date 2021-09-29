# MN Election Results

Scraper for the Minnesota elections.

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

In theory this should be it, assuming the scraper can reconcile everything. There is a good chance, though, that formatting changes could break the scraper, or that the scraper does not know how to fully process some results.

### Manual data

Both manual results and contest question text can be managed in Google Spreadsheets.

## Scraping

`<ELECTION_DATE>` is optional and the newest election will be used if not provided. It should be the key of the object in the `scraper_sources.json` file; for instance `20140812`.

1. (optional) Remove old data as the scraper is not built to manage more than one election: `find command to dump database`
1. Scrape areas: `python code/scraper.py scrape areas <ELECTION_DATE>`
  * This is something that only really needs to be done once, at least close to the election, as there little change it will change the day of the election.
1. Scrape questions: `python code/scraper.py scrape questions <ELECTION_DATE>`
1. Scrape the results: `python code/scraper.py scrape results <ELECTION_DATE>`
  * This is the core processing of the scraper will be run frequently.
1. Match contests to boundary area: `python code/scraper.py match_contests <ELECTION_DATE>`
1. (optional) For results that are in a Google Spreadsheet, use the supplement step: `python code/scraper.py supplement contests <ELECTION_DATE>`
1. (optional) To check each boundary ID against the boundary service: `python code/scraper.py check_boundaries`

## Google Sheets data

For both local and remote environments, you'll need to make sure the application has access to the Google Sheets data. In version 4 of the Sheets API, this happens through Service Accounts.

### Creating a new authentication

If you are authenticating with the Sheets API for the first time, you'll need to create a new Google Cloud project. Start by following [this guide from Google](https://developers.google.com/workspace/guides/create-project). When you've finished Google's steps, you should have a new project.

Our specific Google Sheets integration uses the [Sheetfu library](https://github.com/socialpoint-labs/sheetfu), which has [an authentication guide](https://github.com/socialpoint-labs/sheetfu/blob/master/documentation/authentication.rst) to finish this process. The screenshots are not necessarily up to date with the names Google uses for things.

Between these resources, you should follow these steps to create and access the authentication credentials:

1. Create a new Google Cloud Platform project.
1. Enable the Sheets and Drive APIs in the APIs & Services section of the Google Cloud Platform settings.
1. Create a Service Account in the IAM & Admin section of the Google Cloud Platform settings.
1. Download the new JSON-formatted key for that Service Account. Only use this key for one environment.

### Accessing an existing authentication

If the Service Account user already exists in the Google Cloud Platform, you can access it at https://console.cloud.google.com/home/dashboard?project=[application-name]. In MinnPost's case, this URL is [https://console.cloud.google.com/home/dashboard?project=minnpost-mn-election-results](https://console.cloud.google.com/home/dashboard?project=minnpost-mn-election-results).

If it hasn't been, you'll need your Google account added. An Administrator can do that at the correct dashboard URL by clicking "Add People to this Project."

Follow these steps to access the authentication credentials:

1. Once you have access to the project's dashboard, click "Go to project settings" in the Project info box.
1. Click Service Accounts in the IAM & Admin section of the Google Cloud Platform settings.
1. If there is more than one service account, find the correct one.
1. Click the Actions menu for that account and choose the Manage keys option.
1. Click Add Key, choose Create new key, and choose JSON as the Key type. Click the Create button and download the key for that Service Account. Only use this key for one environment.

## Local setup and development

1. Install `git`
1. Get the code: `git clone https://github.com/MinnPost/minnpost-scraper-mn-election-results.git`
1. Change the directory: `cd minnpost-scraper-mn-election-results`
1. `pipenv install`
1. Run a scraper process (see above).
1. Run basic API server; this should not be run on production; it is meant for local development: `python deploy/local_server.py`
  * This creates a basic endpoint server at http://localhost:5000/.
1. Create a `.env` file based on the repository's `.env-example` file in the root of your project.

### Local setup for Postgres

This documentation describes how to install Postgres with Homebrew.

1. Run `brew install postgresql` to install Postgres.
1. Run `psql postgres` to start the server and log in to it.
1. A free, Mac-based graphic manager for Postgres is [Postbird](https://www.electronjs.org/apps/postbird).
1. Create a database. For this example, call it `election-scraper`.
1. Installing with Homebrew creates a user with no password. The connection string will be `"postgresql://username:@localhost/election-scraper"`. Enter this connection string to the `DATABASE_URL` value of the `.env` file.
1. Download the database from Heroku. With Postbird, you can import it using the File -> Import .sql file command.

### Local authentication for Google Sheets

Enter the configuration values from the JSON key downloaded above into the `.env` file's values for these fields:

- `SHEETFU_CONFIG_TYPE`
- `SHEETFU_CONFIG_PROJECT_ID`
- `SHEETFU_CONFIG_PRIVATE_KEY_ID`
- `SHEETFU_CONFIG_PRIVATE_KEY`
- `SHEETFU_CONFIG_CLIENT_EMAIL`
- `SHEETFU_CONFIG_CLIENT_ID`
- `SHEETFU_CONFIG_AUTH_URI`
- `SHEETFU_CONFIG_TOKEN_URI`
- `SHEETFU_CONFIG_AUTH_PROVIDER_URL`
- `SHEETFU_CONFIG_CLIENT_CERT_URL`

## Production setup and deployment

### Code, Libraries and prerequisites

This application should be deployed to Heroku. If you are creating a new Heroku application, clone this repository with `git clone https://github.com/MinnPost/minnpost-scraper-mn-election-results.git` and follow [Heroku's instructions](https://devcenter.heroku.com/articles/git#creating-a-heroku-remote) to create a Heroku remote.

### Production setup for Postgres

Add the Heroku Postgres add-on to the Heroku application. Heroku allows two applications to share the same database. They provide [instructions](https://devcenter.heroku.com/articles/managing-add-ons#using-the-command-line-interface-attaching-an-add-on-to-another-app) for this.

### Production authentication for Google Sheets

In the project's Heroku settings, enter the configuration values from the production-only JSON key downloaded above into the values for these fields:

- `SHEETFU_CONFIG_TYPE`
- `SHEETFU_CONFIG_PROJECT_ID`
- `SHEETFU_CONFIG_PRIVATE_KEY_ID`
- `SHEETFU_CONFIG_PRIVATE_KEY`
- `SHEETFU_CONFIG_CLIENT_EMAIL`
- `SHEETFU_CONFIG_CLIENT_ID`
- `SHEETFU_CONFIG_AUTH_URI`
- `SHEETFU_CONFIG_TOKEN_URI`
- `SHEETFU_CONFIG_AUTH_PROVIDER_URL`
- `SHEETFU_CONFIG_CLIENT_CERT_URL`

### Scraping

Run the scraper commands from the section above by following [Heroku's instructions](https://devcenter.heroku.com/articles/getting-started-with-python#start-a-console) for running Python commands.

### Webserver

1. [Dumptruck](https://github.com/scraperwiki/dumptruck-web) is a Python script to create an API on-top of an sqlite database.  It's built by ScraperWiki and also handles multiple user location.
    1. `sudo git clone https://github.com/scraperwiki/dumptruck-web.git /var/www/dumptruck-web && sudo chown -R www-data:www-data /var/www/dumptruck-web && sudo pip install -r /var/www/dumptruck-web/requirements.txt`
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

We use cron to get the results as often as possible through `deploy/scraper_runner.sh`.  Areas and contest matching just happens in the early morning.

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
